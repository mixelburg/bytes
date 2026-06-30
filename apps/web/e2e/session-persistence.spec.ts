import { expect, test } from '@playwright/test';

// Each test gets a fresh browser context → a fresh anonymous session id, so
// state is isolated per test. These cover the backend-persistence behaviour:
// cart + saved survive a reload (rehydrated from the session), and placed
// orders show up in history.

// The session write is debounced ~500ms then PUT to the API; give it room
// before reloading so the server has the latest blob.
const SYNC_MS = 1500;

test('cart survives a reload (rehydrated from the session)', async ({
  page,
}) => {
  await page.goto('/');
  const add = page.getByRole('button', { name: /add .* to cart/i }).first();
  await add.waitFor();
  await add.click();
  await expect(page.getByText(/cart \(1\)/i).first()).toBeVisible();

  await page.waitForTimeout(SYNC_MS);
  await page.reload();

  await expect(page.getByText(/cart \(1\)/i).first()).toBeVisible({
    timeout: 7000,
  });
});

test('saved items survive a reload and appear on /saved', async ({ page }) => {
  await page.goto('/');
  const save = page.getByRole('button', { name: /^save /i }).first();
  await save.waitFor();
  await save.click();

  await page.waitForTimeout(SYNC_MS);
  await page.goto('/saved');
  await expect(page.getByRole('heading', { name: /^saved/i })).toBeVisible();
  await expect(page.getByText(/1 item/i)).toBeVisible({ timeout: 7000 });

  // and again after a fresh load → proves it came from the server, not memory
  await page.goto('/saved');
  await expect(page.getByText(/1 item/i)).toBeVisible({ timeout: 7000 });
});

test('a placed order appears in order history', async ({ page }) => {
  await page.goto('/');
  const add = page.getByRole('button', { name: /add .* to cart/i }).first();
  await add.waitFor();
  await add.click();
  await page.getByText(/cart \(1\)/i).first().waitFor();
  await page.getByRole('button', { name: 'Cart', exact: true }).click();
  await page.getByRole('button', { name: /checkout/i }).click();
  await page.getByRole('button', { name: /place order/i }).click();
  await expect(
    page.getByRole('heading', { name: /order placed/i }),
  ).toBeVisible({ timeout: 7000 });

  await page.goto('/orders');
  await expect(page.getByRole('heading', { name: /^orders/i })).toBeVisible();
  // not the empty state, and at least one order row
  await expect(page.getByText(/no orders yet/i)).toHaveCount(0);
  await expect(page.getByText(/item/i).first()).toBeVisible({ timeout: 7000 });
});
