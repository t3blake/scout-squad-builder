# Scout Squad Builder - Design

Source of truth: This file is the canonical product/design specification for this project. Implementation files (`index.html`, `styles.css`, `app.js`) are derived artifacts.

## 1. Problem Statement

CSAs can benefit from pre-structured Scout squads, but creating a reusable squad package manually is repetitive, error-prone, and inconsistent across users.

We need a simple web app that:

1. Explains what a Scout squad is.
2. Explains why a user would want one.
3. Collects role/context inputs.
4. Generates a complete zip package of squad markdown/json files.
5. Provides concise import instructions for Scout.

## 2. Product Goals

1. Fast onboarding: first-time user can generate and import a squad package in under 10 minutes.
2. Strong defaults: generated output includes compliance-first guardrails by default.
3. Flexibility: users can remove/replace default squad content with their own.
4. Accessibility: UI meets practical accessibility expectations (keyboard support, visible focus, readable contrast, semantic structure).
5. Privacy: no user input leaves the browser.
6. Trust and clarity: generated content references official Microsoft documentation where platform behavior is described.
7. Positioning safety: clearly state this is a personal/community tool and not an official Microsoft product.

## 3. Non-Goals

1. No server-side storage, user accounts, or telemetry in v1.
2. No direct Scout API integration in v1.
3. No runtime validation against every Scout version in v1.

## 4. Personas

1. Primary: professional user who wants a reusable Scout squad quickly.
2. Secondary: team lead sharing a standard starter squad with a broader team.

Example starter personas in UI:

1. IT Support Technician.
2. Knowledge Worker.
3. Project Manager.
4. Sales/Account Coordinator.

## 5. Information Architecture

The page is a single-screen flow with four explicit stages:

1. Understand:
- What is a Scout squad?
- Why use one?

2. Configure:
- Role/team inputs.
- Guardrail defaults.
- Members and optional custom members.

3. Generate:
- Build zip locally.
- Preview generated install prompt.

4. Import:
- "Extract zip + give Scout this prompt" instructions.

## 6. UX and Content Strategy

### 6.1 Content principles

1. Lead with plain language, not implementation details.
2. Keep required actions minimal.
3. Keep command text copy-ready.
4. Separate "required" from "optional advanced" details.
5. Add light disclaimer language near install/output sections: this tool is not affiliated with or endorsed by Microsoft.

### 6.3 Official-doc anchoring requirements

When the app explains Scout/Copilot agent behavior, it should:

1. Link to official Microsoft or GitHub documentation where available.
2. Mark local adaptations clearly as project-specific conventions.
3. Avoid wording that implies official Microsoft support, certification, or endorsement.

### 6.2 Interaction principles

1. Progressive disclosure: advanced options collapsed by default.
2. Immediate feedback: install prompt updates as fields change.
3. Safe defaults: compliance members enabled by default.
4. Low-friction customization: users can add/remove member definitions without touching code.

## 7. Accessibility Requirements

1. Semantic headings and landmark structure.
2. All controls have persistent labels.
3. Keyboard-only flow works end-to-end.
4. Focus indicators are visible and high contrast.
5. Color contrast target: WCAG AA for text and interactive controls.
6. Error states are announced with clear text (not color-only cues).
7. Motion minimized and non-essential.

## 8. Compliance and Guardrails (Default-ON)

Generated squad package must include:

1. Evidence tiering standard (official doc, internal info, field observation, unverified hypothesis).
2. Verify-before-claim standard.
3. Approval-tier boundaries (system-of-record actions drafted only; user performs final submit).
4. Audit and compliance reviewers included by default in member set.
5. Durable decision capture path (`.squad/decisions/inbox/` + merged ledger).
6. Run receipts and closeout scaffolding.
7. Reference section in generated README that points users to official docs for canonical behavior and latest platform updates.

## 9. Flexibility Model

Users should be able to tailor the output without code changes.

### 9.1 Required flexibility

1. Remove default members.
2. Add custom members (name, id, short description).
3. Override role tone and focus text.
4. Optionally disable/replace example account context.

### 9.2 Guardrail preservation approach

1. "Strict mode" default ON: includes compliance/audit members and rules.
2. If user disables strict mode, app displays explicit warning before generation.

## 10. Output Package Specification

Minimum generated structure:

