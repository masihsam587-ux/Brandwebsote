import { test, expect, type Page } from '@playwright/test';

const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'CaE2eAdmin#2026!';

async function acceptSignupTerms(page: Page) {
  const checkbox = page.getByRole('checkbox');
  if (!(await checkbox.isChecked())) {
    await checkbox.check();
  }
}

async function dismissIntroIfVisible(page: Page) {
  const skipBtn = page.getByRole('button', { name: 'Skip' });
  if (await skipBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await skipBtn.click();
  }
}

async function openFirstProductBuySheet(page: Page, paymentMethod: 'cod' | 'installments') {
  await page.goto('/shop?autostart=1');
  await dismissIntroIfVisible(page);
  await expect(page.locator('[data-testid^="product-card-"]').first()).toBeVisible();

  // Click the Buy button on the first available in-stock product
  const buyButton = page
    .locator('[data-testid^="product-card-"] button:not([disabled])', { hasText: /Buy/i })
    .first();
  await buyButton.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  if (paymentMethod === 'installments') {
    await dialog.getByRole('button', { name: /PKR Installments/i }).click();
  } else {
    await dialog.getByRole('button', { name: /Cash on Delivery/i }).click();
  }

  await dialog.getByRole('button', { name: /Proceed to Checkout/i }).click();
  return dialog;
}

