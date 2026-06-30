import { test, expect } from '@playwright/test';

test('loads the catalog list from the API', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /market/i })).toBeVisible();
  await expect(page.getByText(/\d[\d,]* results/i)).toBeVisible();
  // at least one product card with a quick-add control
  await expect(page.getByRole('button', { name: /add .* to cart/i }).first()).toBeVisible();
});

test('search with no matches shows the empty state', async ({ page }) => {
  await page.goto('/');
  await page.getByText(/\d[\d,]* results/i).waitFor();
  await page.getByLabel(/search products/i).fill('zzzzzz-no-match-xyz');
  await expect(page.getByText(/no matches/i)).toBeVisible();
});

test('completes a full purchase: add → cart → checkout → confirm', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /add .* to cart/i }).first().waitFor();

  // quick-add resolves a variant then updates the cart badge
  await page.getByRole('button', { name: /add .* to cart/i }).first().click();
  await expect(page.getByText(/cart \(1\)/i).first()).toBeVisible();

  await page.getByRole('button', { name: 'Cart', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^cart/i })).toBeVisible();

  await page.getByRole('button', { name: /checkout/i }).click();
  await expect(page.getByRole('heading', { name: /checkout/i })).toBeVisible();

  await page.getByRole('button', { name: /place order/i }).click();
  await expect(page.getByRole('heading', { name: /order placed/i })).toBeVisible({ timeout: 7000 });
  await expect(page.getByRole('button', { name: /continue shopping/i })).toBeVisible();
});

test('tracks an order: place → confirm → track shows route + ETA', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /add .* to cart/i }).first().waitFor();
  await page.getByRole('button', { name: /add .* to cart/i }).first().click();
  await page.getByText(/cart \(1\)/i).first().waitFor();
  await page.getByRole('button', { name: 'Cart', exact: true }).click();
  await page.getByRole('button', { name: /checkout/i }).click();
  await page.getByRole('button', { name: /place order/i }).click();

  await expect(page.getByRole('heading', { name: /order placed/i })).toBeVisible({ timeout: 7000 });
  await page.getByRole('button', { name: /track order/i }).click();

  // Tracking screen: route schematic, the destination node, and an ETA.
  await expect(page).toHaveURL(/\/track\//);
  await expect(page.getByText(/estimated arrival|delivered/i)).toBeVisible();
  await expect(page.getByText('Your address')).toBeVisible();
  await expect(page.getByText(/stops passed/i)).toBeVisible();
});

test('checkout surfaces a recoverable error when the request fails', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /add .* to cart/i }).first().waitFor();
  await page.getByRole('button', { name: /add .* to cart/i }).first().click();
  await page.getByText(/cart \(1\)/i).first().waitFor();
  await page.getByRole('button', { name: 'Cart', exact: true }).click();
  await page.getByRole('button', { name: /checkout/i }).click();

  await page.getByText(/simulate network failure/i).click();
  await page.getByRole('button', { name: /place order/i }).click();
  await expect(page.getByText(/no charge was made/i)).toBeVisible({ timeout: 7000 });
});
