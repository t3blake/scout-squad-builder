const { test, expect } = require('@playwright/test');

function expectAnswerPreservingFiles(files, members, skillName) {
  const coordinator = files['.github/agents/squad.agent.md'];
  const rules = files['.squad/rules.md'];
  expect(coordinator).toContain('original request');
  expect(coordinator).toContain('before role or recovery context');
  expect(coordinator).toContain('real agent/tool calls');
  expect(coordinator).toContain('directly without a full fan-out');
  for (const field of ['ARTIFACT', 'FORMAT', 'SCOPE', 'AUDIENCE', 'DONE-WHEN']) {
    expect(coordinator).toContain(`${field}:`);
  }
  for (const requiredGuidance of [
    'original request is the source of truth',
    'supported steps, values, conditions and examples',
    'recommendations',
    'smallest correction',
    'Routine repairs stay with the original author',
    'independent re-review',
    'Reassign only for an actual approval-boundary violation',
    'Withhold a usefulness pass while the requested answer is missing',
    'one focused repair and re-review',
    'not just the generated contract',
    'one representative answer',
    'after material changes',
    'no independent reviewer is available',
    'Simple direct answers do not require a full-team ceremony or user sign-off',
    'Internal review bookkeeping',
    'exact content and recipients',
    'user performs final submission',
    'A factual or format pass does not establish usefulness',
    'A review of an earlier draft does not approve a changed artifact'
  ]) {
    expect(rules).toContain(requiredGuidance);
  }
  for (const verdict of ['Source-safe', 'Format-valid', 'Useful', 'Approved to share']) {
    expect(rules).toContain(verdict);
  }
  expect(files['.squad/templates/run-receipt-template.md']).toContain('<interim|completed|incomplete>');
  expect(files['.squad/templates/run-receipt-template.md']).toContain('Reviewed revision');
  expect(files[`skills/${skillName}.md`]).toContain('original request unchanged');
  expect(files['.squad/routing.md']).toContain('available members');
  expect(files['.squad/ceremonies.md']).toContain('not mandatory extra meetings');
  expect(files['README.md']).toContain('do not guarantee model behavior');
  for (const member of members) {
    const charter = files[`.squad/agents/${member.id}/charter.md`];
    expect(charter).toContain('original request');
    expect(charter).toContain(member.description);
    if (member.id !== 'scribe') {
      expect(files[`standalone-agents/${member.id}.agent.md`]).toContain('answer-preservation');
    }
  }
  expect(Object.keys(files).filter((path) => path.endsWith('/charter.md'))).toHaveLength(members.length);
  if (!members.some((member) => member.id === 'scribe')) {
    expect(coordinator).not.toContain('Trigger Scribe');
    expect(coordinator).toContain('Record closeout yourself');
    expect(files['.squad/agents/scribe/charter.md']).toBeUndefined();
  }
}

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
    await expect(page.getByLabel('Squad name')).not.toHaveValue(/Private Customer|Example Account/);
    await expect(page.getByLabel('Top accounts (comma-separated)')).toHaveValue('Contoso, partner stakeholders');
  });

  test('uses a focused knowledge-worker roster', async ({ page }) => {
    await expect(page.getByLabel('Role name for scrum-master')).toBeVisible();
    await expect(page.getByLabel('Role name for content-strategist')).toBeVisible();
    await expect(page.getByLabel('Role name for learning-coordinator')).not.toBeAttached();
    await expect(page.getByLabel('Role name for operations-manager')).not.toBeVisible();
  });

  test('can add an optional catalog role', async ({ page }) => {
    await page.getByLabel('Catalog role to add').selectOption('audit-manager');
    await page.getByRole('button', { name: 'Add catalog role' }).click();
    await expect(page.getByLabel('Role name for audit-manager')).toBeVisible();
  });

  test('flags duplicate member names on generate', async ({ page }) => {
    const contentName = page.getByLabel('Role name for content-strategist');
    await expect(contentName).toBeVisible();
    await contentName.fill('Scrum Master');
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

  test('generated squads preserve answers through focused review', async ({ page }) => {
    const scenarios = [
      {
        name: 'reviewer-equipped roster',
        members: [
          { id: 'content-strategist', name: 'Content Strategist', description: 'Write useful responses.', type: 'suggested' },
          { id: 'strategic-advisor', name: 'Strategic Advisor', description: 'Review relevance.', type: 'suggested' },
          { id: 'audit-manager', name: 'Audit Manager', description: 'Check facts.', type: 'suggested' },
          { id: 'compliance-officer', name: 'Compliance Officer', description: 'Check approvals.', type: 'suggested' },
          { id: 'scribe', name: 'Scribe', description: 'Record closeout.', type: 'required' }
        ]
      },
      {
        name: 'single custom member without reviewers or Scribe',
        members: [{ id: 'service-analyst', name: 'Service Analyst', description: 'Explain operational decisions.', type: 'custom' }]
      }
    ];

    for (const scenario of scenarios) {
      await test.step(scenario.name, async () => {
        const { files } = await page.evaluate((members) => buildFiles({
          squadName: 'Service Planning Squad',
          ownerName: '',
          ownerRole: 'Service owner',
          focus: 'Practical operational guidance',
          accounts: 'Internal services',
          tone: 'Concise and useful',
          skillName: 'service-team',
          members
        }), scenario.members);

        expectAnswerPreservingFiles(files, scenario.members, 'service-team');
        if (!scenario.members.some((member) => member.id === 'scribe')) {
          expect(files['standalone-agents/service-analyst.agent.md']).toBeDefined();
          expect(files['.squad/agents/strategic-advisor/charter.md']).toBeUndefined();
        }
      });
    }
  });

  for (const roster of ['default', 'minimal custom']) {
    test(`downloaded ZIP retains answer-preservation for ${roster} roster`, async ({ page }) => {
      await page.getByLabel('Starter example').selectOption('it-support-technician');
      await page.getByLabel('Squad name', { exact: true }).fill('Service Planning Squad');
      await page.getByLabel('Owner name', { exact: true }).fill('');
      await page.getByLabel('Owner role', { exact: true }).fill('Service owner');
      await page.getByLabel('Primary focus areas').fill('Practical operational guidance');
      await page.getByLabel('Top accounts (comma-separated)').fill('Internal services');
      await page.getByLabel('Tone / behavior notes').fill('Concise and useful');
      await page.getByLabel('Skill name', { exact: true }).fill('service-team');

      if (roster === 'minimal custom') {
        page.on('dialog', (dialog) => dialog.accept());
        const removeButtons = page.getByRole('button', { name: /^Remove / });
        while (await removeButtons.count()) {
          await removeButtons.first().click();
        }
        await page.getByLabel('New role name', { exact: true }).fill('Service Analyst');
        await page.getByLabel('New role responsibility').fill('Explain operational decisions.');
        await page.getByRole('button', { name: '+ Add role', exact: true }).click();
        await expect(page.locator('#memberRows tr')).toHaveCount(1);
      }

      const { values, expectedFiles } = await page.evaluate(() => {
        const values = collectValues();
        return { values, expectedFiles: buildFiles(values).files };
      });
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Generate zip', exact: true }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe('service-planning-squad.zip');
      const stream = await download.createReadStream();
      expect(stream).not.toBeNull();
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const files = await page.evaluate(async (base64) => {
        const zip = await JSZip.loadAsync(base64, { base64: true });
        const entries = await Promise.all(Object.values(zip.files)
          .filter((entry) => !entry.dir)
          .map(async (entry) => [entry.name, await entry.async('string')]));
        return Object.fromEntries(entries);
      }, Buffer.concat(chunks).toString('base64'));

      expect(Object.keys(files).sort()).toEqual(Object.keys(expectedFiles).sort());
      expectAnswerPreservingFiles(files, values.members, values.skillName);
      for (const path of [
        '.github/agents/squad.agent.md',
        '.squad/rules.md',
        '.squad/routing.md',
        '.squad/ceremonies.md',
        '.squad/templates/run-receipt-template.md',
        'skills/service-team.md',
        'README.md'
      ]) {
        expect(files[path]).toBe(expectedFiles[path]);
      }
      expect(Object.values(files).join('\n')).not.toMatch(/[A-Z]:\\+Users\\/i);
      expect(await download.failure()).toBeNull();
    });
  }
});
