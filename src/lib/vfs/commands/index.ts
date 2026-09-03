import { CommandResult } from "../../types";
import { VFSEngine } from "../engine";

export function executeCommand(
  cmd: string,
  args: string[],
  vfs: VFSEngine,
  cwd: string,
  env: Record<string, string>,
  scratchSpace: Record<string, string>,
  currentUser: string = "participant",
  stdin?: string
): CommandResult {
  switch (cmd) {
    case "pwd":
      return { output: cwd };
    case "ls":
      return handleLs(args, vfs, cwd);
    case "cd":
      return handleCd(args, vfs, cwd);
    case "cat":
      return handleCat(args, vfs, cwd, currentUser);
    case "head":
      return handleHead(args, vfs, cwd, currentUser);
    case "tail":
      return handleTail(args, vfs, cwd, currentUser);
    case "less":
      return handleCat(args, vfs, cwd, currentUser);
    case "find":
      return handleFind(args, vfs, cwd);
    case "grep":
      return handleGrep(args, vfs, cwd);
    case "stat":
      return handleStat(args, vfs, cwd);
    case "chmod":
      return handleChmod(args, vfs, cwd);
    case "chown":
      return handleChown(args, vfs, cwd);
    case "id":
      return handleId(args, currentUser);
    case "groups":
      return { output: "participant backup" };
    case "env":
      return handleEnv(env);
    case "echo":
      return handleEcho(args, env);
    case "history":
      return handleHistory(args, vfs, cwd);
    case "readlink":
      return handleReadlink(args, vfs, cwd);
    case "file":
      return handleFile(args, vfs, cwd);
    case "strings":
      return handleStrings(args, vfs, cwd);
    case "tar":
    case "gzip":
    case "unzip":
    case "zip":
      return handleArchive(cmd, args, vfs, cwd);
    case "base64":
      return handleBase64(args, stdin);
    case "xxd":
      return handleXxd(args, stdin);
    case "sort":
      return { output: handleSort(args, stdin) };
    case "cut":
      return { output: handleCut(args, stdin) };
    case "wc":
      return { output: handleWc(args, stdin) };
    case "paste":
      return handlePaste(args, stdin);
    case "join":
      return handleJoin(args, stdin);
    case "sudo":
      return handleSudo(args, cwd, env);
    case "clear":
      return { output: "", clear: true };
    case "help":
      return {
        output: [
          "Operation Blackout — Available Commands:",
          "  pwd, ls, cd, cat, head, tail, less",
          "  find, grep, stat, file, strings",
          "  readlink, tar, gzip, unzip",
          "  base64, xxd, sort, cut, wc",
          "  id, groups, env, history",
          "  sudo, clear, help, whoami",
          "  submit <FLAG{...}> — Submit your flag",
          "  timeline <summary> — Submit Round 3 investigation timeline",
          "",
          "Type 'help' for this message.",
        ].join("\n"),
      };
    case "whoami":
      return { output: currentUser };
    case "submit":
      return { output: "Flag submission handled by the system." };
    default:
      return {
        output: `bash: ${cmd}: command not found`,
        error: true,
      };
  }
}

