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
    ? "- Trigger Scribe closeout with run receipt after each dispatched run."
    : "- Run closeout and verification explicitly in each response (Scribe removed).";

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
- Route work to the best specialist(s) from \${TEAM_ROOT}\\.squad\\team.md.
- Enforce evidence tiers and verify-before-claim from \${TEAM_ROOT}\\.squad\\rules.md.
- Treat systems-of-record actions as draft-only unless user explicitly performs final submit.
- If required context is missing or instructions conflict, ask one concise clarifying question before dispatching.
- For multi-domain requests, fan out in parallel and return one concise synthesis.
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

  const rulesMd = `# Shared Operating Rules\n\n${workingContract}1. Evidence tiers on factual claims: official docs, internal info, field observation, unverified hypothesis.\n2. Verify-before-claim: never report completion without independent read-back verification.\n3. Value gate: usefulness is a separate requirement from source safety; shape the response around the user's intended outcome.\n4. Review gate: distinguish source-safe, useful, and ready-to-share judgments; do not let review erase the central recommendation.\n5. Approval boundaries: systems-of-record entries are draft/stage only; user performs final submission.\n6. Any durable team behavior change must be captured in decisions ledger.\n7. Every dispatched run requires closeout and a run receipt${hasScribe ? " (Scribe preferred)." : "."}\n`;

  const routingLines = selected
    .map((m) => `- ${m.name} (${m.type}): ${m.description}`)
    .join("\n");

  const routingMd = `# Routing\n\nUse Squad Lead for ambiguous or multi-domain requests.\n\n## Member map\n${routingLines}\n\n## Quality routing\n\nFor substantial deliverables, align on audience, intended outcome, and definition of done before drafting. Include evidence review when factual claims matter and approval review when content leaves the user's workspace.\n\nWhen customer-facing, include compliance review when a Compliance Officer role is present.\n`;

  const contextMd = `# Context Contract\n\nThis file is the fast-start briefing for this generated squad package.\n\n## Source of truth\n\n- Canonical runtime rules: .squad/rules.md\n- Member definitions and role intent: .squad/team.md\n- Routing guidance: .squad/routing.md\n- Coordinator behavior: .github/agents/squad.agent.md\n- Durable decisions: .squad/decisions.md\n\n## Package profile\n\n- Squad name: ${values.squadName}\n- Owner role: ${values.ownerRole}\n- Focus: ${values.focus}\n- Key accounts: ${accounts.length ? accounts.join(", ") : "n/a"}\n- Scribe present: ${hasScribe ? "yes" : "no"}\n\n## Member summary\n\n${memberSummaryLines}\n\n## Operating notes\n\n- This file is a briefing index, not a replacement for the source-of-truth files above.\n- If instructions conflict, follow source-of-truth files in the listed order and ask one concise clarification question when needed.\n`;

  const skillSpecMd = `# ${slashSkill} Skill Wrapper Spec\n\n## Name\n\n${slashSkill}\n\n## Purpose\n\nLoad this squad context from TEAM_ROOT and route work through Squad Lead for one consolidated response.\n\n## Required sources\n\n- \${TEAM_ROOT}\\manifest.json\n- \${TEAM_ROOT}\\.github\\agents\\squad.agent.md\n- \${TEAM_ROOT}\\.squad\\context.md\n- \${TEAM_ROOT}\\.squad\\team.md\n- \${TEAM_ROOT}\\.squad\\routing.md\n- \${TEAM_ROOT}\\.squad\\rules.md\n- \${TEAM_ROOT}\\.squad\\decisions.md\n\n## Behavior\n\n1. Load required sources from TEAM_ROOT.\n2. Route the request through Squad Lead.\n3. Return one consolidated response.\n4. For conflicts or missing context, ask one concise clarification question.\n\n## Collision policy\n\nIf ${slashSkill} already exists, ask before overwrite.\n\n## Post-install smoke test\n\n- Confirm required sources exist under TEAM_ROOT.\n- Confirm no <SET_TEAM_ROOT_TO_LOCAL_FOLDER> placeholders remain.\n- Confirm ${slashSkill} resolves to this wrapper and returns a harmless routing test response.\n`;

  const decisionsMd = `# Decisions Ledger\n\n## ${new Date().toISOString().slice(0, 10)} - Initial scaffold\n\n- Generated from Scout Squad Builder.\n${ownerName ? `- Owner: ${ownerName}.\n` : ""}- Focus: ${values.focus}.\n`;

  const readme = `# ${values.squadName}\n\nGenerated squad package${ownerName ? ` for ${ownerName}` : ""}.\n\nThis package was generated by a community tool. It is not an official Microsoft product and is not affiliated with or endorsed by Microsoft.\n\nFor canonical platform guidance, validate against official documentation.\n\n## Official docs\n\n### Official documentation\n\n- https://learn.microsoft.com/en-us/microsoft-scout/\n- https://learn.microsoft.com/en-us/microsoft-scout/overview\n\n### Community and ecosystem references\n\n- https://devblogs.microsoft.com/agent-framework/building-agent-teams-with-agent-framework-github-copilot-cli-and-squad/\n- https://github.blog/ai-and-ml/github-copilot/how-squad-runs-coordinated-ai-agents-inside-your-repository/\n- https://github.com/bradygaster/squad\n\n## Quick use in Scout\n\n1. Extract this zip to a local folder.\n2. In the install prompt below, edit TEAM_ROOT to the folder where you extracted the zip.\n3. In Scout, use this prompt:\n\n\`\`\`text\n${installPromptText("C:\\\\Path\\\\To\\\\This\\\\Folder", values.skillName)}\n\`\`\`\n`;

  const files = {
    "manifest.json": JSON.stringify(manifest, null, 2),
    "README.md": readme,
    ".github/agents/squad.agent.md": squadLead,
    ".squad/context.md": contextMd,
    ".squad/team.md": teamMd,
    ".squad/rules.md": rulesMd,
    ".squad/routing.md": routingMd,
    ".squad/ceremonies.md": "# Ceremonies\n\n- Weekly Focus Review\n- Pre-send Compliance Check\n- Post-work Verification Sweep\n",
    ".squad/decisions.md": decisionsMd,
    ".squad/decisions/inbox/.gitkeep": "",
    ".squad/log/.gitkeep": "",
    ".squad/orchestration-log/.gitkeep": "",
    ".squad/run-receipts/.gitkeep": "",
    ".squad/templates/decision-inbox-template.md": "### <timestamp>: <title>\n**By:** <member>\n**What:** <decision>\n**Why:** <rationale>\n**Approval:** <approved|proposed>\n",
    ".squad/templates/run-receipt-template.md": "**Timestamp:** <UTC>\n**Request:** <summary>\n**Members:** <list>\n**Status:** <completed|incomplete>\n**Verification:** <verified|partial|unverified>\n",
    [`skills/${skillName}.md`]: skillSpecMd,
    ".gitattributes": ".squad/decisions.md merge=union\n.squad/agents/*/history.md merge=union\n.squad/agents/compliance-officer/audit-trail.md merge=union\n.squad/log/** merge=union\n.squad/orchestration-log/** merge=union\n.squad/run-receipts/** merge=union\n"
  };

  for (const member of selected) {
    const memberName = member.name;
    const id = member.id;

    files[`.squad/agents/${id}/charter.md`] = `# ${memberName}\n\n## Role\n${memberName}${ownerName ? ` for ${ownerName}` : ""}.\n\n## Guardrails\n- Follow .squad/rules.md\n- Stay in role\n- Keep outputs concise and verifiable\n`;

    files[`.squad/agents/${id}/history.md`] = `# ${memberName} - History\n\n## Core Context\n\n${ownerName ? `- Owner: ${ownerName}\n` : ""}- Focus: ${values.focus}\n`;

    if (id !== "scribe") {
      files[`standalone-agents/${id}.agent.md`] = `---\nname: ${memberName}\ndescription: "${memberName} for ${values.squadName}."\n---\n\nYou are ${memberName}${ownerName ? ` for ${ownerName}` : ""}.\n\nTEAM_ROOT = <SET_TEAM_ROOT_TO_LOCAL_FOLDER>\n\nBefore responding, read:\n- \${TEAM_ROOT}\\.squad\\context.md\n- \${TEAM_ROOT}\\.squad\\agents\\${id}\\charter.md\n- \${TEAM_ROOT}\\.squad\\rules.md\n- \${TEAM_ROOT}\\.squad\\decisions.md\n- \${TEAM_ROOT}\\.squad\\agents\\${id}\\history.md\n\nIf a durable team decision emerges, write a drop file to \${TEAM_ROOT}\\.squad\\decisions\\inbox\\ and notify the user.\n`;
    }
  }

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
