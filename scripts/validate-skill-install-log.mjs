import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const root = process.cwd();
const log = JSON.parse(readFileSync(join(root, "skill-install-log.json"), "utf8"));
assert.equal(log.schemaVersion, 1, "unsupported skill log schema");
assert.equal(log.candidates.length, 19, "expected all 19 AutoSkills proposals");
assert.equal(new Set(log.candidates.map((item) => item.name)).size, 19, "duplicate candidate names");
const approved = log.candidates.filter((item) => item.decision === "install").map((item) => item.name).sort();
const installed = log.installedSkills.map((item) => item.name).sort();
assert.deepEqual(installed, approved, "installed skills must equal the explicitly approved candidate set");
assert.equal(log.autoskills.officialSkillsLockJson.status, "not-generated", "do not misrepresent a custom log as AutoSkills' official lockfile");

let verified = 0;
for (const skill of log.installedSkills) {
  assert.ok(skill.path.startsWith(".agents/skills/"), `skill path outside .agents/skills: ${skill.path}`);
  assert.ok(skill.files.some((file) => file.path.endsWith("/LICENSE")), `missing preserved license for ${skill.name}`);
  for (const file of skill.files) {
    const absolute = resolve(root, file.path);
    assert.ok(absolute.startsWith(resolve(root, ".agents", "skills") + sep), `unsafe path in log: ${file.path}`);
    const bytes = readFileSync(absolute);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const gitBlobSha1 = createHash("sha1")
      .update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]))
      .digest("hex");
    assert.equal(bytes.length, file.bytes, `size mismatch: ${file.path}`);
    assert.equal(sha256, file.sha256, `SHA-256 mismatch: ${file.path}`);
    assert.equal(gitBlobSha1, file.installedBlobSha1, `Git blob SHA-1 mismatch: ${file.path}`);
    if (file.sourceBlobSha1 !== file.installedBlobSha1) {
      assert.ok(file.modification || skill.modifications?.length, `unexplained source change: ${file.path}`);
    }
    verified++;
  }
}
assert.equal(log.validation.dependencyChanges, 0, "skill installation must not add dependencies");
assert.equal(log.validation.scriptsExecuted, undefined, "unexpected log field");
console.log(`Skill integrity OK: ${log.candidates.length} candidates reviewed; ${installed.length} skills installed; ${verified} files hash-verified.`);