function handleLs(
  args: string[],
  vfs: VFSEngine,
  cwd: string
): CommandResult {
  const showAll = args.includes("-a") || args.includes("-la") || args.includes("-al");
  const showLong = args.includes("-l") || args.includes("-la") || args.includes("-al");

  const targetPath = args.find(
    (a) => !a.startsWith("-") && a !== "ls"
  ) || cwd;

  const resolvedPath = vfs.resolvePath(targetPath, cwd);
  const nodes = vfs.listDir(resolvedPath, showAll);

  if (nodes.length === 0) {
    const node = vfs.getNode(resolvedPath);
    if (node && node.type === "file") {
      if (showLong) {
        return {
          output: `${node.permissions} 1 ${node.owner} ${node.group} ${String(node.size).padStart(6)} ${formatDate(node.mtime)} ${node.path.split("/").pop()}`,
        };
      }
      return { output: node.path.split("/").pop() || "" };
    }
    return { output: "" };
  }

  if (showLong) {
    const lines = nodes.map((node) => {
      const name = node.path.split("/").pop() || "";
      const linkCount = node.type === "dir" ? 2 : 1;
      return `${node.permissions} ${String(linkCount).padStart(2)} ${node.owner.padEnd(12)} ${node.group.padEnd(12)} ${String(node.size).padStart(6)} ${formatDate(node.mtime)} ${name}`;
    });

    const total = nodes.reduce((sum, n) => sum + n.size, 0);
    return { output: `total ${total}\n${lines.join("\n")}` };
  }

  const names = nodes.map((n) => {
    const name = n.path.split("/").pop() || "";
    if (n.type === "dir") return `${name}/`;
    if (n.type === "symlink") return `${name}@`;
    return name;
  });

  return { output: names.join("  ") };
}

function handleCd(
  args: string[],
  vfs: VFSEngine,
  cwd: string
): CommandResult {
  const target = args[0] || "~";
  const resolvedPath = vfs.resolvePath(target, cwd);

  const node = vfs.getNode(resolvedPath);
  if (node && node.type !== "dir") {
    return {
      output: `bash: cd: ${target}: Not a directory`,
      error: true,
    };
  }

  if (resolvedPath === "/" || node) {
    return { output: "", newCwd: resolvedPath };
  }

  const exists = Array.from(vfs["nodes"].keys()).some(
    (p) => p.startsWith(resolvedPath + "/") || p === resolvedPath
  );

  if (exists) {
    return { output: "", newCwd: resolvedPath };
  }

  return {
    output: `bash: cd: ${target}: No such file or directory`,
    error: true,
  };
}

function handleCat(
  args: string[],
  vfs: VFSEngine,
  cwd: string,
  currentUser: string
): CommandResult {
  const target = args.find((a) => !a.startsWith("-")) || "";
  if (!target) {
    return { output: "cat: missing operand", error: true };
  }

  const resolvedPath = vfs.resolvePath(target, cwd);
  const node = vfs.getNode(resolvedPath);

  if (!node) {
    return {
      output: `cat: ${target}: No such file or directory`,
      error: true,
    };
  }

  if (node.type === "dir") {
    return {
      output: `cat: ${target}: Is a directory`,
      error: true,
    };
  }

  // Resolve symlinks before permission check
  let targetNode = node;
  if (node.type === "symlink" && node.target) {
    targetNode = vfs.getNode(vfs.resolvePath(node.target, "/")) || node;
  }

  const userGroups = currentUser === "svc-unknown"
    ? ["svc-unknown", "svc-backup", "shadow"]
    : ["participant", "backup"];

  if (!vfs.canRead(targetNode, currentUser, userGroups)) {
    return {
      output: `cat: ${target}: Permission denied`,
      error: true,
    };
  }

  return { output: targetNode.content || "" };
}

function handleHead(
  args: string[],
  vfs: VFSEngine,
  cwd: string,
  currentUser: string
): CommandResult {
  let lines = 10;
  const nIdx = args.indexOf("-n");
  if (nIdx !== -1 && args[nIdx + 1]) {
    lines = parseInt(args[nIdx + 1]) || 10;
  }

  const target = args.find((a) => !a.startsWith("-") && a !== String(lines));
  if (!target) {
    return { output: "head: missing operand", error: true };
  }

  const result = handleCat([target], vfs, cwd, currentUser);
  if (result.error) return result;

  const outputLines = result.output.split("\n").slice(0, lines);
  return { output: outputLines.join("\n") };
}

function handleTail(
  args: string[],
  vfs: VFSEngine,
  cwd: string,
  currentUser: string
): CommandResult {
  let lines = 10;
  const nIdx = args.indexOf("-n");
  if (nIdx !== -1 && args[nIdx + 1]) {
    lines = parseInt(args[nIdx + 1]) || 10;
  }

  const target = args.find((a) => !a.startsWith("-") && a !== String(lines));
  if (!target) {
    return { output: "tail: missing operand", error: true };
  }

  const result = handleCat([target], vfs, cwd, currentUser);
  if (result.error) return result;

  const outputLines = result.output.split("\n");
  return { output: outputLines.slice(-lines).join("\n") };
}

