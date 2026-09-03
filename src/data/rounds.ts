import { VFSRound } from "@/lib/types";

// Round 1 VFS data
export const round1VFS: VFSRound = {
  round: 1,
  title: "The Point of Entry",
  nodes: [
    // Deleted logs (empty)
    {
      path: "/var/log/auth.log",
      type: "file",
      content: "",
      permissions: "-rw-r-----",
      owner: "root",
      group: "adm",
      mtime: "2026-01-13T23:58:00Z",
      size: 0,
      inode: 100001,
    },
    {
      path: "/var/log/syslog",
      type: "file",
      content: "",
      permissions: "-rw-r-----",
      owner: "syslog",
      group: "adm",
      mtime: "2026-01-13T23:58:00Z",
      size: 0,
      inode: 100002,
    },
    // Fragment log - the entry clue (found via find / -newer)
    {
      path: "/var/backups/.tmp_9f3a/fragment.log",
      type: "file",
      content: `[2026-01-14 02:17:03] auth: session_id=7f3a-2c1b user=support_backup from=192.168.1.105
[2026-01-14 02:17:04] kernel: EXT4-fs (sda1): re-mounted. Options: errors=remount-ro
[2026-01-14 02:17:05] auth: session_id=7f3a-2c1b command="cat /etc/shadow" → DENIED
[2026-01-14 02:17:06] backup: svc-backup initiated differential backup
[2026-01-14 02:17:07] cron: Job started: /opt/scripts/backup_verify.sh
[2026-01-14 02:17:08] auth: session_id=7f3a-2c1b user=support_backup → home/participant/.session_2_17`,
      permissions: "-rw-r--r--",
      owner: "svc-backup",
      group: "backup",
      mtime: "2026-01-14T02:17:03Z",
      size: 412,
      inode: 1337001,
    },
    // Red herring log with near-02:17 mtime
    {
      path: "/var/log/kern.log",
      type: "file",
      content: "[2026-01-14 02:16:59] kernel: USB device disconnected: hub-1",
      permissions: "-rw-r-----",
      owner: "root",
      group: "adm",
      mtime: "2026-01-14T02:16:59Z",
      size: 64,
      inode: 100003,
    },
    // Session file - requires id/groups to read
    {
      path: "/home/participant/.session_2_17",
      type: "file",
      content: `session_id: 7f3a-2c1b
user: support_backup
home_dir: /home/participant
last_login: 2026-01-14 02:17:01
note: backup data staged at /var/backups/.svc_archive
      WARNING: path referenced is /Var/Backups/.svc_Archive (case mismatch in original log)`,
      permissions: "-rw-r-----",
      owner: "svc-backup",
      group: "backup",
      mtime: "2026-01-14T02:17:01Z",
      size: 198,
      inode: 1337002,
    },
    // Real target directory (with corrected case)
    {
      path: "/var/backups/.svc_archive",
      type: "dir",
      permissions: "drwxr-xr-x",
      owner: "svc-backup",
      group: "backup",
      mtime: "2026-01-14T02:17:02Z",
      size: 4096,
      inode: 1337003,
      children: ["flag.txt", "decoy_a.txt", "decoy_b.txt"],
    },
    // Real flag - owned by svc-backup
    {
      path: "/var/backups/.svc_archive/flag.txt",
      type: "file",
      content: "FLAG{the_attacker_did_not_choose_randomly}",
      permissions: "-rw-r-----",
      owner: "svc-backup",
      group: "backup",
      mtime: "2026-01-14T02:17:02Z",
      size: 42,
      inode: 1337004,
    },
    // Decoy flag - owned by root (readable via backup group, disambiguated by owner)
    {
      path: "/var/backups/.svc_archive/decoy_a.txt",
      type: "file",
      content: "FLAG{the_server_was_compromised_at_midnight}",
      permissions: "-rw-r-----",
      owner: "root",
      group: "backup",
      mtime: "2026-01-14T02:17:02Z",
      size: 44,
      inode: 1337005,
    },
    // Decoy flag - owned by participant
    {
      path: "/var/backups/.svc_archive/decoy_b.txt",
      type: "file",
      content: "FLAG{backup_logs_reveal_the_trail}",
      permissions: "-rw-r-----",
      owner: "participant",
      group: "participant",
      mtime: "2026-01-14T02:17:02Z",
      size: 36,
      inode: 1337006,
    },
    // Home directory structure
    {
      path: "/home/participant",
      type: "dir",
      permissions: "drwxr-xr-x",
      owner: "participant",
      group: "participant",
      mtime: "2026-01-14T02:00:00Z",
      size: 4096,
      inode: 200001,
      children: [".bash_history", ".bashrc", ".profile"],
    },
    {
      path: "/home/participant/.bash_history",
      type: "file",
      content: `ls -la /var/log
cat /var/log/auth.log
find / -name "*.log" -newer /var/log/syslog
grep -r "session" /var/backups
cat /var/backups/.tmp_9f3a/fragment.log`,
      permissions: "-rw-------",
      owner: "participant",
      group: "participant",
      mtime: "2026-01-14T02:18:00Z",
      size: 128,
      inode: 200002,
    },
    // etc directory
    {
      path: "/etc",
      type: "dir",
      permissions: "drwxr-xr-x",
      owner: "root",
      group: "root",
      mtime: "2026-01-10T00:00:00Z",
      size: 4096,
      inode: 1001,
    },
    // var directory
    {
      path: "/var",
      type: "dir",
      permissions: "drwxr-xr-x",
      owner: "root",
      group: "root",
      mtime: "2026-01-14T02:00:00Z",
      size: 4096,
      inode: 1002,
    },
    {
      path: "/var/log",
      type: "dir",
      permissions: "drwxr-xr-x",
      owner: "root",
      group: "adm",
      mtime: "2026-01-14T02:20:00Z",
      size: 4096,
      inode: 1003,
    },
    {
      path: "/var/backups",
      type: "dir",
      permissions: "drwxr-xr-x",
      owner: "root",
      group: "root",
      mtime: "2026-01-14T02:17:00Z",
      size: 4096,
      inode: 1004,
    },
    {
      path: "/var/backups/.tmp_9f3a",
      type: "dir",
      permissions: "drwx------",
      owner: "svc-backup",
      group: "backup",
      mtime: "2026-01-14T02:17:03Z",
      size: 4096,
      inode: 1337000,
    },
    {
      path: "/home",
      type: "dir",
      permissions: "drwxr-xr-x",
      owner: "root",
      group: "root",
      mtime: "2026-01-01T00:00:00Z",
      size: 4096,
      inode: 1005,
    },
    {
      path: "/opt",
      type: "dir",
      permissions: "drwxr-xr-x",
      owner: "root",
      group: "root",
      mtime: "2026-01-01T00:00:00Z",
      size: 4096,
      inode: 1006,
    },
    {
      path: "/srv",
      type: "dir",
      permissions: "drwxr-xr-x",
      owner: "root",
      group: "root",
      mtime: "2026-01-01T00:00:00Z",
      size: 4096,
      inode: 1007,
    },
  ],
};

