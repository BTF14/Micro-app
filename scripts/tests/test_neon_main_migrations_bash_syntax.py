from pathlib import Path
import subprocess
import unittest


class NeonMainMigrationsBashSyntaxTests(unittest.TestCase):
    def test_every_multiline_run_block_is_valid_bash(self):
        workflow_path = Path(__file__).resolve().parents[2] / ".github" / "workflows" / "neon-main-migrations.yml"
        lines = workflow_path.read_text(encoding="utf-8").splitlines()
        blocks = []

        for index, line in enumerate(lines):
            if line != "        run: |":
                continue

            block_lines = []
            for candidate in lines[index + 1:]:
                if not candidate.strip():
                    block_lines.append("")
                elif candidate.startswith("          "):
                    block_lines.append(candidate[10:])
                else:
                    break

            while block_lines and not block_lines[-1]:
                block_lines.pop()
            blocks.append("\n".join(block_lines) + "\n")

        self.assertTrue(blocks, "No multiline run blocks found in neon-main-migrations.yml")
        self.assertIn(
            'for required in 0019 0022 0023 0024 0025; do',
            "\n".join(blocks),
            "The extracted Bash block did not include the complete migration validation section",
        )

        for index, script in enumerate(blocks, start=1):
            result = subprocess.run(
                ["bash", "-n"],
                input=script,
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertEqual(
                result.returncode,
                0,
                f"Bash syntax error in extracted workflow run block #{index}:\n{result.stderr}",
            )


if __name__ == "__main__":
    unittest.main()