function handleFind(
  args: string[],
  vfs: VFSEngine,
  cwd: string
): CommandResult {
  let startPath = cwd;
  let namePattern: string | undefined;
  let typeFilter: string | undefined;
  let newerRef: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-name" && args[i + 1]) {
      namePattern = args[++i];
    } else if (args[i] === "-iname" && args[i + 1]) {
      namePattern = args[++i];
    } else if (args[i] === "-type" && args[i + 1]) {
      typeFilter = args[++i];
    } else if (args[i] === "-newer" && args[i + 1]) {
      newerRef = args[++i];
    } else if (!args[i].startsWith("-")) {
      startPath = args[i];
    }
  }

  const resolvedPath = vfs.resolvePath(startPath, cwd);
  let nodes = vfs.searchFiles(namePattern || ".*", resolvedPath, typeFilter, true);

  if (newerRef) {
    const refNode = vfs.getNode(vfs.resolvePath(newerRef, cwd));
    if (refNode) {
      const refTime = new Date(refNode.mtime).getTime();
      nodes = nodes.filter(
        (n) => new Date(n.mtime).getTime() > refTime
      );
    }
  }

  if (namePattern) {
    const regex = new RegExp(
      namePattern.replace(/\*/g, ".*").replace(/\?/g, "."),
      "i"
    );
    nodes = nodes.filter((n) => {
      const name = n.path.split("/").pop() || "";
      return regex.test(name);
    });
  }

  return { output: nodes.map((n) => n.path).join("\n") };
}

function handleGrep(
  args: string[],
  vfs: VFSEngine,
  cwd: string
): CommandResult {
  let recursive = false;
  let extendedRegex = false;
  let pattern: string | undefined;
  let targetPath = cwd;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-r") recursive = true;
    else if (args[i] === "-E") extendedRegex = true;
    else if (!args[i].startsWith("-") && !pattern) {
      pattern = args[i];
    } else if (!args[i].startsWith("-")) {
      targetPath = args[i];
    }
  }

  if (!pattern) {
    return { output: "grep: missing pattern", error: true };
  }

  const resolvedPath = vfs.resolvePath(targetPath, cwd);
  const results = vfs.grepContent(pattern, resolvedPath, recursive, extendedRegex);

  const output: string[] = [];
  for (const { node, matches } of results) {
    for (const match of matches) {
      if (recursive || results.length > 1) {
        output.push(`${node.path}:${match}`);
      } else {
        output.push(match);
      }
    }
  }

  return { output: output.join("\n") };
}

function handleStat(
  args: string[],
  vfs: VFSEngine,
  cwd: string
): CommandResult {
  const target = args.find((a) => !a.startsWith("-"));
  if (!target) {
    return { output: "stat: missing operand", error: true };
  }

  const resolvedPath = vfs.resolvePath(target, cwd);
  const node = vfs.getNode(resolvedPath);

  if (!node) {
    return {
      output: `stat: cannot stat '${target}': No such file or directory`,
      error: true,
    };
  }

  return {
    output: [
      `  File: ${node.path}`,
      `  Size: ${node.size}\t\tBlocks: ${Math.ceil(node.size / 512) * 8}\t\tIO Block: 4096\t${node.type}`,
      `Access: (${node.permissions})\tUid: (\t${node.owner})\tGid: (\t${node.group})`,
      `Access: ${node.mtime}`,
      `Modify: ${node.mtime}`,
      `Change: ${node.mtime}`,
      ` Birth: ${node.mtime}`,
    ].join("\n"),
  };
}

