# Operation Blackout — Build Spec (Simulated JS Terminal, No Docker/VM)

> **Purpose of this file:** Single source of truth for building "Operation Blackout" as a fully client/server-simulated Linux CTF — no real OS, no containers, no VMs. Everything (filesystem, permissions, command behavior) is a data model + a whitelisted command parser running in JS. This must run entirely on standard web hosting (Vercel/Render) with no persistent compute per participant. Build directly from this document. Difficulty curve is intentional: **Hard → Harder → Hardest.**

---

## 1. Story Overview

At **02:17 AM**, an unknown actor gained access to a Linux server. Files were deleted, logs were tampered with, and unfamiliar artifacts were planted across the filesystem. The administrator noticed the intrusion only after the fact. The attacker left a trail across three systems of increasing complexity. Participants play incident responder, using a simulated terminal to investigate a fake but internally-consistent filesystem.

There is **no real shell, no real OS, and no code execution** — every command is intercepted by a JS parser and resolved against a predefined virtual filesystem (VFS). This makes the experience 100% safe, infinitely scalable, and fully deterministic.

**Flag format:** `FLAG{snake_case_phrase}` — validated server-side on submission, not client-side.

---

## 2. Architecture

- **Frontend:** A terminal-emulator UI component (e.g. `xterm.js` or a custom `<input>` + scrollback log) that accepts text commands and renders text output. Runs fine on Vercel as a static/SPA build.
- **Command parser:** A JS function that tokenizes input (`command arg1 arg2 | command2 > file`) and dispatches to a whitelist of implemented command handlers. Anything not on the whitelist returns `command not found` — exactly like a real shell would for an unrecognized binary.
- **Virtual filesystem (VFS):** A JSON/JS object tree representing files and directories, each node carrying: `type` (file/dir/symlink), `content` (string or binary-simulated string), `permissions` (rwx string, e.g. `-rw-r--r--`), `owner`, `group`, `mtime`, `size`, and optional `target` (for symlinks).
- **Session state:** Per-participant current working directory, command history buffer, and environment variables — held in browser memory or a lightweight session store (e.g. a cookie/localStorage-backed state, or a serverless function call per command if you want server-authoritative state to prevent tampering).
- **Flag validation:** Submitted flags are checked against a server-side answer table (via a Render/Vercel serverless function + a database or even a simple signed-token scheme), not embedded in client-side JS, so participants can't just read the source to get answers.
- **Anti-cheat note:** Since the whole VFS ships to the client to be interactive, **do not embed the real flag strings in client-visible JS/JSON**. Store flags hashed or reference them by ID, and validate server-side. Decoy flags can be plaintext in the VFS since they're meant to be found (and rejected).

---

## 3. Whitelisted Commands & Simulated Behavior

Implement exactly these — nothing more. Each must behave close enough to real Linux to be intuitive, but only needs to support the flags/options actually required by the puzzles below.

