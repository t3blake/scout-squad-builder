const memberCatalog = [
  { id: "account-manager", name: "Account Manager", description: "Account history, stakeholder maps, and handoff packages.", type: "suggested" },
  { id: "operations-manager", name: "Operations Manager", description: "Operational hygiene, milestones, and follow-up readiness.", type: "suggested" },
  { id: "product-researcher", name: "Product Researcher", description: "Product facts, roadmap checks, and customer-safe framing.", type: "suggested" },
  { id: "scrum-master", name: "Scrum Master", description: "Commitments, priorities, and follow-up tracking.", type: "suggested" },
  { id: "innovation-lead", name: "Innovation Lead", description: "Demos, labs, prototypes, and technical experiments.", type: "suggested" },
  { id: "content-strategist", name: "Content Strategist", description: "Workshops, decks, messaging, and content packaging.", type: "suggested" },
  { id: "strategic-advisor", name: "Strategic Advisor", description: "Pressure-tests assumptions, risks, and tradeoffs.", type: "suggested" },
  { id: "audit-manager", name: "Audit Manager", description: "Fact-checks claims, sources, and evidence quality.", type: "suggested" },
  { id: "compliance-officer", name: "Compliance Officer", description: "Enforces approval boundaries and verify-before-claim.", type: "suggested" },
  { id: "scribe", name: "Scribe", description: "Silent closeout, receipts, and durable memory merge.", type: "required" }
];

const form = document.getElementById("builderForm");
const memberRowsEl = document.getElementById("memberRows");
const promptBox = document.getElementById("installPrompt");
const presetSelect = document.getElementById("presetSelect");
const copyPromptButton = document.getElementById("copyPromptButton");
const addMemberButton = document.getElementById("addMemberButton");
const catalogMemberSelect = document.getElementById("catalogMemberSelect");
const addCatalogMemberButton = document.getElementById("addCatalogMemberButton");
const newMemberName = document.getElementById("newMemberName");
const newMemberDescription = document.getElementById("newMemberDescription");
const skillNameInputEl = form.elements.skillName;
const memberValidationMessageEl = document.getElementById("memberValidationMessage");

const builtinPresets = [
  {
    id: "knowledge-worker",
    label: "Knowledge Worker",
    squadName: "Knowledge Worker Productivity Squad",
    ownerRole: "Knowledge Worker",
    focus: "Meeting action capture, document synthesis, follow-up tracking, and weekly planning",
    accounts: "Contoso, partner stakeholders",
    tone: "Concise, practical, and execution-focused.",
    defaultMembers: ["scrum-master", "content-strategist"]
  },
  {
    id: "it-support-technician",
    label: "IT Support Technician",
    squadName: "IT Support Operations Squad",
    ownerRole: "IT Support Technician",
    focus: "Ticket triage, knowledge lookup, incident follow-up, and escalation drafting",
    accounts: "Service desk, endpoint operations, platform teams",
    tone: "Clear, calm, and diagnostic-first with explicit verification steps.",
    defaultMembers: ["operations-manager", "product-researcher"]
  },
  {
    id: "project-manager",
    label: "Project Manager",
    squadName: "Project Delivery Squad",
    ownerRole: "Project Manager",
    focus: "Milestone tracking, risk review, stakeholder update drafting, and status rollups",
    accounts: "Program stakeholders, delivery teams",
    tone: "Structured, timeline-aware, and risk-explicit.",
    defaultMembers: ["operations-manager", "scrum-master", "strategic-advisor"]
  },
  {
    id: "sales-account-coordinator",
    label: "Sales / Account Coordinator",
    squadName: "Account Coordination Squad",
    ownerRole: "Sales and Account Coordinator",
    focus: "Meeting prep, account notes, follow-up sequencing, and customer-safe message drafting",
    accounts: "Customer accounts, partner stakeholders",
    tone: "Customer-aware, concise, and commercially practical.",
    defaultMembers: ["account-manager", "product-researcher", "content-strategist"]
  }
];

const allowedMemberTypes = ["required", "suggested", "custom"];

let memberRowsState = memberCatalog.filter((m) => m.type === "required").map((m) => ({
  id: m.id,
  name: m.name,
  description: m.description,
  type: m.type
}));

let activePresets = [];
let invalidMemberReasons = new Map();

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function createUniqueMemberId(name) {
  const base = slugify(name || "custom-role") || "custom-role";
  const existing = new Set(memberRowsState.map((x) => x.id));
  if (!existing.has(base)) {
    return base;
  }

  let i = 2;
  while (existing.has(`${base}-${i}`)) {
    i += 1;
  }
  return `${base}-${i}`;
}

