import { VFSEngine } from "./engine";
import { parseInput } from "./parser";
import { executeCommand } from "./commands";
import { SessionState, CommandResult } from "../types";

export function executePipeline(
  input: string,
  vfs: VFSEngine,
  session: SessionState
): { output: string; session: SessionState; clear?: boolean } {
  const pipeline = parseInput(input);

  if (pipeline.commands.length === 0) {
    return { output: "", session };
  }

  let currentInput = "";
  let lastResult: CommandResult = { output: "" };
  const newSession = { ...session };

  for (const cmd of pipeline.commands) {
    if (cmd.cmd === "submit") {
      return {
        output: `submit ${cmd.args.join(" ")}`,
        session: newSession,
      };
    }

    if (cmd.cmd === "timeline") {
      return {
        output: `timeline ${cmd.args.join(" ")}`,
        session: newSession,
      };
    }

    const pipedInput = currentInput;

    if (cmd.cmd === "sudo") {
      if (cmd.args.includes("-l")) {
        lastResult = executeCommand("sudo", ["-l"], vfs, newSession.cwd,
          newSession.env, newSession.scratchSpace);
        currentInput = lastResult.output;
        continue;
      }

      if (cmd.args.length < 2) {
        lastResult = {
          output: "sudo: a password is required",
          error: true,
        };
        currentInput = lastResult.output;
        continue;
      }

      const subCmd = cmd.args[0];
      const subArgs = cmd.args.slice(1);
      const elevatedUser = "svc-unknown";

      const targetPath = subArgs.find((a) => !a.startsWith("-")) || "";
      const round = parseInt(newSession.env.ROUND || "1", 10);
      const permitted =
        round === 3 &&
        subCmd === "cat" &&
        targetPath.startsWith("/var/log/.final_stash/");

      if (!permitted) {
        lastResult = {
          output:
            "sudo: a password is required (or command not permitted by sudoers)",
          error: true,
        };
        currentInput = lastResult.output;
        continue;
      }

      lastResult = executeCommand(
        subCmd,
        subArgs,
        vfs,
        newSession.cwd,
        newSession.env,
        newSession.scratchSpace,
        elevatedUser,
        pipedInput
      );
      currentInput = lastResult.output;
      continue;
    }

    lastResult = executeCommand(
      cmd.cmd,
      cmd.args,
      vfs,
      newSession.cwd,
      newSession.env,
      newSession.scratchSpace,
      undefined,
      pipedInput
    );

    if (lastResult.newCwd) {
      newSession.cwd = lastResult.newCwd;
    }
    if (lastResult.newEnv) {
      newSession.env = { ...newSession.env, ...lastResult.newEnv };
    }

    currentInput = lastResult.output;
  }

  const lastCmd = pipeline.commands[pipeline.commands.length - 1];
  if (lastCmd.redirect) {
    const filePath = lastCmd.redirect.file;
    const resolvedPath = vfs.resolvePath(filePath, newSession.cwd);

    if (resolvedPath.startsWith("/tmp/") || resolvedPath.startsWith("/scratch/")) {
      newSession.scratchSpace[resolvedPath] = currentInput;
      return {
        output: "",
        session: newSession,
      };
    }

    return {
      output: `bash: ${filePath}: Cannot write to puzzle filesystem`,
      session: newSession,
    };
  }

  newSession.history = [...newSession.history, input].slice(-100);

  return {
    output: lastResult.output,
    session: newSession,
    clear: lastResult.clear,
  };
}
