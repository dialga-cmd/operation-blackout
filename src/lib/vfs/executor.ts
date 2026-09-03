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
    // Handle submit command specially
    if (cmd.cmd === "submit") {
      return {
        output: `submit ${cmd.args.join(" ")}`,
        session: newSession,
      };
    }

    // Handle timeline command specially (Round 3)
    if (cmd.cmd === "timeline") {
      return {
        output: `timeline ${cmd.args.join(" ")}`,
        session: newSession,
      };
    }

    // Pass piped stdin to the command
    const pipedInput = currentInput;

    // sudo prefix: run the following command as the elevated user, but ONLY
    // for the commands/rules permitted by the simulated sudoers (Round 3).
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

      // Only permit sudo for the real Round 3 rule: cat on the final stash
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

      // Permit sudo cat within the allowed paths (the non-decoy sudo -l rule)
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

    // Update session if needed
    if (lastResult.newCwd) {
      newSession.cwd = lastResult.newCwd;
    }
    if (lastResult.newEnv) {
      newSession.env = { ...newSession.env, ...lastResult.newEnv };
    }

    currentInput = lastResult.output;
  }

  // Handle redirect
  const lastCmd = pipeline.commands[pipeline.commands.length - 1];
  if (lastCmd.redirect) {
    const filePath = lastCmd.redirect.file;
    const resolvedPath = vfs.resolvePath(filePath, newSession.cwd);

    // Only allow writing to scratch space
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

  // Add to history
  newSession.history = [...newSession.history, input].slice(-100);

  return {
    output: lastResult.output,
    session: newSession,
    clear: lastResult.clear,
  };
}