function normalizedSkillName(input) {
  const raw = (input || "").toString().trim().toLowerCase();
  const clean = raw
    .replace(/^\/+/, "")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  return clean || "squad";
}

function installPromptText(teamRoot, skillNameInput) {
  const skillName = normalizedSkillName(skillNameInput);
  const slashSkill = `/${skillName}`;

  return [
    `Install this squad from ${teamRoot}.`,
    "First inspect manifest.json and README.md.",
    "Set TEAM_ROOT to this exact folder path in all generated coordinator, standalone-agent, and skill instructions. Replace any <SET_TEAM_ROOT_TO_LOCAL_FOLDER> placeholders.",
    "Use .github/agents/squad.agent.md as the Squad Lead coordinator source.",
    "Install standalone-agents/*.agent.md as user-level custom agents.",
    "If an agent or skill name already exists, ask before overwrite; otherwise preserve existing items and continue.",
    `Create a reusable Scout skill wrapper named ${slashSkill} using TEAM_ROOT\\skills\\${skillName}.md as the source spec.`,
    "If local-file install or skill creation needs approval, ask for approval first. If capability is unavailable, provide manual copy/paste steps and continue.",
    `After install, verify all referenced files exist under TEAM_ROOT, verify no placeholders remain, list installed agents/skills, and run a harmless routing smoke test via ${slashSkill}.`
  ].join("\n");
}

function safePresetList(payload) {
  if (!payload || !Array.isArray(payload.presets)) {
    return builtinPresets;
  }

  const valid = payload.presets.filter((x) =>
    x && x.id && x.label && x.squadName && x.ownerRole && x.focus && x.accounts && x.tone && Array.isArray(x.defaultMembers)
  );

  return valid.length ? valid : builtinPresets;
}

async function loadPresets() {
  try {
    const response = await fetch("presets/presets.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`preset fetch failed: ${response.status}`);
    }

    const payload = await response.json();
    return safePresetList(payload);
  } catch {
    return builtinPresets;
  }
}

function renderPresetOptions(presets) {
  presetSelect.innerHTML = "";

  for (const preset of presets) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.label;
    presetSelect.appendChild(option);
  }
}

function renderCatalogOptions() {
  catalogMemberSelect.innerHTML = '<option value="">Add a catalog role...</option>';
  const selectedIds = new Set(memberRowsState.map((member) => member.id));

  for (const member of memberCatalog) {
    if (selectedIds.has(member.id)) {
      continue;
    }

    const option = document.createElement("option");
    option.value = member.id;
    option.textContent = `${member.name} - ${member.description}`;
    catalogMemberSelect.appendChild(option);
  }
}

function applyPreset(preset) {
  if (!preset) {
    return;
  }

  form.elements.squadName.value = preset.squadName;
  form.elements.ownerRole.value = preset.ownerRole;
  form.elements.focus.value = preset.focus;
  form.elements.accounts.value = preset.accounts;
  form.elements.tone.value = preset.tone;
  const defaultMemberIds = new Set(["scribe", ...preset.defaultMembers]);
  memberRowsState = memberCatalog
    .filter((member) => defaultMemberIds.has(member.id))
    .map((member) => ({
      id: member.id,
      name: member.name,
      description: member.description,
      type: member.type
    }));
  invalidMemberReasons = new Map();
  renderMemberRows();
  renderCatalogOptions();
}

function confirmRemoval(row) {
  if (row.type === "required") {
    return window.confirm(
      `Remove required role "${row.name}"? This is safe, but it may reduce routing coverage in the generated squad.`
    );
  }

  if (row.type === "suggested") {
    return window.confirm(
      `Remove suggested role "${row.name}"? This is safe, but it may reduce recommended routing coverage.`
    );
  }

  return true;
}

function isMemberRowValid(member) {
  return Boolean(member.id && member.name.trim() && member.description.trim());
}

function normalizeMemberName(name) {
  return (name || "").trim().toLowerCase();
}

function memberReasonMessage(reasons) {
  if (reasons.includes("missing") && reasons.includes("duplicate")) {
    return "Role name and responsibility are required, and role names must be unique.";
  }
  if (reasons.includes("missing")) {
    return "Role name and responsibility are required.";
  }
  if (reasons.includes("duplicate")) {
    return "Role name must be unique.";
  }
  return "Fix this row before generating.";
}

