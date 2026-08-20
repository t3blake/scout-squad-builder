const { test, expect } = require('@playwright/test');
test.describe('Scout Squad Zip Builder smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.getByRole('heading', { name: 'Configure your squad' })).toBeVisible();
  });

  test('shows deterministic install prompt contract', async ({ page }) => {
    const prompt = page.locator('#installPrompt');
    await expect(prompt).toBeVisible();
    await expect(prompt).toHaveValue(/Install this squad from/);

    await expect(prompt).toHaveValue(/First inspect manifest\.json and README\.md\./);
    await expect(prompt).toHaveValue(/Set TEAM_ROOT to this exact folder path/);
    await expect(prompt).toHaveValue(/ask before overwrite/);
    await expect(prompt).toHaveValue(/harmless routing smoke test/);
  });

  test('uses public-safe starter values', async ({ page }) => {
    await expect(page.getByLabel('Squad name')).not.toHaveValue(/USAA|Bank of America|BofA/);
    await expect(page.getByLabel('Top accounts (comma-separated)')).toHaveValue('Contoso, partner stakeholders');
  });

  test('flags duplicate member names on generate', async ({ page }) => {
    const operationsName = page.getByLabel('Role name for operations-manager');
    await expect(operationsName).toBeVisible();
    await operationsName.fill('Account Manager');
    await page.getByRole('button', { name: 'Generate zip' }).click();

    const validation = page.locator('#memberValidationMessage');
    await expect(validation).toBeVisible();
    await expect(validation).toContainText('Use unique role names');
  });

  test('keeps learning content collapsed by default', async ({ page }) => {
    const learnMore = page.locator('.learn-more-panel');
    await expect(learnMore).toBeVisible();
    await expect(learnMore).not.toHaveAttribute('open', '');

    const summary = page.getByText('Learn more about Scout squads (optional)');
    await expect(summary).toBeVisible();
  });
});
