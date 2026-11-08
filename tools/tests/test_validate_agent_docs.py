"""Unit tests for the repository's ODD and continuity documentation validator."""
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "validate-agent-docs.py"
SPEC = spec_from_file_location("validate_agent_docs", SCRIPT)
VALIDATOR = module_from_spec(SPEC)
SPEC.loader.exec_module(VALIDATOR)


class ValidateAgentDocsTests(unittest.TestCase):
    def make_repository(self, root: Path) -> None:
        for relative in VALIDATOR.REQUIRED_FILES:
            path = root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("", encoding="utf-8")

        (root / "odd/TASK_TEMPLATE.md").write_text(
            "\n".join(VALIDATOR.REQUIRED_TEMPLATE_HEADINGS), encoding="utf-8"
        )
        for relative, phrases in VALIDATOR.REQUIRED_CONTENT.items():
            (root / relative).write_text("\n".join(phrases), encoding="utf-8")

        # A real relative link must resolve from the contract's directory.
        contract = root / "odd/tasks/ai-continuity-and-evidence-contract.md"
        contract.write_text(
            "[ADR template](../../docs/decisions/ADR_TEMPLATE.md)\n"
            + contract.read_text(encoding="utf-8"),
            encoding="utf-8",
        )

        agent = root / ".github/agents/test.agent.md"
        agent.parent.mkdir(parents=True, exist_ok=True)
        agent.write_text("---\nname: test\ndescription: test profile\n---\n", encoding="utf-8")

    def test_valid_contract_and_local_link_pass(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.make_repository(root)
            self.assertEqual([], VALIDATOR.validate(root))

    def test_missing_contract_reference_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.make_repository(root)
            agents = root / "AGENTS.md"
            agents.write_text("missing references", encoding="utf-8")
            errors = VALIDATOR.validate(root)
            self.assertTrue(any("AGENTS.md" in error for error in errors))

    def test_broken_local_link_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.make_repository(root)
            (root / "docs/decisions/ADR_TEMPLATE.md").unlink()
            errors = VALIDATOR.validate(root)
            self.assertTrue(any("broken local Markdown link" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
