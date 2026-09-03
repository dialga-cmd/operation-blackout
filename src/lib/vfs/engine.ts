import { VFSNode, VFSRound } from "../types";

export class VFSEngine {
  private nodes: Map<string, VFSNode> = new Map();
  private round: VFSRound;

  constructor(roundData: VFSRound) {
    this.round = roundData;
    for (const node of roundData.nodes) {
      this.nodes.set(node.path, node);
    }
  }

  getNode(path: string): VFSNode | undefined {
    return this.nodes.get(path);
  }

  resolvePath(path: string, cwd: string): string {
    if (path === "~") return "/home/participant";
    if (path.startsWith("~/")) {
      path = "/home/participant" + path.slice(1);
    }
    if (!path.startsWith("/")) {
      path = cwd + (cwd.endsWith("/") ? "" : "/") + path;
    }

    const parts = path.split("/").filter(Boolean);
    const resolved: string[] = [];

    for (const part of parts) {
      if (part === ".") continue;
      if (part === "..") {
        resolved.pop();
      } else {
        resolved.push(part);
      }
    }

    return "/" + resolved.join("/");
  }

  listDir(path: string, showHidden: boolean = false): VFSNode[] {
    const result: VFSNode[] = [];
    const prefix = path.endsWith("/") ? path : path + "/";

    for (const [nodePath, node] of this.nodes) {
      if (nodePath.startsWith(prefix)) {
        const remainder = nodePath.slice(prefix.length);
        const isDirectChild =
          !remainder.includes("/") || remainder.endsWith("/");

        if (isDirectChild) {
          const name = remainder.split("/").filter(Boolean).pop();
          if (name && (showHidden || !name.startsWith("."))) {
            result.push(node);
          }
        }
      }
    }

    for (const [nodePath, node] of this.nodes) {
      const parentDir =
        nodePath.substring(0, nodePath.lastIndexOf("/")) + "/";
      if (parentDir === prefix || (path === "/" && !nodePath.includes("/", 1))) {
        const name = nodePath.split("/").pop();
        if (name && (showHidden || !name.startsWith("."))) {
          if (!result.find((n) => n.path === node.path)) {
            result.push(node);
          }
        }
      }
    }

    return result;
  }

  searchFiles(
    pattern: string,
    startPath: string = "/",
    type?: string,
    nameOnly: boolean = false
  ): VFSNode[] {
    const results: VFSNode[] = [];
    const regex = new RegExp(
      pattern.replace(/\*/g, ".*").replace(/\?/g, "."),
      "i"
    );

    for (const [, node] of this.nodes) {
      if (!node.path.startsWith(startPath)) continue;

      if (type) {
        if (type === "f" && node.type !== "file") continue;
        if (type === "d" && node.type !== "dir") continue;
        if (type === "l" && node.type !== "symlink") continue;
      }

      const name = node.path.split("/").pop() || "";
      if (nameOnly) {
        if (regex.test(name)) results.push(node);
      } else {
        if (regex.test(node.path) || regex.test(name)) results.push(node);
      }
    }

    return results;
  }

  grepContent(
    pattern: string,
    startPath: string = "/",
    recursive: boolean = false,
    extendedRegex: boolean = false
  ): { node: VFSNode; matches: string[] }[] {
    const results: { node: VFSNode; matches: string[] }[] = [];
    const regex = new RegExp(pattern, extendedRegex ? "g" : "gi");

    for (const [, node] of this.nodes) {
      if (node.type !== "file" || !node.content) continue;
      if (!recursive && !node.path.startsWith(startPath)) continue;
      if (recursive && !node.path.startsWith(startPath)) continue;

      const lines = node.content.split("\n");
      const matches: string[] = [];

      for (const line of lines) {
        if (regex.test(line)) {
          matches.push(line);
        }
        regex.lastIndex = 0;
      }

      if (matches.length > 0) {
        results.push({ node, matches });
      }
    }

    return results;
  }

  getNodePermissions(node: VFSNode): {
    ownerRead: boolean;
    ownerWrite: boolean;
    ownerExec: boolean;
  } {
    const perms = node.permissions;
    return {
      ownerRead: perms[1] === "r",
      ownerWrite: perms[2] === "w",
      ownerExec: perms[3] === "x",
    };
  }

  canRead(
    node: VFSNode,
    currentUser: string,
    userGroups: string[]
  ): boolean {
    const p = node.permissions;
    if (node.type === "dir") {
      return p[1] === "r" || p[4] === "r" || p[7] === "r";
    }
    if (node.owner === currentUser) {
      return p[1] === "r";
    }
    if (userGroups.includes(node.group)) {
      return p[4] === "r";
    }
    return p[7] === "r";
  }

  canExecute(
    node: VFSNode,
    currentUser: string,
    userGroups: string[]
  ): boolean {
    const p = node.permissions;
    if (node.owner === currentUser) return p[3] === "x";
    if (userGroups.includes(node.group)) return p[6] === "x";
    return p[9] === "x";
  }

  getRound(): VFSRound {
    return this.round;
  }

  extract(path: string, destDir: string): string[] {
    const node = this.nodes.get(path);
    if (!node || !node.archiveContents || node.archiveContents.length === 0) {
      return [];
    }

    const extracted: string[] = [];

    const addChildren = (children: VFSNode[], parentPath: string) => {
      for (const child of children) {
        const name = child.path.split("/").pop() || child.path;
        const childPath = `${parentPath}/${name}`.replace(/\/+/g, "/");
        const materialized: VFSNode = {
          ...child,
          path: childPath,
        };

        this.nodes.set(materialized.path, materialized);
        extracted.push(materialized.path);

        if (child.archiveContents && child.archiveContents.length > 0) {
          addChildren(child.archiveContents, childPath);
        }
      }
    };

    addChildren(node.archiveContents, destDir);
    return extracted;
  }
}