// Round 2 VFS
export const round2VFS: VFSRound = {
  round: 2,
  title: "What They Tried to Hide",
  nodes: [
    // Permission-locked file
    {
      path: "/etc/shadow.bak",
      type: "file",
      content: "root:$6$rounds=5000$salt$hashedpasswordhere:18642:0:99999:7:::",
      permissions: "----------",
      owner: "svc-unknown",
      group: "shadow",
      mtime: "2026-01-14T02:18:30Z",
      size: 256,
      inode: 2001001,
    },
    // Backup archive with readable copy
    {
      path: "/var/backups/shadow_backup.tar.gz",
      type: "file",
      content: "backup_content_inside",
      permissions: "-rw-r--r--",
      owner: "root",
      group: "backup",
      mtime: "2026-01-14T02:18:30Z",
      size: 1024,
      inode: 2001002,
      archiveContents: [
        {
          path: "shadow.bak.readable",
          type: "file",
          content: "svc-unknown:x:1002:1002:Service Account:/home/svc-unknown:/bin/bash",
          permissions: "-rw-r--r--",
          owner: "svc-unknown",
          group: "shadow",
          mtime: "2026-01-14T02:18:30Z",
          size: 80,
          inode: 2001003,
        },
        {
          path: "notes.txt",
          type: "file",
          content: "Backup created before the incident. svc-unknown account was used for reconnaissance.",
          permissions: "-rw-r--r--",
          owner: "root",
          group: "root",
          mtime: "2026-01-14T02:18:30Z",
          size: 70,
          inode: 2001004,
        },
      ],
    },
    // Env variable with base64 fragment
    {
      path: "/etc/environment",
      type: "file",
      content: `PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
SESSION_TOKEN=ZmxhZ3toaWRkZW5faW5fcGxhaW5fcGVybWlzc2lvbnN9
BACKUP_KEY=aW5jaWRlbnRfYWNjZXNzX2RldGVjdGVk
LANG="en_US.UTF-8"`,
      permissions: "-rw-r--r--",
      owner: "root",
      group: "root",
      mtime: "2026-01-14T02:19:00Z",
      size: 180,
      inode: 2001005,
    },
    // Bash history with ROT13
    {
      path: "/home/participant/.bash_history",
      type: "file",
      content: `cat /etc/environment
echo $SESSION_TOKEN | base64 -d
ls -la /var/log/
cat /var/log/auth.log.1
find /etc -name "*.conf" -newer /etc/hostname
cat /etc/cron.d/fake-job
readlink /opt/scripts/monitor.sh
grep -r "password" /etc/ 2>/dev/null
cat /opt/scripts/incident_response.sh`,
      permissions: "-rw-------",
      owner: "participant",
      group: "participant",
      mtime: "2026-01-14T02:19:30Z",
      size: 256,
      inode: 2001006,
    },
    // ROT13 encoded line in a separate history file
    {
      path: "/home/svc-unknown/.bash_history",
      type: "file",
      content: `cd /opt/scripts
./backup_verify.sh
echo "persistence established via cron" | base64
cat /opt/scripts/monitor.sh
find /var -name "*.log" -mmin -5
nc -zv 10.0.0.50 4444
echo "UVPUNRF: /opt/scripts/incident_response.sh"
rm -f /var/log/auth.log.1`,
      permissions: "-rw-------",
      owner: "svc-unknown",
      group: "svc-unknown",
      mtime: "2026-01-14T02:19:30Z",
      size: 256,
      inode: 2001007,
    },
    // Cron file
    {
      path: "/etc/cron.d/fake-job",
      type: "file",
      content: `# DO NOT EDIT THIS FILE - edit the master and reinstall.
# (/tmp/crontab.abc123 installed on Mon Jan 13 10:00:00 2026)
# (Cron info version on Mon Jan 13 10:00:00 2026)

SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

0 2 * * * root /opt/scripts/monitor.sh
*/5 * * * * root /opt/scripts/backup_verify.sh`,
      permissions: "-rw-r--r--",
      owner: "root",
      group: "root",
      mtime: "2026-01-13T10:00:00Z",
      size: 256,
      inode: 2001008,
    },
    // Symlink target
    {
      path: "/opt/scripts/monitor.sh",
      type: "symlink",
      target: "/opt/scripts/incident_response.sh",
      permissions: "lrwxrwxrwx",
      owner: "root",
      group: "root",
      mtime: "2026-01-14T02:18:00Z",
      size: 40,
      inode: 2001009,
    },
    // Real script content (the resolved symlink target)
    {
      path: "/opt/scripts/incident_response.sh",
      type: "file",
      content: `#!/bin/bash
# Incident Response Script
# Author: Security Team
# Last Modified: 2026-01-14 02:18:00

echo "=== INCIDENT RESPONSE PROTOCOL ==="
echo "Analyzing system compromise..."

# The attacker's persistence mechanism
CRON_BACKDOOR="/etc/cron.d/fake-job"
SHELL_SCRIPT="/opt/scripts/monitor.sh"

echo "WARNING: Suspicious activity detected at /var/log/.archive"
echo "Next investigation point: /var/log/.archive/staging"
echo "DECOY: /var/log/.archive/old_backup (DO NOT FOLLOW)"`,
      permissions: "-rwxr-xr-x",
      owner: "root",
      group: "root",
      mtime: "2026-01-14T02:18:00Z",
      size: 320,
      inode: 2001010,
    },
    // Directory for the final flag (split across 2 files)
    {
      path: "/var/log/.archive",
      type: "dir",
      permissions: "drwxr-x---",
      owner: "svc-unknown",
      group: "backup",
      mtime: "2026-01-14T02:19:45Z",
      size: 4096,
      inode: 2001011,
      children: ["staging_part1.txt", "staging_part2.txt", "old_backup"],
    },
    // Flag part 1
    {
      path: "/var/log/.archive/staging_part1.txt",
      type: "file",
      content: "FLAG{hidden_in_pl",
      permissions: "-rw-r-----",
      owner: "svc-unknown",
      group: "backup",
      mtime: "2026-01-14T02:19:45Z",
      size: 18,
      inode: 2001012,
    },
    // Flag part 2
    {
      path: "/var/log/.archive/staging_part2.txt",
      type: "file",
      content: "ain_permissions}",
      permissions: "-rw-r-----",
      owner: "svc-unknown",
      group: "backup",
      mtime: "2026-01-14T02:19:45Z",
      size: 18,
      inode: 2001013,
    },
    // Decoy
    {
      path: "/var/log/.archive/old_backup",
      type: "file",
      content: "FLAG{old_backup_contains_evidence}",
      permissions: "-rw-r-----",
      owner: "root",
      group: "root",
      mtime: "2026-01-14T02:19:40Z",
      size: 35,
      inode: 2001014,
    },
    // Standard directories
    {
      path: "/home/participant",
      type: "dir",
      permissions: "drwxr-xr-x",
      owner: "participant",
      group: "participant",
      mtime: "2026-01-14T02:00:00Z",
      size: 4096,
      inode: 2001020,
      children: [".bash_history"],
    },
    {
      path: "/etc",
      type: "dir",
      permissions: "drwxr-xr-x",
      owner: "root",
      group: "root",
      mtime: "2026-01-14T02:00:00Z",
      size: 4096,
      inode: 2001030,
    },
    {
      path: "/var",
      type: "dir",
      permissions: "drwxr-xr-x",
      owner: "root",
      group: "root",
      mtime: "2026-01-14T02:00:00Z",
      size: 4096,
      inode: 2001040,
    },
    {
      path: "/var/log",
      type: "dir",
      permissions: "drwxr-xr-x",
      owner: "root",
      group: "adm",
      mtime: "2026-01-14T02:20:00Z",
      size: 4096,
      inode: 2001041,
    },
    {
      path: "/var/backups",
      type: "dir",
      permissions: "drwxr-xr-x",
      owner: "root",
      group: "root",
      mtime: "2026-01-14T02:00:00Z",
      size: 4096,
      inode: 2001042,
    },
    {
      path: "/opt",
      type: "dir",
      permissions: "drwxr-xr-x",
      owner: "root",
      group: "root",
      mtime: "2026-01-14T02:00:00Z",
      size: 4096,
      inode: 2001050,
    },
    {
      path: "/opt/scripts",
      type: "dir",
      permissions: "drwxr-xr-x",
      owner: "root",
      group: "root",
      mtime: "2026-01-14T02:00:00Z",
      size: 4096,
      inode: 2001051,
    },
    {
      path: "/home",
      type: "dir",
      permissions: "drwxr-xr-x",
      owner: "root",
      group: "root",
      mtime: "2026-01-01T00:00:00Z",
      size: 4096,
      inode: 2001060,
    },
    {
      path: "/home/svc-unknown",
      type: "dir",
      permissions: "drwxr-x---",
      owner: "svc-unknown",
      group: "svc-unknown",
      mtime: "2026-01-14T02:00:00Z",
      size: 4096,
      inode: 2001061,
      children: [".bash_history"],
    },
    {
      path: "/srv",
      type: "dir",
      permissions: "drwxr-xr-x",
      owner: "root",
      group: "root",
      mtime: "2026-01-01T00:00:00Z",
      size: 4096,
      inode: 2001070,
    },
  ],
};

