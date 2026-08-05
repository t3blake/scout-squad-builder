# Scout Squad Zip Builder

Static web app that generates a ready-to-extract squad package for Microsoft Scout.

## Why this exists

Many CSAs can use the same squad pattern, but each needs small customizations
(name, role focus, accounts, members, tone). This app captures those inputs and
produces a zip containing squad markdown/json files.

## Example presets (modular)

The role/use-case dropdown is driven by `presets/presets.json`.

- Add a new object to `presets` and it appears automatically in the UI.
- See `presets/README.md` for required fields.
- If the JSON file cannot be loaded (for example restrictive local file mode),
  the app falls back to built-in defaults so generation still works.

## Run locally

Open `index.html` in a browser.

## Deploy to GitHub Pages

1. Create a new GitHub repo.
2. Push these files to the default branch.
3. In GitHub repo settings, enable Pages from `main` branch root.
4. Open the published URL and use the form.

## Output

The generated zip includes:

- `manifest.json`
- `README.md`
- `.github/agents/squad.agent.md`
- `.squad/*` core files
- `.squad/agents/<member>/charter.md`
- `.squad/agents/<member>/history.md`
- `standalone-agents/*.agent.md`

## Notes

- This is intentionally static and client-side only.
- No user data leaves the browser.

## User Testing Gate (Continue vs Stop)

Use this quick gate before adding more hardening work:

1. Run 5 realistic user tasks (preset select, role edits, add/remove role, generate zip, copy prompt).
2. Log each issue with severity:
    - Critical: blocks completion or generates broken output.
    - Major: user confusion with repeated failures.
    - Minor: cosmetic or low-friction issue.
3. Continue hardening only when one of these is true:
    - At least 1 critical issue exists.
    - At least 2 major issues repeat across testers.
    - A fix measurably reduces completion time or error rate.
4. Stop hardening and run broader user testing when:
    - 0 critical issues.
    - Fewer than 2 repeat major issues.
    - No clearly measurable UX gain from another change.
