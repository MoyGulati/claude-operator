export type TaskStatus = 'pending' | 'active' | 'done' | 'failed' | 'halted';
export type WorkerType = 'named' | 'headless';
export type WorkerStatus = 'running' | 'blocked' | 'stalled' | 'done' | 'failed';
export type MemoryTier = 'global' | 'project';
export type JudgmentOutcome = 'success' | 'failure' | 'unknown';
export type GuardrailScope = 'global' | 'project';
export type PermissionLevel = 'standard' | 'elevated' | 'sandboxed';

export interface Task {
  id: number;
  goal: string;
  project_path: string;
  status: TaskStatus;
  worker_id: string | null;
  created_at: string;
  completed_at: string | null;
  result: string | null;
  retry_count: number;
}

export interface Worker {
  id: string;
  task_id: number;
  type: WorkerType;
  session_name: string | null;
  pid: number | null;
  status: WorkerStatus;
  last_output: string;
  updated_at: string;
  worktree_path: string;
  worktree_branch: string;
  last_heartbeat_at: string | null;
}

export interface Guardrail {
  id: number;
  rule: string;
  scope: GuardrailScope;
  project_path: string | null;
  created_by: 'human' | 'operator';
  source_judgment_call_id: number | null;
  active: boolean;
  created_at: string;
  max_concurrent_workers: number;
  max_tokens_per_task: number | null;
  cost_alert_threshold_usd: number | null;
  worker_permission_level: PermissionLevel;
}

export interface MemoryGlobal {
  id: number;
  pattern: string;
  context: string;
  outcome: string;
  confidence: number;
  used_count: number;
  created_at: string;
  last_validated_at: string | null;
  pending_classification: boolean;
  embedding: Buffer | null;
}

export interface MemoryProject {
  id: number;
  project_path: string;
  pattern: string;
  context: string;
  outcome: string;
  confidence: number;
  used_count: number;
  created_at: string;
  last_validated_at: string | null;
  embedding: Buffer | null;
}

export interface JudgmentCall {
  id: number;
  task_id: number;
  source: 'memory' | 'internet' | 'operator_reasoning';
  decision: string;
  context: string;
  outcome: JudgmentOutcome;
  reviewed: boolean;
  created_at: string;
}

export interface WorkerHeartbeat {
  worker_id: string;
  status: WorkerStatus;
  last_output: string;
  updated_at: string;
}

export interface LogEntry {
  ts: string;
  event: string;
  [key: string]: unknown;
}
