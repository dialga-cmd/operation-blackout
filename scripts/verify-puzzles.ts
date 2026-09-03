import { VFSEngine } from "../src/lib/vfs/engine";
import { executePipeline } from "../src/lib/vfs/executor";
import { round1VFS, round2VFS, round3VFS } from "../src/data/rounds";
import { generateFlagKey, getTodayDate } from "../src/lib/crypto/flag-key";
import type { SessionState } from "../src/lib/types";

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, extra?: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${extra ? " — " + extra : ""}`);
  }
}

function newSession(roundId: number, userId: string): SessionState {
  const env: Record<string, string> = {
    USER: "participant",
    HOME: "/home/participant",
    PATH: "/usr/local/bin:/usr/bin:/bin",
    SHELL: "/bin/bash",
    HOSTNAME: "operation-blackout",
    ROUND: String(roundId),
  };
  if (roundId === 2) {
    env.SESSION_TOKEN = "ZmxhZ3toaWRkZW5faW5fcGxhaW5fcGVybWlzc2lvbnN9";
    env.BACKUP_KEY = "aW5jaWRlbnRfYWNjZXNzX2RldGVjdGVk";
  }
  if (roundId === 3) env.INVESTIGATION_PATH = "/var/log/.incidents";
  return { cwd: "/", env, history: [], scratchSpace: {}, userId, roundId };
}

import type { VFSNode } from "../src/lib/types";

// Personalize a round's flag nodes with the user's key (mirrors the API route)
function personalize(round: number, nodes: VFSNode[], userId: string): VFSNode[] {
  const key = generateFlagKey(userId, round, getTodayDate());
  return nodes.map((node) => {
    if (round === 2 && node.path === "/var/log/.archive/staging_part1.txt") {
      return { ...node, content: `FLAG{hidden_in_pl${key}` };
    }
    if (node.content && node.content.startsWith("FLAG{") && node.content.endsWith("}")) {
      return { ...node, content: node.content.slice(0, -1) + `_${key}}` };
    }
    return node;
  });
}

const userId = "test-user-123";
const parse = (input: string, vfs: VFSEngine, session: SessionState) =>
  executePipeline(input, vfs, session).output;

async function main() {
  console.log("\n=== ROUND 1: The Point of Entry ===\n");
  const r1 = round1VFS;
  const r1User = personalize(1, r1.nodes, userId);
  const vfs1 = new VFSEngine({ ...r1, nodes: r1User });
  const s1 = newSession(1, userId);

  // 1. find / -newer reference discovers the fragment
  const r1Find = parse("find / -newer /var/log/syslog", vfs1, s1);
  check(
    "find -newer discovers fragment",
    r1Find.includes(".tmp_9f3a/fragment.log"),
    r1Find
  );

  // 2. Read fragment
  const r1Cat = parse("cat /var/backups/.tmp_9f3a/fragment.log", vfs1, s1);
  check("fragment references session_2_17", r1Cat.includes(".session_2_17"), r1Cat);

  // 3. id/groups confirms read access to session file
  const r1Groups = parse("id", vfs1, s1);
  check("id shows backup group", r1Groups.includes("backup"), r1Groups);

  // 4. read session file
  const r1Session = parse("cat /home/participant/.session_2_17", vfs1, s1);
  check("session file readable", r1Session.includes("session_id"), r1Session);
  const r1Correction = parse("cat /Var/Backups/.svc_Archive", vfs1, s1);
  check("case-mismatch path fails (no such file)", r1Correction.includes("No such file"));

  // 5. Correct path + disambiguation
  const r1Ls = parse("ls -la /var/backups/.svc_archive/", vfs1, s1);
  check("real archive listable", r1Ls.includes("flag.txt") && r1Ls.includes("decoy"), r1Ls);

  // cat the real flag (readable via backup group)
  const r1Flag = parse("cat /var/backups/.svc_archive/flag.txt", vfs1, s1);
  const r1Key = generateFlagKey(userId, 1, getTodayDate());
  check("real flag found", r1Flag.includes(`the_attacker_did_not_choose_randomly_${r1Key}`), r1Flag);

  // Decoy A is readable (via backup group) but owned by root — disambiguated by owner
  const decoyA = parse("cat /var/backups/.svc_archive/decoy_a.txt", vfs1, s1);
  check("root-owned decoy readable but decoy", decoyA.includes("the_server_was_compromised"), decoyA);
  const r1LsOwner = parse("ls -la /var/backups/.svc_archive/", vfs1, s1);
  check("ls -la shows real flag owned by svc-backup", /\bflag\.txt\b/.test(r1LsOwner) && r1LsOwner.includes("svc-backup"), r1LsOwner);

  console.log("\n=== ROUND 2: What They Tried to Hide ===\n");
  const r2User = personalize(2, round2VFS.nodes, userId);
  const vfs2 = new VFSEngine({ ...round2VFS, nodes: r2User });
  const s2 = newSession(2, userId);

  // 1. Permission-locked file
  const r2Locked = parse("cat /etc/shadow.bak", vfs2, s2);
  check("chmod 000 denied", r2Locked.includes("Permission denied"), r2Locked);

  // 2. Archive readable copy
  const r2Archive = parse("tar -xzf /var/backups/shadow_backup.tar.gz", vfs2, s2);
  check("archive extracts", r2Archive.includes("Extracting"), r2Archive);

  // 3. env -> base64 decode
  const r2Env = parse("env", vfs2, s2);
  check("env has SESSION_TOKEN", r2Env.includes("SESSION_TOKEN"), r2Env);
  const r2Decoded = parse("base64 -d ZmxhZ3toaWRkZW5faW5fcGxhaW5fcGVybWlzc2lvbnN9", vfs2, s2);
  check("base64 decode works", r2Decoded.includes("flag{hidden_in_plain_permissions}"), r2Decoded);

  // 4. cron -> symlink -> script
  const r2Cron = parse("cat /etc/cron.d/fake-job", vfs2, s2);
  check("cron references monitor.sh", r2Cron.includes("monitor.sh"), r2Cron);
  const r2Readlink = parse("readlink /opt/scripts/monitor.sh", vfs2, s2);
  check("readlink resolves symlink", r2Readlink.includes("incident_response.sh"), r2Readlink);

  // 5. script content
  const r2Script = parse("cat /opt/scripts/incident_response.sh", vfs2, s2);
  check("script reveals staging path", r2Script.includes("/var/log/.archive/staging"), r2Script);

  // 6. split flag parts readable and combine
  const r2Part1 = parse("cat /var/log/.archive/staging_part1.txt", vfs2, s2);
  const r2Part2 = parse("cat /var/log/.archive/staging_part2.txt", vfs2, s2);
  const r2Key = generateFlagKey(userId, 2, getTodayDate());
  check("part1 has FLAG+key", r2Part1 === `FLAG{hidden_in_pl${r2Key}`, r2Part1);
  check("part2 has suffix", r2Part2 === "ain_permissions}", r2Part2);

  console.log("\n=== ROUND 3: The Last Trace ===\n");
  const r3User = personalize(3, round3VFS.nodes, userId);
  const vfs3 = new VFSEngine({ ...round3VFS, nodes: r3User });
  const s3 = newSession(3, userId);

  // 1. file reveals gzip despite .pdf
  const r3File = parse("file /home/participant/invoice.pdf", vfs3, s3);
  check("file type mismatch detected", r3File.includes("gzip"), r3File);

  // 2. extract archive
  const r3Extract = parse("gzip -d /home/participant/invoice.pdf", vfs3, s3);
  check("nested archive extractable", r3Extract.includes("Extracting"), r3Extract);

  // Check extracted binary exists and strings reveals clues
  const r3Strings = parse("strings /archive_inner.tar/suspicious_binary", vfs3, s3);
  check(
    "strings on binary reveals path",
    r3Strings.includes("/opt/tools/persistence_check"),
    r3Strings
  );
  check(
    "strings reveals timestamp 03:45",
    r3Strings.includes("03:45:00"),
    r3Strings
  );

  // Hex-encoded path decode -> final stash
  const r3Hex = parse(
    "echo 2f7661722f6c6f672f2e66696e616c5f7374617368 | xxd -r -p",
    vfs3,
    s3
  );
  check("hex decode reveals final stash path", r3Hex.trim() === "/var/log/.final_stash", r3Hex);

  // Branch: .incidents is real (matches timestamp 03:45), .correlated is decoy
  const r3StatReal = parse("stat /var/log/.incidents", vfs3, s3);
  check("real incident dir has 03:45 mtime", r3StatReal.includes("2026-01-14T03:45:00Z"), r3StatReal);
  const r3StatDecoy = parse("stat /var/log/.correlated", vfs3, s3);
  check("decoy has 04:00 mtime", r3StatDecoy.includes("2026-01-14T04:00:00Z"), r3StatDecoy);

  // correlating logs
  const r3Auth = parse("cat /var/log/.incidents/auth_trace.log", vfs3, s3);
  check("auth trace log reveals persistence", r3Auth.includes("cron.d/fake-job"), r3Auth);
  const r3CronTrace = parse("cat /var/log/.incidents/cron_trace.log", vfs3, s3);
  check("cron trace logs correlate", r3CronTrace.includes("/opt/scripts/monitor.sh"), r3CronTrace);

  // sudo -l (real rule this round)
  const r3Sudo = parse("sudo -l", vfs3, s3);
  check("sudo -l real rule for final stash", r3Sudo.includes(".final_stash"), r3Sudo);

  // final flag via sudo cat
  const r3Final = parse("sudo cat /var/log/.final_stash/final_flag.txt", vfs3, s3);
  const r3Key = generateFlagKey(userId, 3, getTodayDate());
  check("final flag via sudo cat", r3Final.includes(`the_trace_that_remained_${r3Key}`), r3Final);

  console.log(`\n===== RESULT: ${passed} passed, ${failed} failed =====\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