| Command | Simulated behavior required |
|---|---|
| `pwd` | Return current path string |
| `ls`, `ls -la`, `ls -l` | List dir contents; `-a` reveals dotfiles; `-l` shows permissions/owner/size/mtime |
| `cd` | Change current dir; support `..`, `~`, absolute/relative paths |
| `cat` | Print file content; error on directories; respect permission field (deny if no read perm for "current user") |
| `less`, `head`, `tail` | Same content as `cat`, paginated/truncated behavior (head/tail take `-n`) |
| `find` | Support `-name`, `-iname`, `-newer`, `-type` against the VFS tree |
| `grep`, `grep -r`, `grep -E` | Pattern match file contents; `-r` recurses the VFS tree |
| `stat` | Show simulated metadata: owner, permissions, mtime, size, inode (fake but consistent) |
| `chmod` | Only needs to *display* what would change (participants mostly *read* permissions, not set them) — implement read-only unless a puzzle specifically requires changing perms on their own scratch files |
| `chown` | Same — display/read only in most puzzles |
| `id`, `groups` | Return the fake participant user's simulated UID/GID/group memberships |
| `env` | Print simulated environment variables (can contain encoded puzzle fragments) |
| `history` | Print simulated `.bash_history` content (pre-seeded per puzzle, not the participant's real input history — or optionally both, clearly separated) |
| `readlink` | Resolve a symlink node's `target` field |
| `file` | Return a fake "file type" string per node (used in Round 3 to reveal disguised extensions) |
| `strings` | Return only the human-readable substrings from a "binary" node's content (simulate by pre-splitting content into a `readableStrings` field on that node) |
| `tar`, `gzip`, `unzip`/`zip` (read-only extract) | Simulate "extraction" by revealing child nodes nested inside an `archiveContents` field — no real binary handling needed |
| `base64` (`-d`) | Actually decode/encode text — this can be real, since it's pure string manipulation, not OS interaction |
| `\|` (pipe) | Chain output of one command as input to next (needed for `grep`, `cut`, `sort` chains) |
| `>` (redirect) | Allow writing command output into a new file in the participant's writable scratch space only (never the puzzle VFS) |
| `sort`, `join`, `cut`, `paste`, `wc` | Basic text utilities — implement in pure JS since they're just string/array operations |
| `sudo -l` | Return a fixed simulated list of allowed commands for the fake user — used narratively in Round 3 |
| `clear`, `help`, `whoami` | Standard terminal conveniences |

Anything else (`rm`, `vim`, `ssh`, `curl`, real `chmod`/`chown` writes, package managers, etc.) should **not** be implemented — return `command not found` or `permission denied` as appropriate, reinforcing the sandboxed feel without needing real safety guarantees (there's nothing real to break).

---

## 4. Global Puzzle Rules

- Minimum chain length: **Round 1 = 3 commands, Round 2 = 5+, Round 3 = 8+ with a branch.**
- Every round has **at least 2 decoy flags** in valid `FLAG{...}` format, disambiguated only via metadata (owner/mtime) or cross-referencing another file — never distinguishable by content pattern alone.
- All file metadata (permissions, owner, mtime) must be **deliberately authored** per node — no defaults — since puzzles depend on reading them.
- No participant-facing hint text, command list, or "skills tested" callouts anywhere in the VFS, terminal `help` output, or UI chrome.

---

## 5. Round 1 — "The Point of Entry" (HARD)

### Narrative
Obvious logs (`/var/log/auth.log`, `/var/log/syslog`) are simulated as deleted/empty. Fragments survive in unexpected nodes.

### VFS puzzle chain to build
1. A node under an odd path (e.g. `/var/backups/.tmp_9f3a/fragment.log`) with `mtime` matching 02:17 — discoverable via `find / -newer <reference_node>` rather than by guessing the name.
2. That fragment's content references a username/session ID. `grep -r` across `/home`, `/opt`, `/srv` nodes locates a second file.
3. That second node is a dotfile (`.session_2_17`) with restrictive permissions requiring `id`/`groups` to confirm the fake user can read it.
4. Its content points to a path with a **deliberate case/typo mismatch** from the real target, so blind copy-paste fails and participants must notice the discrepancy.
5. The corrected real path resolves to a directory with the Round 1 flag node plus 2 decoy flag nodes. Disambiguation: the real flag node's `owner` field is `svc-backup`; decoys are owned by `root`/participant user — checked via `ls -l` or `stat`.

### Build notes
- Do not put the entry clue in the home directory root.
- Ensure `grep -r "FLAG{" /` alone returns 3 matches (1 real + 2 decoys) indistinguishable by content — only `stat`/`ls -l` disambiguates.
- Include one red-herring `/var/log/*` node with a near-02:17 fake mtime that dead-ends.

---

## 6. Round 2 — "What They Tried to Hide" (HARDER)

### Narrative
This trail is deliberately obscured via simulated permissions, encoding, and persistence artifacts.

### VFS puzzle chain to build
1. A key node has permission string `----------` (simulated `chmod 000`) and `owner: svc-unknown`. `cat` on it must return `Permission denied`. An alternate route exists: a backup copy inside a simulated `archiveContents` node with different (readable) permissions.
2. A simulated `env` output contains a base64-encoded fragment; participants pipe it through `base64 -d`.
3. A simulated `.bash_history` node contains partially truncated lines and one ROT13-encoded line revealing a second path.
4. A simulated cron file (`/etc/cron.d/fake-job`) references a script path; that path is actually a symlink node (`target` field) — resolved via `readlink` or by `ls -la` showing the `->` notation.
5. The resolved script's content (non-executable — `bash` isn't in the whitelist, so this is naturally enforced) reveals the next real path plus a styled-identical decoy path.
6. Final flag is **split across two separate file nodes** — participants must `cat` both and manually concatenate, or use `paste`. No single node contains the complete string.

### Build notes
- Include one decoy path reachable via an obvious wrong turn (e.g. simulated `sudo -l` shows a tempting-but-irrelevant entry).
- Enforce the 2-fragment flag split at the VFS data level — never store the full flag string in one node's content field, even server-side, until validation time.

---

## 7. Round 3 — "The Last Trace" (HARDEST)

### Narrative
A second, seemingly clean system. No obvious signs of compromise. Requires combining Round 1 + 2 techniques plus new ones. Non-linear — participants must determine the investigation's shape themselves.

### VFS puzzle chain to build
1. A node named `invoice.pdf` whose simulated `file` command output reveals it's actually a `gzip` stream (fake type mismatch) — must be "extracted" via the simulated `gzip`/`tar` commands to reveal nested `archiveContents`.
2. Nested archive (2+ levels: e.g. tar-inside-zip-inside-gzip, all simulated via nested `archiveContents` fields) contains a "binary" node.
3. The binary node isn't executable (no real execution exists anyway) — its `readableStrings` field (extracted via `strings`) reveals a second path plus a partial timestamp value.
4. **Branch point:** two sibling directories look identical. One is a fully-built decoy with its own self-consistent fake trail and decoy flag; the other is real. Disambiguation requires matching the timestamp/UID from step 3 against each candidate's `stat` metadata.
5. The genuine branch's log node must be correlated against a **second log node** (planted back in Round 2's cron artifact, referenced again here) — participants line up timestamps via `sort`/`join` or manual comparison to sequence attacker actions.
6. Correlated sequence reveals a **hex-encoded** path (different encoding from Round 2, so pattern memorization doesn't trivially transfer — implement hex decode as a pure string utility, invoked manually or via a whitelisted helper).
7. Final flag node requires simulated group membership, discoverable via a **real (non-decoy)** `sudo -l` entry this round — contrast with Round 2's red herring to reward careful reading.
8. At least 3 decoy flags exist across the archive layers/branch paths.

### Submission requirement
Alongside the flag, require a short **free-text 4–6 line timeline** submission (initial access → what was searched for → persistence → cleanup attempt). Store for manual/organizer review — do not attempt to auto-grade this field.

---

## 8. Flags & Answer Key (Organizer-Only — keep server-side, never in client bundle)

| Round | Flag (replace placeholders before launch) |
|---|---|
| 1 | `FLAG{the_attacker_did_not_choose_randomly}` |
| 2 | `FLAG{hidden_in_plain_permissions}` |
| 3 | `FLAG{the_trace_that_remained}` |

| Round | Core skills exercised |
|---|---|
| 1 | `find` (time-based), `grep -r`, `ls -la`, `stat`, ownership inspection, path precision |
| 2 | permission reasoning, `env`, base64/ROT13 decoding, `.bash_history` analysis, symlink/cron tracing, multi-file fragment assembly |
| 3 | `file`, nested archive extraction, `strings`, metadata correlation, hex decoding, legitimate `sudo -l` use, log correlation, timeline synthesis |

Keep this table out of all participant-facing UI, `help` output, and client-side source.

---

## 9. Implementation Notes for OpenCode

- **Stack suggestion:** React/Next.js frontend (deploys cleanly to Vercel), with the command parser as pure client-side JS for responsiveness, but flag validation and VFS-with-real-flags served via a serverless API route (Vercel Functions or Render web service) so answers never ship to the browser.
- **VFS as data, not code:** Define the filesystem as a JSON tree (one file per round) so puzzle content can be edited without touching parser logic. Structure suggestion:
  ```json
  {
    "path": "/var/backups/.tmp_9f3a/fragment.log",
    "type": "file",
    "content": "...",
    "permissions": "-rw-r--r--",
    "owner": "svc-backup",
    "group": "backup",
    "mtime": "2026-01-14T02:17:03Z",
    "size": 412
  }
  ```
- **Per-participant randomization (optional but recommended):** seed decoy owner names, red-herring paths, or fragment ordering per participant/session using a deterministic seed (e.g. hash of participant ID) so answers can't be shared verbatim between participants while structure stays fixed.
- **Terminal UX:** support command history via up/down arrows, tab-completion is optional (nice-to-have, not required for puzzle-solving), and a `clear` command for usability.
- **No real code execution anywhere** — this is the core safety property of this approach; double-check no command handler ever calls `eval`, shells out, or touches the real server filesystem based on user input.
- **Rate limiting / anti-brute-force on flag submission** — since there's no compute cost per attempt, add a simple cooldown or attempt cap server-side so participants can't script-guess flag strings.
