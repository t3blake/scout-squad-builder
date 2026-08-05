# Preset Registry

Add or edit example presets in `presets.json`.

## Contract

- Keep `schemaVersion` as `1`.
- Add new entries under `presets`.
- Required fields per preset:
  - `id`
  - `label`
  - `squadName`
  - `ownerRole`
  - `focus`
  - `accounts`
  - `tone`

When you add a new preset object, it automatically appears in the web app dropdown.
