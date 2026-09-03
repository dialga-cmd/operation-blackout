export interface VFSNode {
  path: string;
  type: "file" | "dir" | "symlink";
  content?: string;
  permissions: string;
  owner: string;
  group: string;
  mtime: string;
  size: number;
  inode: number;
  target?: string;
  archiveContents?: VFSNode[];
  readableStrings?: string[];
  children?: string[];
}

export interface VFSRound {
  round: number;
  title: string;
  nodes: VFSNode[];
}

export interface SessionState {
  cwd: string;
  env: Record<string, string>;
  history: string[];
  scratchSpace: Record<string, string>;
  userId: string;
  roundId: number;
}

export interface CommandResult {
  output: string;
  error?: boolean;
  newCwd?: string;
  newEnv?: Record<string, string>;
  clear?: boolean;
}

export interface ParsedCommand {
  cmd: string;
  args: string[];
  input?: string;
  redirect?: { file: string; append: boolean };
}

export interface Pipeline {
  commands: ParsedCommand[];
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role?: "admin" | "participant";
  created_at: string;
}

export interface Round {
  id: number;
  number: number;
  title: string;
  unlock_date: string;
  is_active: boolean;
  max_score: number;
}

export interface UserProgress {
  id: string;
  user_id: string;
  round_id: number;
  status: "locked" | "available" | "in_progress" | "completed";
  started_at: string | null;
  completed_at: string | null;
  score: number | null;
}

export interface FlagAttempt {
  id: string;
  user_id: string;
  round_id: number;
  flag: string;
  submitted_at: string;
  correct: boolean;
}

export interface UserFlagKey {
  id: string;
  user_id: string;
  round_id: number;
  key: string;
  day_date: string;
  created_at: string;
}

export interface CheatAttempt {
  id: string;
  submitter_id: string;
  owner_id: string;
  flag: string;
  round_id: number;
  detected_at: string;
  ip: string | null;
  status: "banned" | "flagged";
}

export interface TimelineSubmission {
  id: string;
  user_id: string;
  round_id: number;
  content: string;
  submitted_at: string;
}
