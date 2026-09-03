import { Pipeline, ParsedCommand } from "../types";

export function parseInput(input: string): Pipeline {
  const trimmed = input.trim();
  if (!trimmed) {
    return { commands: [] };
  }

  const segments = splitByPipe(trimmed);

  const commands: ParsedCommand[] = segments.map((segment) => {
    return parseSegment(segment.trim());
  });

  return { commands };
}

function splitByPipe(input: string): string[] {
  const segments: string[] = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (char === "|" && !inSingleQuote && !inDoubleQuote) {
      segments.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  if (current) {
    segments.push(current);
  }

  return segments;
}

function parseSegment(segment: string): ParsedCommand {
  let redirect: ParsedCommand["redirect"];
  let cleanSegment = segment;

  const appendMatch = segment.match(/(.*)>>(.*)$/);
  const redirectMatch = segment.match(/(.*)>(.*)$/);

  if (appendMatch) {
    cleanSegment = appendMatch[1].trim();
    redirect = { file: appendMatch[2].trim(), append: true };
  } else if (redirectMatch && !segment.includes(">>")) {
    cleanSegment = redirectMatch[1].trim();
    redirect = { file: redirectMatch[2].trim(), append: false };
  }

  const tokens = tokenize(cleanSegment);

  if (tokens.length === 0) {
    return { cmd: "", args: [], redirect };
  }

  const cmd = tokens[0];
  const args = tokens.slice(1);

  return { cmd, args, redirect };
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (/\s/.test(char) && !inSingleQuote && !inDoubleQuote) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}