function handleChmod(
  args: string[],
  vfs: VFSEngine,
  cwd: string
): CommandResult {
  const target = args.find((a) => !a.startsWith("-") && !a.match(/^\d/));
  if (!target) {
    return { output: "chmod: missing operand", error: true };
  }

  const resolvedPath = vfs.resolvePath(target, cwd);
  const node = vfs.getNode(resolvedPath);

  if (!node) {
    return {
      output: `chmod: cannot access '${target}': No such file or directory`,
      error: true,
    };
  }

  return {
    output: `chmod: operation not permitted (read-only sandbox)`,
    error: true,
  };
}

function handleChown(
  args: string[],
  _vfs: VFSEngine,
  _cwd: string
): CommandResult {
  const target = args.find((a) => !a.startsWith("-") && !a.includes(":"));
  if (!target) {
    return { output: "chown: missing operand", error: true };
  }

  return {
    output: `chown: operation not permitted (read-only sandbox)`,
    error: true,
  };
}

function handleId(
  args: string[],
  currentUser: string
): CommandResult {
  return {
    output: `uid=1000(${currentUser}) gid=1000(${currentUser}) groups=1000(${currentUser}),1001(backup)`,
  };
}

function handleEnv(env: Record<string, string>): CommandResult {
  const lines = Object.entries(env).map(
    ([key, value]) => `${key}=${value}`
  );
  return { output: lines.join("\n") };
}

function handleEcho(
  args: string[],
  env: Record<string, string>
): CommandResult {
  const noNewline = args.includes("-n");
  const parts = args.filter((a) => a !== "-n").map((arg) => {
    // Expand $VARIABLE references
    return arg.replace(/\$([A-Z_]+[A-Z0-9_]*)/g, (_, name) => env[name] || "");
  });
  return { output: parts.join(" ") + (noNewline ? "" : "") };
}

function handleHistory(
  args: string[],
  vfs: VFSEngine,
  _cwd: string
): CommandResult {
  const historyPath = "/home/participant/.bash_history";
  const node = vfs.getNode(historyPath);

  if (!node || !node.content) {
    return { output: "No history available." };
  }

  const lines = node.content.split("\n");
  return {
    output: lines.map((line, i) => `  ${i + 1}  ${line}`).join("\n"),
  };
}

function handleReadlink(
  args: string[],
  vfs: VFSEngine,
  cwd: string
): CommandResult {
  const target = args.find((a) => !a.startsWith("-"));
  if (!target) {
    return { output: "readlink: missing operand", error: true };
  }

  const resolvedPath = vfs.resolvePath(target, cwd);
  const node = vfs.getNode(resolvedPath);

  if (!node) {
    return {
      output: `readlink: '${target}': No such file or directory`,
      error: true,
    };
  }

  if (node.type !== "symlink" || !node.target) {
    return { output: "" };
  }

  return { output: node.target };
}

function handleFile(
  args: string[],
  vfs: VFSEngine,
  cwd: string
): CommandResult {
  const target = args.find((a) => !a.startsWith("-"));
  if (!target) {
    return { output: "file: missing operand", error: true };
  }

  const resolvedPath = vfs.resolvePath(target, cwd);
  const node = vfs.getNode(resolvedPath);

  if (!node) {
    return {
      output: `file: '${target}': cannot open (No such file or directory)`,
      error: true,
    };
  }

  if (node.type === "dir") {
    return { output: `${target}: directory` };
  }

  if (node.type === "symlink") {
    return { output: `${target}: symbolic link to ${node.target}` };
  }

  // Check for overridden file type (for puzzle purposes)
  const content = node.content || "";
  if (content.startsWith("\x1f\x8b")) {
    return { output: `${target}: gzip compressed data` };
  }
  if (content.startsWith("PK")) {
    return { output: `${target}: Zip archive data` };
  }
  if (content.startsWith("ustar")) {
    return { output: `${target}: POSIX tar archive` };
  }

  return { output: `${target}: ASCII text` };
}