function applyValidationUiState() {
  const rows = memberRowsEl.querySelectorAll("tr[data-member-id]");

  rows.forEach((tr) => {
    const rowId = tr.dataset.memberId;
    const reasons = invalidMemberReasons.get(rowId) || [];
    const isError = reasons.length > 0;

    const nameInput = tr.querySelector(".member-name-input");
    const descInput = tr.querySelector(".member-desc-input");
    const rowError = tr.querySelector(".row-error");

    if (!nameInput || !descInput || !rowError) {
      return;
    }

    nameInput.classList.toggle("member-input-error", isError);
    descInput.classList.toggle("member-input-error", isError);
    nameInput.setAttribute("aria-invalid", isError ? "true" : "false");
    descInput.setAttribute("aria-invalid", isError ? "true" : "false");
    rowError.hidden = !isError;

    if (isError) {
      rowError.textContent = memberReasonMessage(reasons);
    }
  });
}

function setMemberValidationMessage(message) {
  if (!message) {
    memberValidationMessageEl.textContent = "";
    memberValidationMessageEl.classList.remove("visible");
    return;
  }

  memberValidationMessageEl.textContent = message;
  memberValidationMessageEl.classList.add("visible");
}

function syncValidationMessageFromState() {
  if (!invalidMemberReasons.size) {
    setMemberValidationMessage("");
    return;
  }

  const rowNumbers = memberRowsState
    .map((row, idx) => (invalidMemberReasons.has(row.id) ? idx + 1 : null))
    .filter((x) => x !== null);

  const hasMissing = Array.from(invalidMemberReasons.values()).some((reasons) =>
    reasons.includes("missing")
  );
  const hasDuplicate = Array.from(invalidMemberReasons.values()).some((reasons) =>
    reasons.includes("duplicate")
  );

  const parts = [];
  if (hasMissing) {
    parts.push("Complete role name and responsibility");
  }
  if (hasDuplicate) {
    parts.push("Use unique role names");
  }

  setMemberValidationMessage(
    `${parts.join(". ")} for highlighted row(s): ${rowNumbers.join(", ")}.`
  );
}

function syncValidationStateFromRows(rows) {
  const issues = validateMembers(rows);
  invalidMemberReasons = new Map(issues.map((issue) => [issue.id, issue.reasons]));
  syncValidationMessageFromState();
  applyValidationUiState();
  return issues;
}

function renderMemberRows() {
  memberRowsEl.innerHTML = "";

  for (const row of memberRowsState) {
    const tr = document.createElement("tr");
    tr.dataset.memberId = row.id;

    const nameTd = document.createElement("td");
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "member-cell-input member-name-input";
    nameInput.value = row.name;
    nameInput.setAttribute("aria-label", `Role name for ${row.id}`);
    nameInput.addEventListener("input", () => {
      row.name = nameInput.value.trimStart();

      if (invalidMemberReasons.size) {
        syncValidationStateFromRows(memberRowsState);
      }

      refreshPromptPreview();
    });
    nameTd.appendChild(nameInput);

    const descTd = document.createElement("td");
    const descInput = document.createElement("input");
    descInput.type = "text";
    descInput.className = "member-cell-input member-desc-input";
    descInput.value = row.description;
    descInput.setAttribute("aria-label", `Responsibility for ${row.name}`);
    descInput.addEventListener("input", () => {
      row.description = descInput.value.trimStart();

      if (invalidMemberReasons.size) {
        syncValidationStateFromRows(memberRowsState);
      }

      refreshPromptPreview();
    });
    descTd.appendChild(descInput);

    const rowError = document.createElement("p");
    rowError.className = "row-error";
    rowError.textContent = "Role name and responsibility are required.";
    rowError.setAttribute("aria-live", "polite");
    descTd.appendChild(rowError);

    const typeTd = document.createElement("td");
    const typeSelect = document.createElement("select");
    typeSelect.className = "member-type-select";
    typeSelect.setAttribute("aria-label", `Type for ${row.name}`);

    for (const optionValue of allowedMemberTypes) {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = optionValue;
      typeSelect.appendChild(option);
    }

    typeSelect.value = allowedMemberTypes.includes(row.type) ? row.type : "custom";
    typeSelect.addEventListener("change", () => {
      row.type = typeSelect.value;
      refreshPromptPreview();
    });
    typeTd.appendChild(typeSelect);

    const actionTd = document.createElement("td");
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "X";
    removeBtn.setAttribute("aria-label", `Remove ${row.name}`);
    removeBtn.title = `Remove ${row.name}`;
    removeBtn.addEventListener("click", () => {
      if (!confirmRemoval(row)) {
        return;
      }

      memberRowsState = memberRowsState.filter((x) => x.id !== row.id);
      invalidMemberReasons.delete(row.id);
      renderMemberRows();
      renderCatalogOptions();
      syncValidationMessageFromState();
      applyValidationUiState();
      refreshPromptPreview();
    });

    const hasError = invalidMemberReasons.has(row.id);
    rowError.hidden = !hasError;

    actionTd.appendChild(removeBtn);
    tr.append(nameTd, descTd, typeTd, actionTd);
    memberRowsEl.appendChild(tr);
  }

  applyValidationUiState();
}

