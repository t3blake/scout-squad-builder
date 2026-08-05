const memberCatalog = [
  { id: "account-manager", name: "Account Manager", description: "Account history, stakeholder maps, and handoff packages." },
  { id: "operations-manager", name: "Operations Manager", description: "MSX/MSXi hygiene, milestones, and follow-up readiness." },
  { id: "product-researcher", name: "Product Researcher", description: "Product facts, roadmap checks, and customer-safe framing." },
  { id: "scrum-master", name: "Scrum Master", description: "Commitments, priorities, and follow-up tracking." },
  { id: "innovation-lead", name: "Innovation Lead", description: "Demos, labs, prototypes, and technical experiments." },
  { id: "content-strategist", name: "Content Strategist", description: "Workshops, decks, messaging, and content packaging." },
  { id: "strategic-advisor", name: "Strategic Advisor", description: "Pressure-tests assumptions, risks, and tradeoffs." },
  { id: "audit-manager", name: "Audit Manager", description: "Fact-checks claims, sources, and evidence quality." },
  { id: "compliance-officer", name: "Compliance Officer", description: "Enforces approval boundaries and verify-before-claim." },
  { id: "skilling-coordinator", name: "Skilling Coordinator", description: "Tracks skilling backlog and Friday topic ideas." }
];

const form = document.getElementById("builderForm");
const memberContainer = document.getElementById("members");
const promptBox = document.getElementById("installPrompt");
const presetSelect = document.getElementById("presetSelect");
const copyPromptButton = document.getElementById("copyPromptButton");

const builtinPresets = [
  {
    id: "knowledge-worker",
    label: "Knowledge Worker",
    squadName: "Knowledge Worker Productivity Squad",
    ownerRole: "Knowledge Worker",
    focus: "Meeting action capture, document synthesis, follow-up tracking, and weekly planning",
    accounts: "Internal projects, team stakeholders",
    tone: "Concise, practical, and execution-focused."
  },
  {
    id: "it-support-technician",
    label: "IT Support Technician",
    squadName: "IT Support Operations Squad",
    ownerRole: "IT Support Technician",
    focus: "Ticket triage, knowledge lookup, incident follow-up, and escalation drafting",
    accounts: "Service desk, endpoint operations, platform teams",
    tone: "Clear, calm, and diagnostic-first with explicit verification steps."
  },
  {
    id: "project-manager",
    label: "Project Manager",
    squadName: "Project Delivery Squad",
    ownerRole: "Project Manager",
    focus: "Milestone tracking, risk review, stakeholder update drafting, and status rollups",
    accounts: "Program stakeholders, delivery teams",
    tone: "Structured, timeline-aware, and risk-explicit."
  },
  {
    id: "sales-account-coordinator",
    label: "Sales / Account Coordinator",
    squadName: "Account Coordination Squad",
    ownerRole: "Sales and Account Coordinator",
    focus: "Meeting prep, account notes, follow-up sequencing, and customer-safe message drafting",
    accounts: "Customer accounts, partner stakeholders",
    tone: "Customer-aware, concise, and commercially practical."
  }
];