function handleStrings(
  args: string[],
  vfs: VFSEngine,
  cwd: string
): CommandResult {
  const target = args.find((a) => !a.startsWith("-"));
  if (!target) {
    return { output: "strings: missing operand", error: true };
  }

  const resolvedPath = vfs.resolvePath(target, cwd);
  const node = vfs.getNode(resolvedPath);

  if (!node) {
    return {
      output: `strings: '${target}': No such file or directory`,
      error: true,
    };
  }

  if (node.readableStrings && node.readableStrings.length > 0) {
    return { output: node.readableStrings.join("\n") };
  }

  // Default: return printable substrings of 4+ chars
  const content = node.content || "";
  const strings = content.match(/[ -~]{4,}/g) || [];
  return { output: strings.join("\n") };
}

function handleArchive(
  cmd: string,
  args: string[],
  vfs: VFSEngine,
  cwd: string
): CommandResult {
  const target = args.find(
    (a) => !a.startsWith("-") && !a.endsWith(".tar") && !a.endsWith(".gz") && !a.endsWith(".zip")
  ) || args.find((a) => !a.startsWith("-"));

  if (!target) {
    return { output: `${cmd}: missing operand`, error: true };
  }

  const resolvedPath = vfs.resolvePath(target, cwd);
  const node = vfs.getNode(resolvedPath);

  if (!node) {
    return {
      output: `${cmd}: ${target}: No such file or directory`,
      error: true,
    };
  }

  if (!node.archiveContents || node.archiveContents.length === 0) {
    return {
      output: `${cmd}: ${target}: not an archive (or empty archive)`,
      error: true,
    };
  }

  // Simulate extraction by materializing the nested contents into the VFS
  vfs.extract(resolvedPath, cwd);

  const names = (node.archiveContents || []).map(
    (c) => c.path.split("/").pop()
  );

  return {
    output: `Extracting ${target} ...\nextracted: ${names.join(", ")}`,
  };
}

function handleXxd(args: string[], stdin?: string): CommandResult {
  // Support `xxd -r -p <hex>` and `echo <hex> | xxd -r -p`
  const reverse = args.includes("-r");
  const plain = args.includes("-p") || args.includes("-plain");
  const input =
    (stdin && stdin.trim()) ||
    args.find((a) => !a.startsWith("-")) ||
    "";

  if (!input) {
    return { output: "xxd: no input", error: true };
  }

  try {
    const clean = input.replace(/\s+/g, "");
    if (reverse) {
      if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2 !== 0) {
        return { output: "xxd: invalid hex string", error: true };
      }
      const bytes = clean.match(/.{1,2}/g) || [];
      const decoded = bytes
        .map((b) => String.fromCharCode(parseInt(b, 16)))
        .join("");
      return { output: decoded };
    }
    // Encode mode: hex dump of input
    const hex = Buffer.from(input).toString("hex");
    return { output: plain ? hex : `${hex}` };
  } catch {
    return { output: "xxd: invalid input", error: true };
  }
}

function handleBase64(args: string[], stdin?: string): CommandResult {
  const decodeFlag = args.includes("-d") || args.includes("--decode");
  // Prefer piped stdin, else read from args
  const input = stdin && stdin.trim() ? stdin : args.find((a) => !a.startsWith("-"));

  if (!input) {
    return { output: "base64: missing operand", error: true };
  }

  try {
    if (decodeFlag) {
      const decoded = Buffer.from(input.trim(), "base64").toString("utf-8");
      return { output: decoded };
    } else {
      const encoded = Buffer.from(input).toString("base64");
      return { output: encoded };
    }
  } catch {
    return { output: "base64: invalid input", error: true };
  }
}

function handleSort(args: string[], stdin?: string): string {
  const hasReverse = args.includes("-r");
  const source = stdin || "";
  const lines = source.split("\n").filter(Boolean);
  lines.sort((a, b) => (hasReverse ? b.localeCompare(a) : a.localeCompare(b)));
  return lines.join("\n");
}

