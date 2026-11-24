#!/usr/bin/env python3
"""Prune encrypted backups by the UTC timestamp embedded in each filename.

Git checkout mtimes are not the original backup creation times, so filesystem
-mtime is not a reliable retention source after cloning the backup repository.
"""
from __future__ import annotations

import argparse
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

BACKUP_NAME = re.compile(
    r"^backup-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})Z\.dump\.age$"
)


def prune_old_backups(
    directory: Path, retention_days: int, *, now: datetime | None = None
) -> list[str]:
    """Delete encrypted backups older than retention_days and their checksums."""
    if retention_days < 1:
        raise ValueError("retention_days must be at least 1")
    current = now or datetime.now(timezone.utc)
    if current.tzinfo is None:
        raise ValueError("now must be timezone-aware")
    cutoff = current.astimezone(timezone.utc) - timedelta(days=retention_days)
    deleted: list[str] = []

    for backup in sorted(directory.iterdir()):
        match = BACKUP_NAME.fullmatch(backup.name)
        if not match or not backup.is_file():
            continue
        date_part, hour, minute, second = match.groups()
        try:
            created = datetime.strptime(
                f"{date_part}T{hour}:{minute}:{second}Z", "%Y-%m-%dT%H:%M:%SZ"
            ).replace(tzinfo=timezone.utc)
        except ValueError:
            # A malformed filename is not safe to delete automatically.
            continue
        if created < cutoff:
            backup.unlink()
            deleted.append(backup.name)
            checksum = backup.with_name(backup.name + ".sha256")
            if checksum.is_file():
                checksum.unlink()
                deleted.append(checksum.name)
    return deleted


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path, help="backup daily/ directory")
    parser.add_argument("--retention-days", type=int, required=True)
    args = parser.parse_args()
    deleted = prune_old_backups(args.directory, args.retention_days)
    for name in deleted:
        print(f"deleted {name}")
    print(f"retention complete; deleted {len(deleted)} file(s)")


if __name__ == "__main__":
    main()
