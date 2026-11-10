#!/usr/bin/env python3
"""Exercise Git's HTTP Basic challenge path against a loopback-only mock.

This proves Git invokes GIT_ASKPASS and sends the expected Basic credentials.
The mock intentionally returns 404 after authentication; it does not emulate
GitHub's smart-HTTP protocol, prove a push, or use a real credential.
"""

from __future__ import annotations

import base64
import hmac
import os
import subprocess
import sys
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 2:
        print(
            "usage: test_backup_git_askpass_http.py PATH_TO_ASKPASS_HELPER",
            file=sys.stderr,
        )
        return 2

    helper = Path(sys.argv[1]).resolve()
    if not helper.is_file():
        print("FAIL: GIT_ASKPASS helper does not exist", file=sys.stderr)
        return 1

    test_token = "ephemeral-backup-askpass-http-test-token"
    expected_authorization = "Basic " + base64.b64encode(
        f"x-access-token:{test_token}".encode("utf-8")
    ).decode("ascii")

    with tempfile.TemporaryDirectory(prefix="microapp-askpass-http-") as temp_dir:
        marker = Path(temp_dir) / "authenticated"

        class Handler(BaseHTTPRequestHandler):
            expected_authorization = ""
            marker: Path

            def log_message(self, _format: str, *_args: object) -> None:
                # Never log Authorization headers or request details.
                return

            def do_GET(self) -> None:
                authorization = self.headers.get("Authorization")
                if authorization is None:
                    self.send_response(401)
                    self.send_header(
                        "WWW-Authenticate", 'Basic realm="git-askpass-test"'
                    )
                    self.send_header("Content-Length", "0")
                    self.end_headers()
                    return

                if not hmac.compare_digest(
                    authorization, self.expected_authorization
                ):
                    self.send_response(403)
                    self.send_header("Content-Length", "0")
                    self.end_headers()
                    return

                # Record only success, never the credential itself.
                self.marker.write_text("authenticated", encoding="utf-8")
                self.send_response(404)
                self.send_header("Content-Length", "0")
                self.end_headers()

        Handler.expected_authorization = expected_authorization
        Handler.marker = marker
        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        server_thread = threading.Thread(
            target=server.serve_forever, daemon=True
        )
        server_thread.start()
        port = server.server_address[1]

        env = os.environ.copy()
        env.update(
            {
                "GIT_ASKPASS": str(helper),
                "GIT_ASKPASS_REQUIRE": "force",
                "GIT_TERMINAL_PROMPT": "0",
                "GH_TOKEN": test_token,
                "GIT_CONFIG_NOSYSTEM": "1",
                "GIT_CONFIG_GLOBAL": "/dev/null",
                "NO_PROXY": "127.0.0.1,localhost",
                "no_proxy": "127.0.0.1,localhost",
            }
        )

        try:
            result = subprocess.run(
                [
                    "git",
                    "-c",
                    "credential.helper=",
                    "ls-remote",
                    f"http://127.0.0.1:{port}/repo.git",
                ],
                env=env,
                cwd=temp_dir,
                capture_output=True,
                text=True,
                timeout=15,
                check=False,
            )
        finally:
            server.shutdown()
            server.server_close()
            server_thread.join(timeout=3)

        if result.returncode == 0:
            print(
                "FAIL: mock remote unexpectedly behaved like a valid Git repository",
                file=sys.stderr,
            )
            return 1
        if not marker.is_file():
            print(
                "FAIL: Git did not send the expected Basic credentials after the 401 challenge",
                file=sys.stderr,
            )
            return 1

    print(
        "PASS: Git HTTP transport invoked GIT_ASKPASS and sent the expected "
        "Basic credentials; mock remote intentionally returned 404 after authentication."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
