#!/usr/bin/env python3
"""Validate the repository's ODD task template and agent profiles."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
REQUIRED_FILES = [
    "docs/ODD_WORKFLOW.md",
    "odd/TASK_TEMPLATE.md",
    "odd/tasks/agent-governance-odd-adoption.md",
]
REQUIRED_TEMPLATE_HEADINGS = [
    "# ODD task: [feature or workstream]",
    "## Objective and authorization",
    "## Scope and exclusions",
    "## Acceptance criteria",
    "## Risks and guardrails",
    "## Tasks and evidence",
    "## Closure and handoff",
]
errors = []
for relative in REQUIRED_FILES:
    if not (ROOT / relative).is_file():
        errors.append(f"Missing required file: {relative}")

template = ROOT / "odd/TASK_TEMPLATE.md"
if template.is_file():
    content = template.read_text(encoding="utf-8")
    for heading in REQUIRED_TEMPLATE_HEADINGS:
        if heading not in content:
            errors.append(f"odd/TASK_TEMPLATE.md: missing heading {heading!r}")

agent_dir = ROOT / ".github" / "agents"
for path in sorted(agent_dir.glob("*.agent.md")):
    content = path.read_text(encoding="utf-8")
    if not content.startswith("---\\n"):
        errors.append(f"{path.relative_to(ROOT)}: missing YAML front matter")
        continue
    frontmatter = content.split("---", 2)[1]
    if not re.search(r"(?m)^name:\\s*\\S+", frontmatter):
        errors.append(f"{path.relative_to(ROOT)}: missing agent name")
    if not re.search(r"(?m)^description:\\s*\\S+", frontmatter):
        errors.append(f"{path.relative_to(ROOT)}: missing agent description")

if errors:
    print("\\n".join(f"ERROR: {error}" for error in errors))
    sys.exit(1)

print(
    f"ODD documentation validation passed; {len(REQUIRED_FILES)} required artifacts "
    f"and {len(list(agent_dir.glob('*.agent.md')))} agent profiles checked."
)