function handleCut(args: string[], stdin?: string): string {
  const source = stdin || "";
  const lines = source.split("\n");

  // Support -d<delim> -f<fields> and -c<chars>
  let delim = "\t";
  let fields: number[] = [];
  let chars: number[] = [];

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("-d")) {
      delim = a.slice(2) || args[i + 1] || "\t";
    } else if (a.startsWith("-f")) {
      fields = parseRanges(a.slice(2));
    } else if (a.startsWith("-c")) {
      chars = parseRanges(a.slice(2));
    } else if (a === "-d" && args[i + 1]) {
      delim = args[++i];
    }
  }

  return lines
    .map((line) => {
      if (chars.length > 0) {
        const selected = chars
          .filter((c) => c <= line.length)
          .map((c) => line[c - 1])
          .join("");
        return selected;
      }
      if (fields.length > 0) {
        const parts = line.split(delim);
        return fields
          .filter((f) => f <= parts.length)
          .map((f) => parts[f - 1])
          .join(delim);
      }
      return line;
    })
    .join("\n");
}

function handleWc(args: string[], stdin?: string): string {
  const source = stdin || "";
  const lines = source.split("\n").filter((l) => l.length > 0);
  const words = source.trim() ? source.trim().split(/\s+/).length : 0;
  const chars = source.length;
  const flag = args.find((a) => a.startsWith("-"));

  if (flag === "-l") return String(lines.length);
  if (flag === "-w") return String(words);
  if (flag === "-c" || flag === "-m") return String(chars);
  return `${lines.length} ${words} ${chars}`;
}

function handlePaste(args: string[], stdin?: string): CommandResult {
  const source = stdin || "";
  const files = args.filter((a) => !a.startsWith("-"));
  if (files.length === 0) {
    return { output: source };
  }
  return {
    output: `paste: ${files.join(", ")}: No such file or directory`,
    error: true,
  };
}

function handleJoin(args: string[], stdin?: string): CommandResult {
  const source = stdin || "";
  const files = args.filter((a) => !a.startsWith("-"));
  if (files.length === 0) {
    return { output: source };
  }
  return {
    output: `join: ${files.join(", ")}: No such file or directory`,
    error: true,
  };
}

function parseRanges(input: string): number[] {
  if (!input) return [];
  const nums: number[] = [];
  for (const part of input.split(",")) {
    if (part.includes("-")) {
      const [start, end] = part.split("-").map((n) => parseInt(n, 10));
      for (let i = start; i <= (end || start); i++) {
        nums.push(i);
      }
    } else if (part) {
      nums.push(parseInt(part, 10));
    }
  }
  return nums.filter((n) => !isNaN(n));
}

function handleSudo(
  args: string[],
  cwd: string,
  env: Record<string, string>
): CommandResult {
  if (args.includes("-l")) {
    const round = parseInt(env.ROUND || "1", 10);

    if (round === 2) {
      // Round 2: decoy sudo -l (tempting but irrelevant)
      return {
        output: [
          "Matching Defaults entries for participant on this host:",
          "    env_reset, mail_badpass, secure_path=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
          "",
          "User participant may run the following commands on this host:",
          "    (root) /usr/bin/base64",
          "    (root) /usr/bin/tail /var/backups/*",
        ].join("\n"),
      };
    }

    if (round === 3) {
      // Round 3: real sudo rule granting access to the final flag
      return {
        output: [
          "Matching Defaults entries for participant on this host:",
          "    env_reset, mail_badpass, secure_path=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
          "",
          "User participant may run the following commands on this host:",
          "    (root) NOPASSWD: /usr/bin/less /var/log/*",
          "    (svc-unknown) NOPASSWD: /bin/cat /var/log/.final_stash/*",
        ].join("\n"),
      };
    }

    // Round 1: minimal
    return {
      output: [
        "Matching Defaults entries for participant on this host:",
        "    env_reset, mail_badpass, secure_path=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
        "",
        "User participant may run the following commands on this host:",
        "    (ALL : ALL) ALL",
      ].join("\n"),
    };
  }

  return {
    output: "sudo: a password is required",
    error: true,
  };
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${month} ${day.toString().padStart(2, " ")} ${hours}:${minutes}`;
}