for (const member of memberCatalog) {
  const wrapper = document.createElement("label");
  wrapper.className = "chip";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.name = "members";
  input.value = member.id;
  input.checked = true;

  wrapper.append(input, ` ${member.name}`);
  memberContainer.appendChild(wrapper);
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function selectedMembers() {
  return [...document.querySelectorAll('input[name="members"]:checked')].map((x) => x.value);
}

function displayNameFor(id) {
  const member = memberCatalog.find((x) => x.id === id);
  return member ? member.name : id;
}

function installPromptText(teamRoot) {
  return [
    `Install this squad from ${teamRoot}.`,
    "Use manifest.json and .github/agents/squad.agent.md as the coordinator source.",
    "Install standalone-agents/*.agent.md as user-level custom agents.",
    "Use the local folder as TEAM_ROOT.",
    "Then route work through Squad Lead and return one consolidated response."
  ].join("\n");
}

function safePresetList(payload) {
  if (!payload || !Array.isArray(payload.presets)) {
    return builtinPresets;
  }

  const valid = payload.presets.filter((x) =>
    x && x.id && x.label && x.squadName && x.ownerRole && x.focus && x.accounts && x.tone
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

function applyPreset(preset) {
  if (!preset) {
    return;
  }

  form.elements.squadName.value = preset.squadName;
  form.elements.ownerRole.value = preset.ownerRole;
  form.elements.focus.value = preset.focus;
  form.elements.accounts.value = preset.accounts;
  form.elements.tone.value = preset.tone;
}

function buildFiles(values) {
  const squadSlug = slugify(values.squadName);
  const selected = values.members;
  const memberSet = [...selected, "scribe"];
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
    members: memberSet.map((id) => ({ name: id, displayName: displayNameFor(id) }))
  };

  const squadLead = `---
name: Squad Lead
description: "Coordinator for ${values.squadName}. Routes work to the right specialist(s) and synthesizes one response."
---

You are Squad Lead for ${ownerName || "this team"} (${values.ownerRole}).

TEAM_ROOT = <SET_TEAM_ROOT_TO_LOCAL_FOLDER>

Core directives:
- Route work to the best specialist(s) from .squad/team.md.
- Enforce evidence tiers and verify-before-claim from .squad/rules.md.
- Treat systems-of-record actions as draft-only unless user explicitly performs final submit.
- For multi-domain requests, fan out in parallel and return one concise synthesis.
- Trigger Scribe closeout with run receipt after each dispatched run.
`;

  const teamRows = selected
    .map((id) => {
      const m = memberCatalog.find((x) => x.id === id);
      return `| ${m.name} | ${m.description} |`;
    })
    .join("\n");

  const teamMd = `# ${values.squadName}\n\n## Owner\n\n${ownerLine}- ${values.ownerRole}\n- Focus: ${values.focus}\n- Key accounts: ${accounts.length ? accounts.join(", ") : "n/a"}\n\n## Members\n\n| Member | Responsibility |\n| --- | --- |\n${teamRows}\n| Scribe | Silent closeout, receipts, and durable memory merge. |\n`;

  const rulesMd = `# Shared Operating Rules\n\n1. Evidence tiers on factual claims: official docs, internal info, field observation, unverified hypothesis.\n2. Verify-before-claim: never report completion without independent read-back verification.\n3. Approval boundaries: systems-of-record entries are draft/stage only; user performs final submission.\n4. Any durable team behavior change must be captured in decisions ledger.\n5. Every dispatched run requires Scribe closeout and a run receipt.\n`;

  const routingLines = selected
    .map((id) => {
      const m = memberCatalog.find((x) => x.id === id);
      return `- ${m.name}: ${m.description}`;
    })
    .join("\n");

  const routingMd = `# Routing\n\nUse Squad Lead for ambiguous or multi-domain requests.\n\n## Member map\n${routingLines}\n\nAlways include Audit Manager + Compliance Officer on customer-facing output.\n`;

  const decisionsMd = `# Decisions Ledger\n\n## ${new Date().toISOString().slice(0, 10)} - Initial scaffold\n\n- Generated from Scout Squad Zip Builder.\n${ownerName ? `- Owner: ${ownerName}.\n` : ""}- Focus: ${values.focus}.\n`;

  const readme = `# ${values.squadName}\n\nGenerated squad package${ownerName ? ` for ${ownerName}` : ""}.\n\nThis package was generated by a community tool. It is not an official Microsoft product and is not affiliated with or endorsed by Microsoft.\n\nFor canonical platform guidance, validate against official documentation.\n\n## Official docs\n\n- https://learn.microsoft.com/microsoft-365/copilot/\n- https://learn.microsoft.com/microsoft-copilot-studio/\n- https://learn.microsoft.com/\n\n## Quick use in Scout\n\n1. Extract this zip to a local folder.\n2. Set TEAM_ROOT references using scripts/set-team-root.ps1 if needed.\n3. In Scout, use this prompt:\n\n\`\`\`text\n${installPromptText("C:\\\\Path\\\\To\\\\This\\\\Folder")}\n\`\`\`\n`;

  const files = {
    "manifest.json": JSON.stringify(manifest, null, 2),
    "README.md": readme,
    ".github/agents/squad.agent.md": squadLead,
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
    "scripts/set-team-root.ps1": buildSetTeamRootScript(),
    ".gitattributes": ".squad/decisions.md merge=union\n.squad/agents/*/history.md merge=union\n.squad/agents/compliance-officer/audit-trail.md merge=union\n.squad/log/** merge=union\n.squad/orchestration-log/** merge=union\n.squad/run-receipts/** merge=union\n"
  };

  for (const id of memberSet) {
    const memberName = id === "scribe" ? "Scribe" : displayNameFor(id);

    files[`.squad/agents/${id}/charter.md`] = `# ${memberName}\n\n## Role\n${memberName}${ownerName ? ` for ${ownerName}` : ""}.\n\n## Guardrails\n- Follow .squad/rules.md\n- Stay in role\n- Keep outputs concise and verifiable\n`;

    files[`.squad/agents/${id}/history.md`] = `# ${memberName} - History\n\n## Core Context\n\n${ownerName ? `- Owner: ${ownerName}\n` : ""}- Focus: ${values.focus}\n`;

    if (id !== "scribe") {
      files[`standalone-agents/${id}.agent.md`] = `---\nname: ${memberName}\ndescription: "${memberName} for ${values.squadName}."\n---\n\nYou are ${memberName}${ownerName ? ` for ${ownerName}` : ""}.\n\nBefore responding, read:\n- .squad/agents/${id}/charter.md\n- .squad/rules.md\n- .squad/decisions.md\n- .squad/agents/${id}/history.md\n\nIf a durable team decision emerges, write a drop file to .squad/decisions/inbox/ and notify the user.\n`;
    }
  }

  return { files, squadSlug };
}

function buildSetTeamRootScript() {
  return `param(\n    [Parameter(Mandatory = $true)]\n    [string]$TeamRoot\n)\n\n$repoRoot = Split-Path -Parent $PSScriptRoot\n$files = @(\n    (Join-Path $repoRoot ".github/agents/squad.agent.md")\n) + (Get-ChildItem (Join-Path $repoRoot "standalone-agents") -Filter "*.agent.md" | ForEach-Object { $_.FullName })\n\nforeach ($file in $files) {\n    $content = Get-Content -Raw -Path $file\n    $updated = $content -replace "<SET_TEAM_ROOT_TO_LOCAL_FOLDER>", $TeamRoot\n    if ($updated -ne $content) {\n        Set-Content -Path $file -Value $updated -NoNewline\n        Write-Host "Updated: $file"\n    }\n}\n\nWrite-Host "Done. Restart Scout/Copilot CLI after install."\n`;
}

function collectValues() {
  const fd = new FormData(form);
  return {
    squadName: (fd.get("squadName") || "").toString().trim(),
    ownerName: (fd.get("ownerName") || "").toString().trim(),
    ownerRole: (fd.get("ownerRole") || "").toString().trim(),
    focus: (fd.get("focus") || "").toString().trim(),
    accounts: (fd.get("accounts") || "").toString().trim(),
    tone: (fd.get("tone") || "").toString().trim(),
    members: selectedMembers()
  };
}

function refreshPromptPreview() {
  const values = collectValues();
  const folder = `C:\\Path\\To\\${values.squadName || "Squad"}`;
  promptBox.value = installPromptText(folder);
}

form.addEventListener("input", refreshPromptPreview);

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const values = collectValues();
  if (!values.squadName || !values.ownerRole || !values.focus) {
    alert("Please fill in squad name, role, and focus.");
    return;
  }

  if (!values.members.length) {
    alert("Select at least one member.");
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

refreshPromptPreview();

let activePresets = [];

async function initializePresets() {
  activePresets = await loadPresets();
  renderPresetOptions(activePresets);

  if (activePresets.length) {
    applyPreset(activePresets[0]);
  }

  refreshPromptPreview();
}

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

initializePresets();