function collectValues() {
  const fd = new FormData(form);
  const members = memberRowsState.map((m) => ({
    id: (m.id || "").trim(),
    name: (m.name || "").trim(),
    description: (m.description || "").trim(),
    type: allowedMemberTypes.includes(m.type) ? m.type : "custom"
  }));

  return {
    squadName: (fd.get("squadName") || "").toString().trim(),
    ownerName: (fd.get("ownerName") || "").toString().trim(),
    ownerRole: (fd.get("ownerRole") || "").toString().trim(),
    focus: (fd.get("focus") || "").toString().trim(),
    accounts: (fd.get("accounts") || "").toString().trim(),
    tone: (fd.get("tone") || "").toString().trim(),
    skillName: normalizedSkillName(fd.get("skillName")),
    members
  };
}
function validateMembers(members) {
  const invalidRows = [];
  const nameCounts = new Map();

  members.forEach((member) => {
    const key = normalizeMemberName(member.name);
    if (!key) {
      return;
    }
    nameCounts.set(key, (nameCounts.get(key) || 0) + 1);
  });

  members.forEach((member, idx) => {
    const reasons = [];
    if (!isMemberRowValid(member)) {
      reasons.push("missing");
    }

    const key = normalizeMemberName(member.name);
    if (key && (nameCounts.get(key) || 0) > 1) {
      reasons.push("duplicate");
    }

    if (reasons.length) {
      invalidRows.push({ id: member.id, rowNumber: idx + 1, reasons });
    }
  });

  return invalidRows;
}

function refreshPromptPreview() {
  const values = collectValues();
  const folder = `C:\\Path\\To\\${values.squadName || "Squad"}`;
  promptBox.value = installPromptText(folder, values.skillName);
}

