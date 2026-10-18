#!/usr/bin/env python3
"""Validate the repository's host-agnostic SDD templates and agent profiles."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
REQUIRED_FILES = [
    "docs/SDD_WORKFLOW.md",
    "templates/sdd/spec.md",
    "templates/sdd/plan.md",
    "templates/sdd/tasks.md",
    "skills/feature-sdd/SKILL.md",
]
REQUIRED_TEMPLATE_HEADINGS = {
    "templates/sdd/spec.md": ["## Problema y objetivo", "## Criterios de aceptación verificables"],
    "templates/sdd/plan.md": ["## Secuencia de implementación", "## Pruebas", "## Reversión y compatibilidad"],
    "templates/sdd/tasks.md": ["## Tareas", "## Revisión independiente", "## Cierre"],
}
errors = []
for relative in REQUIRED_FILES:
    if not (ROOT / relative).is_file():
        errors.append(f"Missing required file: {relative}")

for relative, headings in REQUIRED_TEMPLATE_HEADINGS.items():
    path = ROOT / relative
    if not path.is_file():
        continue
    text = path.read_text(encoding="utf-8")
    for heading in headings:
        if heading not in text:
            errors.append(f"{relative}: missing heading {heading!r}")

agent_dir = ROOT / ".github" / "agents"
for path in sorted(agent_dir.glob("*.agent.md")):
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        errors.append(f"{path.relative_to(ROOT)}: missing YAML front matter")
        continue
    frontmatter = text.split("---", 2)[1]
    if not re.search(r"(?m)^name:\s*\S+", frontmatter):
        errors.append(f"{path.relative_to(ROOT)}: missing agent name")
    if not re.search(r"(?m)^description:\s*\S+", frontmatter):
        errors.append(f"{path.relative_to(ROOT)}: missing agent description")

if errors:
    print("\n".join(f"ERROR: {error}" for error in errors))
    sys.exit(1)

print(f"SDD documentation validation passed; {len(REQUIRED_FILES)} required artifacts and {len(list(agent_dir.glob('*.agent.md')))} agent profiles checked.")