test.describe('Cinematic Arts (CA) End-to-End Storefront Journeys', () => {
  test.describe.configure({ mode: 'serial' });

  let createdSellerCode = '';
  let installmentOrderId = '';

  test('1. Signup: Buyer registration and Seller registration with generated CA-XXXXXX referral code', async ({
    page,
  }) => {
    const suffix = Date.now().toString(36);
    const sellerEmail = `seller.${suffix}@example.com`;
    const buyerEmail = `buyer.${suffix}@example.com`;

    // 1a. Register a Seller account so a verified CA-XXXXXX Referral ID is minted
    await page.goto('/auth?autostart=1');
    await page.getByRole('button', { name: 'Sign Up' }).click();
    await page.getByRole('button', { name: /Seller Account/i }).click();

    await page.getByPlaceholder('Your full name').fill('Bilal Ahmad');
    await page.getByPlaceholder('you@example.com').fill(sellerEmail);
    await page.getByPlaceholder('••••••••').fill('StrongPass#2026');
    await page.getByPlaceholder("Father's full name").fill('Tariq Ahmad');
    await page.getByPlaceholder('03355329722').first().fill('03355329722');
    await page.getByPlaceholder('03355329722').nth(1).fill('03355329722');
    await page.getByPlaceholder('25000').fill('25000');
    await page.getByPlaceholder(/Street 4/i).fill('House 12, University Town');

    await acceptSignupTerms(page);
    await page.getByRole('button', { name: /Register & Generate Seller ID/i }).click();

    await expect(page.getByText('Welcome to CA Seller Network')).toBeVisible();
    const sellerCodeLocator = page.locator('p', { hasText: /^CA-\d{6}$/ });
    await expect(sellerCodeLocator).toBeVisible();
    createdSellerCode = (await sellerCodeLocator.textContent())?.trim() || '';
    expect(createdSellerCode).toMatch(/^CA-\d{6}$/);

    // Persist local mock state for subsequent buyer/checkout tests cleanly, then register a Buyer
    const buyerContext = await page.context().browser()!.newContext({
      baseURL: page.url().startsWith('http') ? new URL(page.url()).origin : undefined,
      storageState: await page.context().storageState(),
    });
    const buyerPage = await buyerContext.newPage();

    await buyerPage.goto('/auth?autostart=1');
    await buyerPage.getByRole('button', { name: 'Sign Up' }).click();
    await buyerPage.getByRole('button', { name: /User Account/i }).click();
    await buyerPage.getByPlaceholder('Your full name').fill('Sana Khan');
    await buyerPage.getByPlaceholder('you@example.com').fill(buyerEmail);
    await buyerPage.getByPlaceholder('••••••••').fill('BuyerPass#2026');
    await acceptSignupTerms(buyerPage);
    await buyerPage.getByRole('button', { name: /Create Customer Account/i }).click();

    await expect(buyerPage).toHaveURL(/\/profile/);
    await buyerContext.close();
  });

  test('2. Cash on Delivery (COD) Order -> lands on Order Confirmation Screen with Order ID', async ({
    page,
  }) => {
    const dialog = await openFirstProductBuySheet(page, 'cod');

    await dialog.getByPlaceholder('Your full name').fill('Amina Tariq');
    await dialog.getByPlaceholder('03355329722').first().fill('03355329722');
    await dialog.getByPlaceholder('03355329722').nth(1).fill('03355329722');
    await dialog.getByPlaceholder('Peshawar').fill('Peshawar');
    await dialog.getByPlaceholder(/House \/ Street/i).fill('Street 9, Hayatabad Phase 2');
    await dialog.getByPlaceholder('25000').fill('25100');

    await dialog.getByRole('button', { name: /Confirm & Place Order/i }).click();

    await expect(page).toHaveURL(/\/order-confirmed\?id=/);
    await expect(page.getByTestId('order-confirmation-screen')).toBeVisible();
    const orderIdText = (await page.getByTestId('confirmed-order-id').textContent())?.trim() || '';
    expect(orderIdText).toMatch(/^CA-/);
  });

  test('3. Installment Order WITHOUT Seller Referral ID -> MUST fail validation and block submission', async ({
    page,
  }) => {
    const dialog = await openFirstProductBuySheet(page, 'installments');

    await dialog.getByPlaceholder('Your full name').fill('Usman Ali');
    await dialog.getByPlaceholder('03355329722').first().fill('03001234567');
    await dialog.getByPlaceholder('03355329722').nth(1).fill('03001234567');
    await dialog.getByPlaceholder('Peshawar').fill('Lahore');
    await dialog.getByPlaceholder(/House \/ Street/i).fill('Block H, Gulberg III');
    await dialog.getByPlaceholder('25000').fill('54660');

    // Leave Seller Referral ID empty intentionally
    await dialog.getByPlaceholder('CA-XXXXXX').fill('');
    await dialog.getByRole('button', { name: /Confirm & Place Order/i }).click();

    // Must remain on checkout modal and display explicit referral validation failure
    await expect(page).not.toHaveURL(/\/order-confirmed/);
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText(/An active Seller Referral ID.*required for installment plans/i)
    ).toBeVisible();

    // Also test bogus/inactive referral code fails cleanly
    await dialog.getByPlaceholder('CA-XXXXXX').fill('CA-000000');
    await dialog.getByRole('button', { name: /Confirm & Place Order/i }).click();
    await expect(page).not.toHaveURL(/\/order-confirmed/);
    await expect(
      dialog.getByText(/Seller Referral ID not found or inactive|Seller ID not recognized/i)
    ).toBeVisible();
  });

  test('4. Installment Order WITH Valid Seller Referral ID -> succeeds & renders Order Confirmation Screen with Order ID', async ({
    page,
  }) => {
    // Re-register a seller in this browser context so mock localStorage has the active seller code
    const suffix = Date.now().toString(36);
    await page.goto('/auth?autostart=1');
    await page.getByRole('button', { name: 'Sign Up' }).click();
    await page.getByRole('button', { name: /Seller Account/i }).click();
    await page.getByPlaceholder('Your full name').fill('Verified Seller E2E');
    await page.getByPlaceholder('you@example.com').fill(`ref.${suffix}@example.com`);
    await page.getByPlaceholder('••••••••').fill('SellerPass#2026');
    await page.getByPlaceholder("Father's full name").fill('Kamran Khan');
    await page.getByPlaceholder('03355329722').first().fill('03355329722');
    await page.getByPlaceholder('03355329722').nth(1).fill('03355329722');
    await page.getByPlaceholder('25000').fill('25000');
    await page.getByPlaceholder(/Street 4/i).fill('University Road, Peshawar');
    await acceptSignupTerms(page);
    await page.getByRole('button', { name: /Register & Generate Seller ID/i }).click();

    const codeText = (
      await page.locator('p', { hasText: /^CA-\d{6}$/ }).textContent()
    )?.trim() || '';
    expect(codeText).toMatch(/^CA-\d{6}$/);
    createdSellerCode = codeText;

    // Now place an Installment order using that valid Seller Referral ID
    const dialog = await openFirstProductBuySheet(page, 'installments');

    await dialog.getByPlaceholder('Your full name').fill('Hamza Raza');
    await dialog.getByPlaceholder('03355329722').first().fill('03129876543');
    await dialog.getByPlaceholder('03355329722').nth(1).fill('03129876543');
    await dialog.getByPlaceholder('Peshawar').fill('Peshawar');
    await dialog.getByPlaceholder(/House \/ Street/i).fill('Sector E-2, Hayatabad');
    await dialog.getByPlaceholder('25000').fill('25100');
    await dialog.getByPlaceholder('CA-XXXXXX').fill(createdSellerCode);

    await expect(dialog.getByText(/Verified Seller:/i)).toBeVisible();
    await dialog.getByRole('button', { name: /Confirm & Place Order/i }).click();

    await expect(page).toHaveURL(/\/order-confirmed\?id=/);
    await expect(page.getByTestId('order-confirmation-screen')).toBeVisible();
    installmentOrderId =
      (await page.getByTestId('confirmed-order-id').textContent())?.trim() || '';
    expect(installmentOrderId).toMatch(/^CA-/);
    await expect(page.getByText(createdSellerCode)).toBeVisible();

    // Persist seller + order state in same page session and run Step 5 (Admin workflow)
    await page.goto('/admin?autostart=1');

    const confirmInput = page.locator('#admin-password-confirm');
    await page.locator('#admin-password-input').fill(ADMIN_PASSWORD);
    if (await confirmInput.isVisible()) {
      await confirmInput.fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: /Claim Password & Unlock/i }).click();
    } else {
      await page.getByRole('button', { name: /^Unlock$/i }).click();
    }

    await expect(page.getByText('CA Admin Console')).toBeVisible();
    await page.getByRole('button', { name: /Orders \(/i }).click();

    // Locate the newly placed Pending order card and click it
    const orderCard = page.locator('button', { hasText: installmentOrderId }).first();
    await expect(orderCard).toBeVisible();
    await expect(orderCard.getByText(/^pending$/i)).toBeVisible();
    await orderCard.click();

    const orderDialog = page.getByRole('dialog');
    await expect(orderDialog).toBeVisible();

    // Transition Pending -> Proceeding
    await orderDialog.getByRole('button', { name: /^Proceed$/i }).click();
    await expect(orderDialog.getByText(/^proceeding$/i)).toBeVisible();

    // Transition Proceeding -> Complete (and credit 10% seller commission)
    await orderDialog.getByRole('button', { name: /Complete & Credit 10%/i }).click();
    await expect(orderDialog.getByText(/^complete$/i)).toBeVisible();
    await expect(orderDialog.getByText(/Credited to seller/i)).toBeVisible();
  });
});