function buildFiles(values) {
  const squadSlug = slugify(values.squadName);
  const selected = values.members;
  const hasScribe = selected.some((m) => m.id === "scribe");

  const ownerName = values.ownerName || "";
  const ownerLine = ownerName ? `- ${ownerName}\n` : "";
  const ownerDescriptor = ownerName ? `${ownerName}'s` : "A";
  const accounts = values.accounts
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  const manifest = {
    id: squadSlug,
    name: values.squadName,
    description: `${ownerDescriptor} Scout squad for ${values.focus}`,
    timeoutSeconds: 300,
    members: selected.map((m) => ({ name: m.id, displayName: m.name }))
  };

  const scribeDirective = hasScribe
    ? "- Trigger Scribe closeout with a revision-bound run receipt after each dispatched run. Routine logging may run in the background, but verify its read-back before claiming closeout is complete."
    : "- Record closeout yourself after each dispatched run, including the reviewed revision and any verification limits; no Scribe is required.";

  const skillName = normalizedSkillName(values.skillName);
  const slashSkill = `/${skillName}`;

  const squadLead = `---
name: Squad Lead
description: "Coordinator for ${values.squadName}. Routes work to the right specialist(s) and synthesizes one response."
---

You are Squad Lead for ${ownerName || "this team"} (${values.ownerRole}).

TEAM_ROOT = <SET_TEAM_ROOT_TO_LOCAL_FOLDER>

Core directives:
- Read \${TEAM_ROOT}\\.squad\\context.md first for package briefing and source-of-truth mapping.
- Read \${TEAM_ROOT}\\.squad\\rules.md and apply its answer-preservation, evidence, approval and review standards.
- Route substantive work to the best available specialist(s) from \${TEAM_ROOT}\\.squad\\team.md using real agent/tool calls, not simulated member perspectives. Disclose unavailable capabilities instead of inventing a dispatch or review.
- For simple questions already answerable from loaded context, respond directly without a full fan-out. Scale review to the stakes and use only relevant members.
- Treat systems-of-record actions as draft-only unless user explicitly performs final submit.
- Ask one concise clarifying question when a missing fact or conflict would materially change the answer or authorized scope. Otherwise state necessary assumptions and continue supported work.
- For multi-domain requests, fan out independent work in parallel and return one concise synthesis.
- Preserve the user's original request unchanged in every substantive dispatch. Put the following concise contract before role or recovery context, then include the original request and the member's specific assignment. Derive the contract from the request; do not substitute a different task.

ARTIFACT: exact requested output
FORMAT: requested response or file format
SCOPE: included work and explicit exclusions
AUDIENCE: intended user or recipient
DONE-WHEN: original questions answered at the requested depth, with specific answers or clearly identified evidence gaps

- Keep routine revisions with their original author and arrange independent re-review under the shared rules. Never treat a removed answer as successful review.
- Check usefulness against the original request, not only this contract. Recheck affected answers on the finished revision after material changes; earlier reviews do not approve later edits.
- Report factual support, format, usefulness and sharing authorization separately. A useful draft is not permission to send.
${scribeDirective}
`;

  const teamRows = selected
    .map((m) => `| ${m.name} | ${m.description} | ${m.type} |`)
    .join("\n");

  const memberSummaryLines = selected
    .map((m) => `- ${m.name} (${m.type}): ${m.description}`)
    .join("\n");

  const teamMd = `# ${values.squadName}\n\n## Owner\n\n${ownerLine}- ${values.ownerRole}\n- Focus: ${values.focus}\n- Key accounts: ${accounts.length ? accounts.join(", ") : "n/a"}\n\n## Members\n\n| Member | Responsibility | Type |\n| --- | --- | --- |\n${teamRows}\n`;

  const workingContract = `## Working contract\n\n- Objective: support ${values.ownerRole || "the owner's role"} across ${values.focus || "the selected focus areas"}.\n- Intended value: produce a concise, actionable response that advances the user's work.\n- Scope: use the selected members and routing map; do not invent missing context.\n- Evidence: distinguish sourced facts, direct observations, and hypotheses; verify completion independently.\n- Done means: the response is useful for the stated focus, evidence-aware, and clear about any approval or follow-up needed.\n- Review intensity: scale review to the stakes; routine work gets a light pass, higher-impact or outward-facing work gets deeper review.\n\n`;

  const rulesMd = `# Shared Operating Rules

${workingContract}1. Evidence tiers on factual claims: official docs, internal info, field observation, unverified hypothesis. Internal information is not automatically approved for external use.
2. Verify-before-claim: never report completion without independent read-back verification.
3. Approval boundaries: systems-of-record entries are draft/stage only; user performs final submission. Before sending or sharing externally, show the exact content and recipients and obtain explicit approval. Drafting does not authorize sending.
4. Any durable team behavior change must be captured in the decisions ledger; distinguish approved policy from a proposal.
5. Every dispatched run requires closeout and a run receipt${hasScribe ? " (Scribe preferred)." : "."}

## Preserve the requested answer

- The original request is the source of truth. An agent-authored brief or contract must not replace, narrow or reframe it. Preserve the requested artifact, format, scope, audience and depth unless the user changes them.
- Identify each original question and where the output answers it. Keep supported steps, values, conditions and examples. Related topics, headings and polished formatting are not substitutes for an answer.
- Distinguish product facts, scoped observations, professional recommendations with rationale and assumptions, and genuine unknowns. Do not turn a precise supported answer into a vague warning because a nearby fact is unknown, or present a recommendation as observed customer practice.
- Internal review bookkeeping belongs in working notes. Deliverables retain readable sources and material limitations beside the affected claims. Include governance detail when it answers the request, not simply because the team uses it.

## Targeted corrections and revision ownership

- A reviewer identifies the exact claim or passage, the evidence or boundary at issue, and the smallest correction that resolves it. Unsupported or confidential content must still be corrected or removed.
- Routine repairs stay with the original author and require independent re-review of the affected work. Fixing one's work is not approving one's work. Reassign only for an actual approval-boundary violation, fabricated evidence, or deliberate/repeated bypass; explain the reason to the user.
- If a correction removes a required answer, flag the gap to the author for targeted research or an explicit evidence-gap answer. Withhold a usefulness pass while the requested answer is missing; do not silently lower the requirement.
- If the same blocking issue remains after one focused repair and re-review, report it and the smallest needed user decision rather than cycling authors or adding review rounds.

## Proportional review on the final revision

- Choose relevant available members by responsibility, not a mandatory roster. For work warranting independent review, if no independent reviewer is available, disclose that limit, self-check the draft and request user review; never claim independent approval. Simple direct answers do not require a full-team ceremony or user sign-off.
- For substantial deliverables, check one representative answer against the requested purpose before scaling unless the user asked for a full draft immediately. Reduce volume, not the requested format, scope or audience.
- Check usefulness against the original questions, not just the generated contract or the author's coverage claims. Recheck affected answers and verdicts after material changes, using the actual finished revision.
- Record applicable results separately: Source-safe (supported claims and explicit gaps); Format-valid (opened/rendered in the intended format); Useful (answers the actual request without major rewriting); Approved to share (explicit authorization for the intended action). A factual or format pass does not establish usefulness. Draft work can be finished without permission to share.
- Bind reviews to the artifact path and revision identifier or hash. A review of an earlier draft does not approve a changed artifact. An incomplete or unrendered check remains unverified, not a pass.
- Keep receipts concise. Mark pending work interim/incomplete and update it after required checks. Distinguish artifact readiness from logging/closeout; do not claim evidence writes are complete before their read-back.
`;

  const routingLines = selected
    .map((m) => `- ${m.name} (${m.type}): ${m.description}`)
    .join("\n");

  const routingMd = `# Routing\n\nUse Squad Lead for ambiguous or multi-domain requests. Simple direct questions can stay with the requested member.\n\n## Member map\n${routingLines}\n\nSelect an author and, when warranted, an independent reviewer from available members whose responsibilities fit the request. Use the shared rules for answer preservation and targeted repairs; do not invent missing members or require a fixed roster. If independent review is unavailable, disclose the limit and request user review.\n\nWhen customer-facing, include compliance review when a Compliance Officer role is present. Keep factual support, usefulness and sharing permission separate; compliance is not a substitute for answering the question.\n`;

  const contextMd = `# Context Contract\n\nThis file is the fast-start briefing for this generated squad package.\n\n## Source of truth\n\n- Canonical runtime rules: .squad/rules.md\n- Member definitions and role intent: .squad/team.md\n- Routing guidance: .squad/routing.md\n- Coordinator behavior: .github/agents/squad.agent.md\n- Durable decisions: .squad/decisions.md\n\n## Package profile\n\n- Squad name: ${values.squadName}\n- Owner role: ${values.ownerRole}\n- Focus: ${values.focus}\n- Key accounts: ${accounts.length ? accounts.join(", ") : "n/a"}\n- Scribe present: ${hasScribe ? "yes" : "no"}\n\n## Member summary\n\n${memberSummaryLines}\n\n## Operating notes\n\n- This file is a briefing index, not a replacement for the source-of-truth files above.\n- If instructions conflict, follow source-of-truth files in the listed order and ask one concise clarification question when needed.\n`;

  const skillSpecMd = `# ${slashSkill} Skill Wrapper Spec\n\n## Name\n\n${slashSkill}\n\n## Purpose\n\nLoad this squad context from TEAM_ROOT and route work through Squad Lead for one consolidated response.\n\n## Required sources\n\n- \${TEAM_ROOT}\\manifest.json\n- \${TEAM_ROOT}\\.github\\agents\\squad.agent.md\n- \${TEAM_ROOT}\\.squad\\context.md\n- \${TEAM_ROOT}\\.squad\\team.md\n- \${TEAM_ROOT}\\.squad\\routing.md\n- \${TEAM_ROOT}\\.squad\\rules.md\n- \${TEAM_ROOT}\\.squad\\decisions.md\n\n## Behavior\n\n1. Load the latest required sources from TEAM_ROOT on each invocation.\n2. Pass the original request unchanged to Squad Lead; follow its contract, real-dispatch and proportional-review instructions.\n3. Return one consolidated response that answers the original questions, with material gaps and review limits stated plainly.\n4. Ask one concise clarification when missing context or conflicts materially change the answer or authorized scope; otherwise state necessary assumptions and proceed.\n\n## Collision policy\n\nIf ${slashSkill} already exists, ask before overwrite.\n\n## Post-install smoke test\n\n- Confirm required sources exist under TEAM_ROOT.\n- Confirm no <SET_TEAM_ROOT_TO_LOCAL_FOLDER> placeholders remain.\n- Confirm ${slashSkill} resolves to this wrapper and returns a harmless routing test response.\n`;

  const decisionsMd = `# Decisions Ledger\n\n## ${new Date().toISOString().slice(0, 10)} - Initial scaffold\n\n- Generated from Scout Squad Builder.\n${ownerName ? `- Owner: ${ownerName}.\n` : ""}- Focus: ${values.focus}.\n`;

  const readme = `# ${values.squadName}\n\nGenerated squad package${ownerName ? ` for ${ownerName}` : ""}.\n\nThis package was generated by a community tool. It is not an official Microsoft product and is not affiliated with or endorsed by Microsoft.\n\nFor canonical platform guidance, validate against official documentation.\n\n## Official docs\n\n### Official documentation\n\n- https://learn.microsoft.com/en-us/microsoft-scout/\n- https://learn.microsoft.com/en-us/microsoft-scout/overview\n\n### Community and ecosystem references\n\n- https://devblogs.microsoft.com/agent-framework/building-agent-teams-with-agent-framework-github-copilot-cli-and-squad/\n- https://github.blog/ai-and-ml/github-copilot/how-squad-runs-coordinated-ai-agents-inside-your-repository/\n- https://github.com/bradygaster/squad\n\n## Working style\n\nThe generated instructions preserve the original questions and supported specifics, keep routine repairs with their author, and review usefulness separately from factual support and sharing permission. Review scales to the available team and the stakes. These are project conventions and do not guarantee model behavior.\n\nFor a behavior check, use a fresh Scout conversation with a realistic original request, not a suggested answer outline. Compare the final response with that request before judging polish; distinguish content quality from permission to send. Existing squads do not update automatically: review regenerated files and approve overwrites before replacing a customized installation.\n\n## Quick use in Scout\n\n1. Extract this zip to a local folder.\n2. In the install prompt below, edit TEAM_ROOT to the folder where you extracted the zip.\n3. In Scout, use this prompt:\n\n\`\`\`text\n${installPromptText("C:\\\\Path\\\\To\\\\This\\\\Folder", values.skillName)}\n\`\`\`\n`;

  const files = {
    "manifest.json": JSON.stringify(manifest, null, 2),
    "README.md": readme,
    ".github/agents/squad.agent.md": squadLead,
    ".squad/context.md": contextMd,
    ".squad/team.md": teamMd,
    ".squad/rules.md": rulesMd,
    ".squad/routing.md": routingMd,
    ".squad/ceremonies.md": "# Ceremonies\n\nUse these as proportional checkpoints, not mandatory extra meetings or full-team reviews for every answer.\n\n- Weekly Focus Review: when useful, review commitments, priorities and decisions.\n- Pre-send Compliance Check: before an external action, verify evidence and exact-content/recipient approval; systems-of-record submission stays with the user.\n- Post-work Verification Sweep: check the finished revision against the original request using the separate results in rules.md. After material edits, recheck the affected answers; retain the author for routine repairs. Record actual review limits and closeout state.\n",
    ".squad/decisions.md": decisionsMd,
    ".squad/decisions/inbox/.gitkeep": "",
    ".squad/log/.gitkeep": "",
    ".squad/orchestration-log/.gitkeep": "",
    ".squad/run-receipts/.gitkeep": "",
    ".squad/templates/decision-inbox-template.md": "### <timestamp>: <title>\n**By:** <member>\n**What:** <decision>\n**Why:** <rationale>\n**Approval:** <approved|proposed>\n",
    ".squad/templates/run-receipt-template.md": "**Timestamp:** <UTC>\n**Request:** <original request reference and brief summary>\n**Members:** <actual dispatches and purpose>\n**Status:** <interim|completed|incomplete>\n**Reviewed revision:** <artifact path and revision or hash>\n**Answer coverage:** <original questions answered and explicit gaps>\n**Review results:** <source-safe; format-valid; useful; approved to share; or not checked/not applicable>\n**Verification:** <verified|partial|unverified; evidence pointers and limits>\n**Closeout:** <read-back completed or remaining work>\n",
    [`skills/${skillName}.md`]: skillSpecMd,
    ".gitattributes": ".squad/decisions.md merge=union\n.squad/agents/*/history.md merge=union\n.squad/agents/compliance-officer/audit-trail.md merge=union\n.squad/log/** merge=union\n.squad/orchestration-log/** merge=union\n.squad/run-receipts/** merge=union\n"
  };

  for (const member of selected) {
    const memberName = member.name;
    const id = member.id;

    files[`.squad/agents/${id}/charter.md`] = `# ${memberName}\n\n## Role\n${memberName}${ownerName ? ` for ${ownerName}` : ""}.\n${member.description}\n\n## Guardrails\n- Read and follow .squad/rules.md, including answer-preservation and revision ownership.\n- Stay in role and preserve the original request and deliverable contract.\n- Keep outputs concise, specific and useful; state genuine gaps without replacing supported answers with generic caveats.\n- When reviewing, identify the exact defect and minimal correction; do not claim an independent review of your own work.\n`;

    files[`.squad/agents/${id}/history.md`] = `# ${memberName} - History\n\n## Core Context\n\n${ownerName ? `- Owner: ${ownerName}\n` : ""}- Focus: ${values.focus}\n`;

    if (id !== "scribe") {
      files[`standalone-agents/${id}.agent.md`] = `---\nname: ${memberName}\ndescription: "${memberName} for ${values.squadName}."\n---\n\nYou are ${memberName}${ownerName ? ` for ${ownerName}` : ""}.\n\nTEAM_ROOT = <SET_TEAM_ROOT_TO_LOCAL_FOLDER>\n\nBefore responding, read:\n- \${TEAM_ROOT}\\.squad\\context.md\n- \${TEAM_ROOT}\\.squad\\agents\\${id}\\charter.md\n- \${TEAM_ROOT}\\.squad\\rules.md\n- \${TEAM_ROOT}\\.squad\\decisions.md\n- \${TEAM_ROOT}\\.squad\\agents\\${id}\\history.md\n\nApply the shared answer-preservation rules to direct requests as well as coordinated work. Simple direct answers do not require routing through the whole squad. Use the shared rules' fallback when independent review is unavailable.\n\nIf a durable team decision emerges, write a drop file to \${TEAM_ROOT}\\.squad\\decisions\\inbox\\ and notify the user.\n`;
    }
  }

  return { files, squadSlug };
}