// Round 3 VFS
export const round3VFS: VFSRound = {
  round: 3,
  title: "The Last Trace",
  nodes: [
    // Disguised file (invoice.pdf is actually gzip)
    {
      path: "/home/participant/invoice.pdf",
      type: "file",
      content: "\x1f\x8b\x08\x00\x00\x00\x00\x00",
      permissions: "-rw-r--r--",
      owner: "participant",
      group: "participant",
      mtime: "2026-01-15T10:30:00Z",
      size: 2048,
      inode: 3001001,
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
                "ELF binary: x86_64",
                "Path: /opt/tools/persistence_check",
                "Timestamp: 2026-01-14T03:45:00Z",
                "UID: 1002 (svc-unknown)",
                "Note: target endpoint (hex): 2f7661722f6c6f672f2e66696e616c5f7374617368",
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
    },
    // Branch directory - DECOY
    {
      path: "/var/log/.correlated",
      type: "dir",
      permissions: "drwxr-xr-x",
      owner: "svc-unknown",
      group: "svc-unknown",
      mtime: "2026-01-14T04:00:00Z",
      size: 4096,
      inode: 3001010,
      children: ["auth_trace.log", "decoy_trace.log"],
    },
    // Branch directory - REAL
    {
      path: "/var/log/.incidents",
      type: "dir",
      permissions: "drwxr-xr-x",
      owner: "svc-unknown",
      group: "svc-unknown",
      mtime: "2026-01-14T03:45:00Z",
      size: 4096,
      inode: 3001020,
      children: ["auth_trace.log", "cron_trace.log"],
    },
    // Real log (matching timestamp from strings output)
    {
      path: "/var/log/.incidents/auth_trace.log",
      type: "file",
      content: `2026-01-14 02:17:03 svc-unknown LOGIN from 192.168.1.105
2026-01-14 02:17:04 svc-unknown ACCESS /var/log/auth.log DELETED
2026-01-14 02:17:05 svc-unknown ACCESS /var/log/syslog DELETED
2026-01-14 02:18:30 svc-unknown STAGED /var/backups/shadow_backup.tar.gz
2026-01-14 02:19:00 svc-unknown PERSISTENCE /etc/cron.d/fake-job MODIFIED
2026-01-14 02:19:45 svc-unknown EXFIL /var/log/.archive/staging
2026-01-14 03:45:00 svc-unknown DEPLOY /opt/tools/persistence_check
2026-01-14 04:00:00 svc-unknown CLEANUP /var/log/.correlated/logs PURGED`,
      permissions: "-rw-r-----",
      owner: "svc-unknown",
      group: "backup",
      mtime: "2026-01-14T04:00:00Z",
      size: 512,
      inode: 3001021,
    },
    // Cron trace (correlated with Round 2's cron artifact)
    {
      path: "/var/log/.incidents/cron_trace.log",
      type: "file",
      content: `2026-01-13 10:00:00 SYSTEM /etc/cron.d/fake-job INSTALLED
2026-01-14 02:00:00 CRON /opt/scripts/monitor.sh EXECUTED
2026-01-14 02:18:00 CRON /opt/scripts/monitor.sh EXECUTED
2026-01-14 03:00:00 CRON /opt/scripts/monitor.sh EXECUTED
2026-01-14 04:00:00 CRON /opt/scripts/monitor.sh EXECUTED
2026-01-14 05:00:00 SYSTEM /etc/cron.d/fake-job REMOVED`,
      permissions: "-rw-r-----",
      owner: "svc-unknown",
      group: "backup",
      mtime: "2026-01-14T05:00:00Z",
      size: 320,
      inode: 3001022,
    },
    // Decoy trace
    {
      path: "/var/log/.correlated/auth_trace.log",
      type: "file",
      content: `2026-01-14 02:17:03 root LOGIN from 192.168.1.1
2026-01-14 02:17:04 root ACCESS /var/log/auth.log
2026-01-14 02:17:05 root ACCESS /var/log/syslog`,
      permissions: "-rw-r-----",
      owner: "root",
      group: "backup",
      mtime: "2026-01-14T02:17:05Z",
      size: 128,
      inode: 3001011,
    },
    {
      path: "/var/log/.correlated/decoy_trace.log",
      type: "file",
      content: "FLAG{correlated_logs_reveal_everything}",
      permissions: "-rw-r-----",
      owner: "root",
      group: "backup",
      mtime: "2026-01-14T02:17:05Z",
      size: 40,
      inode: 3001012,
    },
    // Hex encoded path
    {
      path: "/opt/tools/persistence_check",
      type: "symlink",
      target: "/var/log/.final_stash",
      permissions: "lrwxrwxrwx",
      owner: "svc-unknown",
      group: "svc-unknown",
      mtime: "2026-01-14T03:45:00Z",
      size: 28,
      inode: 3001030,
    },
    // Final stash directory
    {
      path: "/var/log/.final_stash",
      type: "dir",
      permissions: "drwxr-x---",
      owner: "svc-unknown",
      group: "svc-unknown",
      mtime: "2026-01-14T04:30:00Z",
      size: 4096,
      inode: 3001040,
      children: ["final_flag.txt"],
    },
    // Final flag (requires group membership via sudo -l)
    {
      path: "/var/log/.final_stash/final_flag.txt",
      type: "file",
      content: "FLAG{the_trace_that_remained}",
      permissions: "-rw-r-----",
      owner: "svc-unknown",
      group: "svc-unknown",
      mtime: "2026-01-14T04:30:00Z",
      size: 31,
      inode: 3001041,
    },
    // Decoy flags
    {
      path: "/opt/tools/old_backup.flag",
      type: "file",
      content: "FLAG{the_last_log_was_the_key}",
      permissions: "-rw-r-----",
      owner: "root",
      group: "backup",
      mtime: "2026-01-14T02:17:00Z",
      size: 33,
      inode: 3001050,
    },
    {
      path: "/var/log/.archive/decoy_final.flag",
      type: "file",
      content: "FLAG{persistence_check_found_it}",
      permissions: "-rw-r-----",
      owner: "root",
      group: "backup",
      mtime: "2026-01-14T03:45:00Z",
      size: 33,
      inode: 3001051,
    },
    // Standard directories
    {
      path: "/home/participant",
      type: "dir",
      permissions: "drwxr-xr-x",
      owner: "participant",
      group: "participant",
      mtime: "2026-01-15T10:30:00Z",
      size: 4096,
      inode: 3001060,
      children: ["invoice.pdf", ".bash_history"],
    },
    {
      path: "/home/participant/.bash_history",
      type: "file",
      content: `ls -la
cat invoice.pdf
file invoice.pdf
tar -xzf invoice.pdf
strings suspicious_binary
find /var -name "*.log" -newer invoice.pdf
stat /var/log/.correlated
stat /var/log/.incidents
cat /var/log/.incidents/auth_trace.log
cat /var/log/.incidents/cron_trace.log
sudo -l
cat /var/log/.final_stash/final_flag.txt`,
      permissions: "-rw-------",
      owner: "participant",
      group: "participant",
      mtime: "2026-01-15T11:00:00Z",
      size: 256,
      inode: 3001061,
    },
    {
      path: "/etc",
      type: "dir",
      permissions: "drwxr-xr-x",
      owner: "root",
      group: "root",
      mtime: "2026-01-14T02:00:00Z",
      size: 4096,
      inode: 3001070,
    },
    {
      path: "/var",
      type: "dir",
      permissions: "drwxr-xr-x",
      owner: "root",
      group: "root",
      mtime: "2026-01-14T02:00:00Z",
      size: 4096,
      inode: 3001080,
    },
    {
      path: "/var/log",
      type: "dir",
      permissions: "drwxr-xr-x",
      owner: "root",
      group: "adm",
      mtime: "2026-01-15T11:00:00Z",
      size: 4096,
      inode: 3001081,
    },
    {
      path: "/var/backups",
      type: "dir",
      permissions: "drwxr-xr-x",
      owner: "root",
      group: "root",
      mtime: "2026-01-14T02:00:00Z",
      size: 4096,
      inode: 3001082,
    },
    {
      path: "/opt",
      type: "dir",
      permissions: "drwxr-xr-x",
      owner: "root",
      group: "root",
      mtime: "2026-01-14T02:00:00Z",
      size: 4096,
      inode: 3001090,
    },
    {
      path: "/opt/tools",
      type: "dir",
      permissions: "drwxr-xr-x",
      owner: "root",
      group: "root",
      mtime: "2026-01-14T03:00:00Z",
      size: 4096,
      inode: 3001091,
    },
    {
      path: "/home",
      type: "dir",
      permissions: "drwxr-xr-x",
      owner: "root",
      group: "root",
      mtime: "2026-01-01T00:00:00Z",
      size: 4096,
      inode: 3001100,
    },
    {
      path: "/srv",
      type: "dir",
      permissions: "drwxr-xr-x",
      owner: "root",
      group: "root",
      mtime: "2026-01-01T00:00:00Z",
      size: 4096,
      inode: 3001110,
    },
  ],
};

export const roundVFSMap: Record<number, VFSRound> = {
  1: round1VFS,
  2: round2VFS,
  3: round3VFS,
};

