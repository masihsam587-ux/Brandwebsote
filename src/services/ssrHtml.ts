import type { DehydratedState } from '@tanstack/react-query';
import type { Locale } from '../i18n';

export function injectSsrIntoTemplate(
  template: string,
  payload: {
    lang: Locale;
    dir: 'ltr' | 'rtl';
    headTagsHtml: string;
    html: string;
    dehydratedState: DehydratedState;
  }
): string {
  const serializedState = JSON.stringify(payload.dehydratedState).replace(/</g, '\\u003c');

  return template
    .replace(/<html\b[^>]*>/i, `<html lang="${payload.lang}" dir="${payload.dir}">`)
    .replace(
      /<!--app-head-start-->[\s\S]*?<!--app-head-end-->/,
      payload.headTagsHtml
    )
    .replace('<!--app-html-->', payload.html)
    .replace('<!--app-state-->', serializedState);
}