form.addEventListener("input", refreshPromptPreview);

skillNameInputEl.addEventListener("blur", () => {
  skillNameInputEl.value = normalizedSkillName(skillNameInputEl.value);
  refreshPromptPreview();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const values = collectValues();
  skillNameInputEl.value = values.skillName;
  if (!values.squadName || !values.ownerRole || !values.focus) {
    alert("Please fill in squad name, role, and focus.");
    return;
  }
  const invalidRows = validateMembers(values.members);
  if (invalidRows.length) {
    invalidMemberReasons = new Map(invalidRows.map((x) => [x.id, x.reasons]));
    renderMemberRows();
    syncValidationMessageFromState();
    applyValidationUiState();

    const firstInvalidId = invalidRows[0].id;
    const firstInvalidInput = memberRowsEl.querySelector(`tr[data-member-id="${firstInvalidId}"] .member-cell-input`);
    if (firstInvalidInput) {
      firstInvalidInput.focus();
    }
    return;
  }

  invalidMemberReasons = new Map();
  syncValidationMessageFromState();
  applyValidationUiState();

  if (!values.members.length) {
    alert("Add at least one member role.");
    return;
  }

  const nonScribeMembers = values.members.filter((m) => m.id !== "scribe");
  if (!nonScribeMembers.length) {
    alert("Keep at least one non-Scribe member role for useful routing coverage.");
    return;
  }

  const { files, squadSlug } = buildFiles(values);
  const zip = new JSZip();

  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${squadSlug || "scout-squad"}.zip`;
  a.click();
  URL.revokeObjectURL(url);
});

presetSelect.addEventListener("change", () => {
  const selected = activePresets.find((x) => x.id === presetSelect.value);
  applyPreset(selected);
  refreshPromptPreview();
});

copyPromptButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(promptBox.value);
    copyPromptButton.textContent = "Copied";
    setTimeout(() => {
      copyPromptButton.textContent = "Copy prompt";
    }, 1200);
  } catch {
    copyPromptButton.textContent = "Copy failed";
    setTimeout(() => {
      copyPromptButton.textContent = "Copy prompt";
    }, 1200);
  }
});

addMemberButton.addEventListener("click", () => {
  const name = newMemberName.value.trim();
  const description = newMemberDescription.value.trim();

  if (!name || !description) {
    alert("Add both a role name and responsibility summary.");
    return;
  }

  memberRowsState.push({
    id: createUniqueMemberId(name),
    name,
    description,
    type: "custom"
  });

  invalidMemberReasons = new Map();
  newMemberName.value = "";
  newMemberDescription.value = "";
  renderMemberRows();
  renderCatalogOptions();
  syncValidationMessageFromState();
  applyValidationUiState();
  refreshPromptPreview();
});

addCatalogMemberButton.addEventListener("click", () => {
  const selectedMember = memberCatalog.find((member) => member.id === catalogMemberSelect.value);
  if (!selectedMember) {
    alert("Choose a catalog role first.");
    return;
  }

  memberRowsState.push({ ...selectedMember });
  catalogMemberSelect.value = "";
  renderMemberRows();
  renderCatalogOptions();
  refreshPromptPreview();
});

async function initializePresets() {
  activePresets = await loadPresets();
  renderPresetOptions(activePresets);

  if (activePresets.length) {
    applyPreset(activePresets[0]);
  }

  renderMemberRows();
  renderCatalogOptions();
  refreshPromptPreview();
}

initializePresets();
