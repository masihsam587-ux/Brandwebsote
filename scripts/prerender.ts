import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildSitemapXml, fetchCatalogSnapshot } from '../src/services/catalogSnapshot';
import { generateLlmsTxt, generateRobotsTxt, STORE_CONFIG } from '../src/services/siteConfig';
import { getAllRegisteredSlugRedirects } from '../src/services/slugRedirects';
import { injectSsrIntoTemplate } from '../src/services/ssrHtml';

type RenderRouteFn = typeof import('../src/entry-server').renderRoute;

function routeToOutputFile(distDir: string, routePath: string): string {
  const clean = routePath.split('?')[0].replace(/^\/+/, '').replace(/\/+$/, '');
  if (!clean) {
    return path.join(distDir, 'index.html');
  }
  return path.join(distDir, clean, 'index.html');
}

export async function runPrerender(options?: {
  rootDir?: string;
  origin?: string;
}): Promise<{
  renderedCount: number;
  productCount: number;
  categoryCount: number;
  source: 'supabase' | 'fallback';
}> {
  const rootDir = options?.rootDir || process.cwd();
  const distDir = path.resolve(rootDir, 'dist');
  const ssrEntryFile = path.resolve(rootDir, 'dist-ssr', 'entry-server.js');
  const templateFile = path.resolve(distDir, 'index.html');
  const templateBackupFile = path.resolve(distDir, '_template.html');

  if (!fs.existsSync(templateFile) && !fs.existsSync(templateBackupFile)) {
    throw new Error(`Missing client build template at ${templateFile}. Run vite build first.`);
  }
  if (!fs.existsSync(ssrEntryFile)) {
    throw new Error(`Missing SSR bundle at ${ssrEntryFile}. Run vite build --ssr first.`);
  }

  // Preserve the un-hydrated Vite HTML shell so re-running pre-render stays idempotent
  if (!fs.existsSync(templateBackupFile)) {
    fs.copyFileSync(templateFile, templateBackupFile);
  }
  const template = fs.readFileSync(templateBackupFile, 'utf8');

  const ssrMod = (await import(pathToFileURL(ssrEntryFile).href)) as {
    renderRoute: RenderRouteFn;
  };
  const snapshot = await fetchCatalogSnapshot();
  const origin = (
    options?.origin ||
    process.env.VITE_SITE_URL?.trim() ||
    STORE_CONFIG.siteUrl
  ).replace(/\/+$/, '');

  const basePublicPaths = [
    '/',
    '/shop',
    '/about',
    '/faq',
    '/size-guide',
    '/shipping',
    '/contact',
    '/terms',
    '/privacy',
  ];

  const categoryPaths = snapshot.categories
    .filter((c) => Boolean(c.slug))
    .map((c) => `/category/${c.slug}`);

  const productPaths = snapshot.products
    .filter((p) => Boolean(p.slug))
    .map((p) => `/product/${p.slug}`);

  const allPublicBasePaths = [...basePublicPaths, ...categoryPaths, ...productPaths];
  const urduPaths = allPublicBasePaths.map((p) => (p === '/' ? '/ur' : `/ur${p}`));
  const privateShellPaths = ['/orders', '/cart', '/checkout', '/profile', '/auth', '/admin'];

  const routesToPrerender = [...allPublicBasePaths, ...urduPaths, ...privateShellPaths];

  for (const routePath of routesToPrerender) {
    const rendered = ssrMod.renderRoute({
      url: routePath,
      snapshot,
      origin,
    });
    const outHtml = injectSsrIntoTemplate(template, {
      lang: rendered.lang,
      dir: rendered.dir,
      headTagsHtml: rendered.headTagsHtml,
      html: rendered.html,
      dehydratedState: rendered.dehydratedState,
    });
    const targetFile = routeToOutputFile(distDir, routePath);
    fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    fs.writeFileSync(targetFile, outHtml, 'utf8');
  }

  // Dedicated 404.html with noindex meta tag
  const rendered404 = ssrMod.renderRoute({
    url: '/404',
    snapshot,
    origin,
  });
  const html404 = injectSsrIntoTemplate(template, {
    lang: rendered404.lang,
    dir: rendered404.dir,
    headTagsHtml: rendered404.headTagsHtml,
    html: rendered404.html,
    dehydratedState: rendered404.dehydratedState,
  });
  fs.writeFileSync(path.join(distDir, '404.html'), html404, 'utf8');

  // Generate sitemap.xml, robots.txt, llms.txt, and redirects manifest into dist/
  fs.writeFileSync(
    path.join(distDir, 'sitemap.xml'),
    buildSitemapXml(snapshot, origin),
    'utf8'
  );
  fs.writeFileSync(
    path.join(distDir, 'robots.txt'),
    generateRobotsTxt({ origin }),
    'utf8'
  );
  fs.writeFileSync(
    path.join(distDir, 'llms.txt'),
    generateLlmsTxt({
      origin,
      categories: snapshot.categories,
      products: snapshot.products,
    }),
    'utf8'
  );
  fs.writeFileSync(
    path.join(distDir, 'redirects.json'),
    JSON.stringify(
      {
        ...getAllRegisteredSlugRedirects(),
        ...snapshot.slugRedirects,
      },
      null,
      2
    ),
    'utf8'
  );

  return {
    renderedCount: routesToPrerender.length + 1,
    productCount: snapshot.products.length,
    categoryCount: snapshot.categories.length,
    source: snapshot.source,
  };
}

const executedDirectly =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]).endsWith(`${path.sep}prerender.ts`);

if (executedDirectly) {
  runPrerender()
    .then((summary) => {
      console.log(
        `[SEO Prerender] Wrote ${summary.renderedCount} HTML files (${summary.productCount} products, ${summary.categoryCount} categories, source=${summary.source}).`
      );
    })
    .catch((err) => {
      console.error('[SEO Prerender] Failed:', err);
      process.exit(1);
    });
}
