import { expect, test } from '@playwright/test';

test('discover → shortlist → compare → editable enquiry → review → save draft', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'The right machine. For your next project.' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Shortlist Terra Mini 6' }).check();
  await page.getByRole('checkbox', { name: 'Shortlist Terra Pro 30' }).uncheck();
  await page.getByRole('button', { name: 'Compare shortlist' }).click();
  await expect(page.getByRole('grid', { name: 'Equipment comparison' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Terra Mini 6' })).toBeVisible();
  await page.getByRole('button', { name: 'Build a rental enquiry' }).click();
  await page.getByRole('textbox', { name: 'Your name' }).fill('Amitesh Anand');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('amitesh@example.com');
  await page.getByRole('textbox', { name: 'Project location' }).fill('Ranchi');
  await page.getByRole('checkbox', { name: 'I understand these are illustrative rates.' }).check();
  await page.getByRole('button', { name: 'Review enquiry', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Ranchi');
  await expect(page.getByRole('dialog')).toContainText('Terra Mini 6');
  await page.getByRole('button', { name: 'Save local draft' }).click();
  await expect(page.getByText('Draft saved for Amitesh Anand')).toBeVisible();
  expect(errors).toEqual([]);
});

test('refines the discovery data and exposes exportable A2UI messages', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Describe your interface' }).fill('Find smaller excavators in Ranchi for 7 days');
  await page.getByRole('button', { name: 'Generate interface' }).click();
  await expect(page.getByText('1 sample machines · Ranchi · 7 days')).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.getByRole('button', { name: 'Toggle protocol inspector' }).click();
  await expect(page.locator('.inspector pre')).toContainText('createSurface');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download A2UI JSON' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('genui-discover.a2ui.json');
});

test('retains edited form state across scenarios and rejects an incomplete enquiry', async ({ page }) => {
  await page.goto('/');
  await page.locator('.suggestions').getByRole('button', { name: /Rental enquiry/ }).click();
  await page.getByRole('button', { name: 'Review enquiry', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('valid email');
  await page.getByRole('textbox', { name: 'Project location' }).fill('Chennai');
  await page.locator('.suggestions').getByRole('button', { name: /Side-by-side/ }).click();
  await expect(page.getByRole('grid', { name: 'Equipment comparison' })).toBeVisible();
  await page.getByRole('button', { name: 'Build a rental enquiry' }).click();
  await expect(page.getByRole('textbox', { name: 'Project location' })).toHaveValue('Chennai');
});

test('retains the last valid design when model output is rejected', async ({ page }) => {
  await page.route('**/api/generate', route => route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: '{"version":"v0.9.1","createSurface":{"surfaceId":"workspace","catalogId":"unknown"}}\n' }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Generation mode' }).click();
  await page.getByRole('option', { name: 'Gemini · API key' }).click();
  await page.getByRole('textbox', { name: 'Describe your interface' }).fill('Make a layout');
  await page.getByRole('button', { name: 'Generate interface' }).click();
  await expect(page.getByRole('alert')).toContainText('Unsupported component catalog');
  await expect(page.getByRole('heading', { name: 'The right machine. For your next project.' })).toBeVisible();
});

test('mobile layouts and the extension guide remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Generate interface' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Component catalog', exact: false }).click();
  await expect(page.getByRole('heading', { name: 'A shared language for UI.' })).toBeVisible();
  await expect(page.getByText('Future adapter · not implemented')).toHaveCount(2);
  await page.getByRole('button', { name: 'Integration guide', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Built to change design systems.' })).toBeVisible();
});
