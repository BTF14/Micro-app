#!/usr/bin/env python3
"""Contract regression test for the encrypted backup restore workflow.

This intentionally uses only Python's standard library: CI already runs
scripts/tests through unittest discovery, so no YAML dependency is needed.
"""
from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / ".github" / "workflows" / "backup-real-restore.yml"
HELPER = ROOT / "scripts" / "db" / "restore_remote_backup_ephemeral.sh"

REQUIRED_HELPER_VARIABLES = (
    "BACKUP_DUMP",
    "RESTORE_ADMIN_URL",
    "RESTORE_MIGRATOR_URL",
    "RESTORE_RUNTIME_URL",
    "RESTORE_PRODUCER_URL",
    "RESTORE_DATABASE_NAME",
    "MIGRATIONS_DIR",
)


class BackupRestoreWorkflowContractTests(unittest.TestCase):
    def test_restore_step_supplies_every_required_helper_variable(self):
        workflow = WORKFLOW.read_text(encoding="utf-8")
        helper = HELPER.read_text(encoding="utf-8")

        step_match = re.search(
            r"      - name: Decrypt and restore with application roles into ephemeral PostgreSQL\n"
            r"(?P<step>.*?)(?=      - name: |\Z)",
            workflow,
            re.DOTALL,
        )
        self.assertIsNotNone(step_match, "restore workflow step must exist")
        step = step_match.group("step")

        env_match = re.search(r"        env:\n(?P<env>.*?)(?=        run:)", step, re.DOTALL)
        self.assertIsNotNone(env_match, "restore step must declare its environment")
        env = env_match.group("env")

        helper_required = re.findall(
            r'^: "\$\{([A-Z][A-Z0-9_]*)\?[:}]',
            helper,
            re.MULTILINE,
        )
        self.assertEqual(
            set(helper_required),
            set(REQUIRED_HELPER_VARIABLES),
            "test contract must stay aligned with the helper's required variables",
        )
        for variable in REQUIRED_HELPER_VARIABLES:
            self.assertRegex(
                env,
                rf"(?m)^          {re.escape(variable)}:",
                f"restore step must define {variable}",
            )

    def test_decrypted_archive_is_passed_to_helper_after_validation(self):
        workflow = WORKFLOW.read_text(encoding="utf-8")
        step_match = re.search(
            r"      - name: Decrypt and restore with application roles into ephemeral PostgreSQL\n"
            r"(?P<step>.*?)(?=      - name: |\Z)",
            workflow,
            re.DOTALL,
        )
        self.assertIsNotNone(step_match, "restore workflow step must exist")
        run_match = re.search(r"        run: \|\n(?P<run>.*)", step_match.group("step"), re.DOTALL)
        self.assertIsNotNone(run_match, "restore step must have a run script")
        run_script = run_match.group("run")

        decrypt = run_script.find('age --decrypt --identity "$identity" --output "$plaintext"')
        archive_validation = run_script.find('pg_restore --list "$plaintext"')
        helper_invocation = run_script.find(
            'BACKUP_DUMP="$plaintext" bash scripts/db/restore_remote_backup_ephemeral.sh'
        )
        self.assertGreaterEqual(decrypt, 0, "workflow must decrypt into plaintext")
        self.assertGreater(archive_validation, decrypt, "archive must be validated after decryption")
        self.assertGreater(
            helper_invocation,
            archive_validation,
            "helper must receive the validated plaintext archive",
        )


if __name__ == "__main__":
    unittest.main()
