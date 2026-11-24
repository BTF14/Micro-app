import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from prune_backups import prune_old_backups


class PruneBackupsTests(unittest.TestCase):
    def test_removes_old_backup_and_checksum_by_filename_timestamp(self):
        with tempfile.TemporaryDirectory() as temp:
            daily = Path(temp)
            old = daily / "backup-2026-10-01T07-00-00Z.dump.age"
            checksum = daily / (old.name + ".sha256")
            recent = daily / "backup-2026-10-20T07-00-00Z.dump.age"
            malformed = daily / "backup-2026-99-99T07-00-00Z.dump.age"
            unrelated = daily / "notes.txt"
            for path in (old, checksum, recent, malformed, unrelated):
                path.write_text("synthetic test data", encoding="utf-8")

            deleted = prune_old_backups(
                daily, 15, now=datetime(2026, 10, 28, 7, 0, tzinfo=timezone.utc)
            )

            self.assertEqual(set(deleted), {old.name, checksum.name})
            self.assertFalse(old.exists())
            self.assertFalse(checksum.exists())
            self.assertTrue(recent.exists())
            self.assertTrue(malformed.exists())
            self.assertTrue(unrelated.exists())

    def test_rejects_zero_retention(self):
        with tempfile.TemporaryDirectory() as temp:
            with self.assertRaises(ValueError):
                prune_old_backups(Path(temp), 0)


if __name__ == "__main__":
    unittest.main()