- `manifest.json`
- `README.md`
- `.github/agents/squad.agent.md`
- `.squad/team.md`
- `.squad/rules.md`
- `.squad/routing.md`
- `.squad/ceremonies.md`
- `.squad/decisions.md`
- `.squad/decisions/inbox/.gitkeep`
- `.squad/log/.gitkeep`
- `.squad/orchestration-log/.gitkeep`
- `.squad/run-receipts/.gitkeep`
- `.squad/templates/decision-inbox-template.md`
- `.squad/templates/run-receipt-template.md`
- `.squad/agents/<member>/charter.md`
- `.squad/agents/<member>/history.md`
- `standalone-agents/<member>.agent.md` (non-scribe)
- `scripts/set-team-root.ps1`
- `.gitattributes`

Generated README requirements:

1. Include short disclaimer text that this is a personal/community scaffold.
2. Include a compact "official docs" section with links users can verify.
3. Separate "official behavior" from "project conventions".

## 11. Technical Architecture (v1)

1. Static site hosted on GitHub Pages.
2. Frontend-only generation.
3. JSZip used for in-browser zip creation.
4. No backend dependencies.

## 12. Data Model (Form Input)

Core fields:

1. Squad name.
2. Owner name.
3. Owner role.
4. Focus areas.
5. Accounts/use cases.
6. Tone/behavior notes.
7. Member selection list.
8. Custom member list.
9. Strict mode flag.
10. Starter persona preset (for role-neutral examples).
11. Preset-specific starter roster, with optional catalog roles available to add.

## 13. Security and Privacy

1. No network POST of user configuration.
2. No secrets requested.
3. No third-party analytics by default.
4. Dependencies pinned to known versions where possible.

## 14. Success Criteria

1. User can generate valid zip without errors.
2. User can import with short prompt and start squad workflow.
3. Output includes compliance guardrails by default.
4. Accessibility checks pass for keyboard and contrast basics.

## 15. Original Design vs Lessons Learned

### 15.1 Original design intent

1. Lightweight single form.
2. Fast zip generation.
3. Prompt preview in-app.

### 15.2 Lessons learned after testing prototype

1. Need explicit Scout-vs-CLI guidance to avoid `/agent` confusion.
2. Need stronger onboarding sequence: explain first, configure second.
3. Need clearer compliance defaults and warning affordances when relaxing guardrails.
4. Need built-in flexibility for custom member definitions to avoid code edits by users.
5. Need concise import instructions that emphasize "extract + prompt" pattern.
6. Need explicit official-doc references and non-affiliation disclaimer language to prevent accidental implied endorsement.
7. Need role-neutral starter examples rather than owner-specific defaults.
8. Public-safe defaults should be generic, while the working contract can be
	generated from existing inputs instead of adding process fields to the form.
9. Usefulness should be an explicit quality gate alongside evidence and
	verification, with review scaled to the stakes.

## 16. Phased Plan

Phase 1 (current):
1. Design doc finalized.
2. Align IA and content to 4-stage flow.
3. Add strict-mode guardrail control and custom member support.
4. Improve accessibility and visual polish.

Phase 2:
1. Template packs (e.g., CSA, TAM, Security specialist).
2. JSON import/export for reusable org profiles.
3. Optional preview of generated key files before zip.

### Preset roster principle

Starter presets should include only roles that support the selected use case.
Personal operating roles or recurring rituals remain optional catalog roles,
not universal defaults. Each preset declares `defaultMembers` by member id,
while Scribe remains the universal required role.

## 17. Open Questions

1. Should strict mode be unskippable for first-time users?
2. Do we want one or multiple example use-case presets at launch?
3. Should custom member entries support richer fields (tone, boundaries) in v1?

## 18. Baseline Disclaimer Language (Draft)

Short form for UI:

"This is a personal/community scaffold generator. It is not an official Microsoft product and is not affiliated with or endorsed by Microsoft."

Short form for generated README:

"This package was generated by a community tool. For canonical platform guidance, always validate against official Microsoft documentation linked below."

## 19. Starter Example Use Cases (Role-Neutral)

1. IT Support Technician squad:
- Ticket triage, knowledge lookup, incident follow-up, and escalation drafting.

2. Knowledge Worker squad:
- Meeting action capture, document synthesis, follow-up tracking, and weekly planning.

3. Project Manager squad:
- Milestone tracking, risk review, stakeholder update drafting, and status rollups.

4. Sales/Account Coordinator squad:
- Meeting prep, account notes, follow-up sequencing, and customer-safe message drafting.
