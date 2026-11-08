#!/usr/bin/env python3
"""Validate ODD task structure, cross-agent continuity contract and local links."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = [
    "AGENTS.md",
    "docs/CONSTITUTION.md",
    "docs/AI_COLLABORATION_AND_PR_POLICY.md",
    "docs/ODD_WORKFLOW.md",
    "docs/decisions/ADR_TEMPLATE.md",
    "odd/TASK_TEMPLATE.md",
    "odd/tasks/agent-governance-odd-adoption.md",
    "odd/tasks/ai-continuity-and-evidence-contract.md",
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

REQUIRED_CONTENT = {
    "docs/CONSTITUTION.md": [
        "contrato de continuidad, decisiones y evidencia",
        "odd/tasks/ai-continuity-and-evidence-contract.md",
    ],
    "AGENTS.md": [
        "odd/tasks/ai-continuity-and-evidence-contract.md",
        "docs/decisions/",
        "GitHub vivo",
    ],
    "docs/ODD_WORKFLOW.md": [
        "contrato de continuidad y evidencia",
        "handoff reproducible",
        "ADR",
    ],
    "docs/AI_COLLABORATION_AND_PR_POLICY.md": [
        "odd/tasks/ai-continuity-and-evidence-contract.md",
        "SHA exacto",
        "docs/decisions/",
    ],
    "odd/tasks/ai-continuity-and-evidence-contract.md": [
        "## Contrato obligatorio de inicio",
        "## Contrato obligatorio de cierre y handoff",
        "## Registro de decisiones",
        "## Evidencia y prevención de regresiones",
        "## Criterios de aceptación",
        "## Fuera de alcance",
        "../../docs/decisions/ADR_TEMPLATE.md",
    ],
    "docs/decisions/ADR_TEMPLATE.md": [
        "# ADR —",
        "## Contexto y problema",
        "## Decisión",
        "## Alternativas consideradas",
        "## Consecuencias y riesgos",
        "## Reversión o sustitución",
        "## Evidencia",
    ],
}

LINK_SOURCES = [
    "odd/tasks/ai-continuity-and-evidence-contract.md",
    "docs/decisions/ADR_TEMPLATE.md",
]
LINK_PATTERN = re.compile(r"(?<!!)\[[^\]]*\]\(([^)]+)\)")


def validate(root: Path = ROOT) -> list[str]:
    """Return actionable validation errors for the supplied repository root."""
    errors = []
    for relative in REQUIRED_FILES:
        if not (root / relative).is_file():
            errors.append(f"Missing required file: {relative}")

    template = root / "odd/TASK_TEMPLATE.md"
    if template.is_file():
        content = template.read_text(encoding="utf-8")
        for heading in REQUIRED_TEMPLATE_HEADINGS:
            if heading not in content:
                errors.append(f"odd/TASK_TEMPLATE.md: missing heading {heading!r}")

    for relative, required in REQUIRED_CONTENT.items():
        path = root / relative
        if not path.is_file():
            continue
        content = path.read_text(encoding="utf-8")
        for phrase in required:
            if phrase not in content:
                errors.append(f"{relative}: missing required contract text {phrase!r}")

    # Check local links in the new contract and shared ADR template only.
    # External URLs, mailto links, and same-document anchors are skipped.
    for relative in LINK_SOURCES:
        source = root / relative
        if not source.is_file():
            continue
        for target in LINK_PATTERN.findall(source.read_text(encoding="utf-8")):
            target = target.strip().split()[0].strip("<>")
            if not target or target.startswith(("#", "https://", "http://", "mailto:")):
                continue
            local_target = (source.parent / target.split("#", 1)[0]).resolve()
            if not local_target.is_file():
                errors.append(f"{relative}: broken local Markdown link {target!r}")

    agent_dir = root / ".github" / "agents"
    for path in sorted(agent_dir.glob("*.agent.md")):
        content = path.read_text(encoding="utf-8")
        if not content.startswith("---" + chr(10)):
            errors.append(f"{path.relative_to(root)}: missing YAML front matter")
            continue
        frontmatter = content.split("---", 2)[1]
        fields = {
            line.split(":", 1)[0].strip()
            for line in frontmatter.splitlines()
            if ":" in line
        }
        if "name" not in fields:
            errors.append(f"{path.relative_to(root)}: missing agent name")
        if "description" not in fields:
            errors.append(f"{path.relative_to(root)}: missing agent description")

    return errors


def main() -> int:
    errors = validate()
    if errors:
        print(*[f"ERROR: {error}" for error in errors], sep=chr(10))
        return 1

    agent_dir = ROOT / ".github" / "agents"
    agent_count = len(list(agent_dir.glob("*.agent.md")))
    print(
        "ODD and continuity validation passed; "
        f"{len(REQUIRED_FILES)} required artifacts, "
        f"{len(REQUIRED_CONTENT)} contract sections, local links, "
        f"and {agent_count} agent profiles checked."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
