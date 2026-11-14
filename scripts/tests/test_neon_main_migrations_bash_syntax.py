from pathlib import Path
import re
import subprocess
import textwrap
import unittest


class NeonMainMigrationsBashSyntaxTests(unittest.TestCase):
    def test_every_multiline_run_block_is_valid_bash(self):
        workflow_path = Path(__file__).resolve().parents[2] / ".github" / "workflows" / "neon-main-migrations.yml"
        workflow = workflow_path.read_text(encoding="utf-8")
        blocks = re.findall(
            r"(?m)^        run: \|\n((?:^          .*?(?:\n|$))*)",
            workflow,
        )
        self.assertTrue(blocks, "No multiline run blocks found in neon-main-migrations.yml")

        for index, block in enumerate(blocks, start=1):
            script = textwrap.dedent(block)
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
