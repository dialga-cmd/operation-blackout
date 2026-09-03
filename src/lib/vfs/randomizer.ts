import crypto from "crypto";
import { VFSNode, VFSRound } from "@/lib/types";

function getDeterministicSeed(userId: string, roundId: number): number {
  const hash = crypto.createHash("sha256").update(`${userId}:${roundId}:hardened_v2`).digest("hex");
  return parseInt(hash.substring(0, 8), 16);
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const SHADOW_DIRECTORY_POOL = [
  "/var/backups/.sys_cache_09",
  "/var/log/.journald_bak_77",
  "/usr/local/share/.cache_db_13",
  "/var/tmp/.svc_state_44",
  "/etc/systemd/system/.units_bak_88",
  "/opt/containerd/io.containerd.v1.crate_02",
  "/var/lib/dpkg/triggers/.state_lock_99",
];

const REAL_FLAG_FILENAMES = [
  "kernel_panic_dump.raw",
  "syslog_archive_2026.log",
  "auth_audit_sec.dat",
  "journal_0114_enc.bin",
  "core_dump_7392.raw",
];

const DECOY_FILENAMES = [
  "recovery_snapshot.bak",
  "system_state_legacy.dmp",
  "shadow_copy_2026.bak",
  "journal_0114_old.dat",
  "auth_audit_backup.log",
  "audit_trail_previous.log",
  "syslog_archive_2025.log",
  "kernel_panic_dump_decoy.raw",
];

export function randomizeRoundVFS(roundData: VFSRound, userId: string, flagKey: string): VFSRound {
  const roundId = roundData.round;
  const seed = getDeterministicSeed(userId, roundId);
  const rng = seededRandom(seed);

  const targetDirIndex = Math.floor(rng() * SHADOW_DIRECTORY_POOL.length);
  const targetDir = SHADOW_DIRECTORY_POOL[targetDirIndex];

  const realFilenameIndex = Math.floor(rng() * REAL_FLAG_FILENAMES.length);
  const realFilename = REAL_FLAG_FILENAMES[realFilenameIndex];

  const decoy1Name = DECOY_FILENAMES[Math.floor(rng() * DECOY_FILENAMES.length)];
  let decoy2Name = DECOY_FILENAMES[Math.floor(rng() * DECOY_FILENAMES.length)];
  while (decoy2Name === decoy1Name) {
    decoy2Name = DECOY_FILENAMES[Math.floor(rng() * DECOY_FILENAMES.length)];
  }
  let decoy3Name = DECOY_FILENAMES[Math.floor(rng() * DECOY_FILENAMES.length)];
  while (decoy3Name === decoy1Name || decoy3Name === decoy2Name) {
    decoy3Name = DECOY_FILENAMES[Math.floor(rng() * DECOY_FILENAMES.length)];
  }

  const nodes: VFSNode[] = [];

  if (roundId === 1) {
    const realFlagPath = `${targetDir}/${realFilename}`;
    const decoy1Path = `${targetDir}/${decoy1Name}`;
    const decoy2Path = `${targetDir}/${decoy2Name}`;

    for (const node of roundData.nodes) {
      if (node.path === "/var/backups/.tmp_9f3a/fragment.log") {
        nodes.push({
          ...node,
          content: `[2026-01-14 02:17:03] auth: session_id=7f3a-2c1b user=support_backup from=192.168.1.105
[2026-01-14 02:17:04] kernel: EXT4-fs (sda1): re-mounted. Options: errors=remount-ro
[2026-01-14 02:17:05] auth: session_id=7f3a-2c1b command="cat /etc/shadow" → DENIED
[2026-01-14 02:17:06] backup: svc-backup initiated differential backup
[2026-01-14 02:17:07] cron: Job started: /opt/scripts/backup_verify.sh
[2026-01-14 02:17:08] auth: session_id=7f3a-2c1b user=support_backup → home/participant/.session_2_17`,
        });
        continue;
      }

      if (node.path === "/home/participant/.session_2_17") {
        nodes.push({
          ...node,
          content: `session_id: 7f3a-2c1b
user: support_backup
home_dir: /home/participant
last_login: 2026-01-14 02:17:01
note: backup data staged at ${targetDir}
WARNING: Permission check required! Owned by group 'backup' (use id/groups).`,
        });
        continue;
      }

      if (node.path === "/var/backups/.svc_archive") {
        nodes.push({
          ...node,
          path: targetDir,
          children: [realFilename, decoy1Name, decoy2Name],
        });
        continue;
      }

      if (node.path === "/var/backups/.svc_archive/flag.txt") {
        nodes.push({
          ...node,
          path: realFlagPath,
          content: `FLAG{the_attacker_did_not_choose_randomly_${flagKey}}`,
        });
        continue;
      }

      if (node.path === "/var/backups/.svc_archive/decoy_a.txt") {
        nodes.push({
          ...node,
          path: decoy1Path,
        });
        continue;
      }

      if (node.path === "/var/backups/.svc_archive/decoy_b.txt") {
        nodes.push({
          ...node,
          path: decoy2Path,
        });
        continue;
      }

      nodes.push(node);
    }

    const targetParent = targetDir.substring(0, targetDir.lastIndexOf("/"));
    if (!nodes.some((n) => n.path === targetParent)) {
      nodes.push({
        path: targetParent,
        type: "dir",
        permissions: "drwxr-xr-x",
        owner: "root",
        group: "root",
        mtime: "2026-01-14T02:00:00Z",
        size: 4096,
        inode: 999901,
      });
    }

    return { ...roundData, nodes };
  }

  if (roundId === 2) {
    const part1Name = "auth_session.part1";
    const part2Name = "auth_session.part2";
    const part3Name = "auth_session.part3";

    for (const node of roundData.nodes) {
      if (node.path === "/opt/scripts/incident_response.sh") {
        nodes.push({
          ...node,
          content: `#!/bin/bash
echo "=== INCIDENT RESPONSE PROTOCOL ==="
echo "Analyzing system compromise..."

CRON_BACKDOOR="/etc/cron.d/fake-job"
SHELL_SCRIPT="/opt/scripts/monitor.sh"

echo "WARNING: Suspicious activity detected at ${targetDir}"
echo "Next investigation point: ${targetDir}/auth_session"
echo "DECOY_WARNING: Avoid false triggers in /var/log/.correlated"`,
        });
        continue;
      }

      if (node.path === "/var/log/.archive") {
        nodes.push({
          ...node,
          path: targetDir,
          children: [part1Name, part2Name, part3Name, decoy1Name, decoy2Name],
        });
        continue;
      }

      if (node.path === "/var/log/.archive/staging_part1.txt") {
        nodes.push({
          ...node,
          path: `${targetDir}/${part1Name}`,
          content: `FLAG{hidden_in_pl`,
        });
        continue;
      }

      if (node.path === "/var/log/.archive/staging_part2.txt") {
        nodes.push({
          ...node,
          path: `${targetDir}/${part2Name}`,
          content: `${flagKey}`,
        });
        continue;
      }

      if (node.path === "/var/log/.archive/old_backup") {
        nodes.push({
          ...node,
          path: `${targetDir}/${part3Name}`,
          content: `ain_permissions}`,
        });
        nodes.push({
          path: `${targetDir}/${decoy1Name}`,
          type: "file",
          content: "FLAG{decoy_part_do_not_use_in_submission}",
          permissions: "-rw-r-----",
          owner: "root",
          group: "root",
          mtime: "2026-01-14T02:19:40Z",
          size: 40,
          inode: 200999,
        });
        continue;
      }

      nodes.push(node);
    }
    return { ...roundData, nodes };
  }

  if (roundId === 3) {
    const realStashDir = targetDir;
    const realFlagFile = `${realStashDir}/${realFilename}`;
    const targetDirHex = Buffer.from(realStashDir).toString("hex");

    for (const node of roundData.nodes) {
      if (node.path === "/home/participant/invoice.pdf") {
        nodes.push({
          ...node,
          archiveContents: [
            {
              path: "archive_inner.tar",
              type: "file",
              content: "ustar",
              permissions: "-rw-r--r--",
              owner: "participant",
              group: "participant",
              mtime: "2026-01-15T10:30:00Z",
              size: 1024,
              inode: 3001002,
              archiveContents: [
                {
                  path: "suspicious_binary",
                  type: "file",
                  content: "\x7fELF\x02\x01\x01\x00",
                  permissions: "-rwxr-xr-x",
                  owner: "svc-unknown",
                  group: "svc-unknown",
                  mtime: "2026-01-14T03:45:00Z",
                  size: 512,
                  inode: 3001003,
                  readableStrings: [
                    "ELF binary: x86_64 target execution binary v2.1",
                    "Path: /opt/tools/persistence_check",
                    "Timestamp: 2026-01-14T03:45:00Z",
                    "UID: 1002 (svc-unknown)",
                    `Target Stash Endpoint (HEX ENCODED): ${targetDirHex}`,
                    "Decoder instruction: decode hex payload string via echo <hex> | xxd -r -p or python",
                    "Referenced in cron_trace.log for correlation",
                  ],
                },
                {
                  path: "metadata.json",
                  type: "file",
                  content: '{"created": "2026-01-14T03:45:00Z", "uid": 1002}',
                  permissions: "-rw-r--r--",
                  owner: "root",
                  group: "root",
                  mtime: "2026-01-14T03:45:00Z",
                  size: 64,
                  inode: 3001004,
                },
              ],
            },
          ],
        });
        continue;
      }

      if (node.path === "/opt/tools/persistence_check") {
        nodes.push({
          ...node,
          target: realStashDir,
        });
        continue;
      }

      if (node.path === "/var/log/.final_stash") {
        nodes.push({
          ...node,
          path: realStashDir,
          children: [realFilename, decoy1Name, decoy2Name],
        });
        continue;
      }

      if (node.path === "/var/log/.final_stash/final_flag.txt") {
        nodes.push({
          ...node,
          path: realFlagFile,
          content: `FLAG{the_trace_that_remained_${flagKey}}`,
        });
        continue;
      }

      nodes.push(node);
    }

    if (!nodes.some((n) => n.path === realStashDir)) {
      nodes.push({
        path: realStashDir,
        type: "dir",
        permissions: "drwxr-x---",
        owner: "svc-unknown",
        group: "svc-unknown",
        mtime: "2026-01-14T04:30:00Z",
        size: 4096,
        inode: 3001040,
        children: [realFilename, decoy1Name, decoy2Name],
      });
    }

    return { ...roundData, nodes };
  }

  return roundData;
}
