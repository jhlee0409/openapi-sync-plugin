/**
 * Elenchus MCP Server Types
 */

// =============================================================================
// Verification Criteria
// =============================================================================

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type IssueCategory =
  | 'SECURITY'
  | 'CORRECTNESS'
  | 'RELIABILITY'
  | 'MAINTAINABILITY'
  | 'PERFORMANCE';

export type IssueStatus =
  | 'RAISED'
  | 'CHALLENGED'
  | 'RESOLVED'
  | 'UNRESOLVED';

export interface Issue {
  id: string;
  category: IssueCategory;
  severity: Severity;
  summary: string;
  location: string;  // file:line
  description: string;
  evidence: string;
  raisedBy: 'verifier' | 'critic';
  raisedInRound: number;
  status: IssueStatus;
  resolvedInRound?: number;
  resolution?: string;
}

// =============================================================================
// Context Management
// =============================================================================

export interface FileContext {
  path: string;
  content?: string;
  dependencies: string[];
  layer: 'base' | 'discovered';
  addedInRound?: number;
}

export interface VerificationContext {
  target: string;
  requirements: string;
  files: Map<string, FileContext>;
  recentChanges?: string[];
  relatedTests?: string[];
}

// =============================================================================
// Session Management
// =============================================================================

export type SessionStatus =
  | 'initialized'
  | 'verifying'
  | 'converging'
  | 'converged'
  | 'forced_stop'
  | 'error';

export type RoundRole = 'verifier' | 'critic' | 'arbiter';

export interface Round {
  number: number;
  role: RoundRole;
  input: string;
  output: string;
  timestamp: string;
  issuesRaised: string[];
  issuesResolved: string[];
  contextExpanded: boolean;
  newFilesDiscovered: string[];
}

export interface Checkpoint {
  roundNumber: number;
  timestamp: string;
  contextSnapshot: string[];  // file paths
  issuesSnapshot: Issue[];
  canRollbackTo: boolean;
}

export interface Session {
  id: string;
  target: string;
  requirements: string;
  status: SessionStatus;
  currentRound: number;
  maxRounds: number;
  context: VerificationContext;
  issues: Issue[];
  rounds: Round[];
  checkpoints: Checkpoint[];
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Arbiter
// =============================================================================

export type InterventionType =
  | 'CONTEXT_EXPAND'
  | 'SOFT_CORRECT'
  | 'HARD_ROLLBACK'
  | 'LOOP_BREAK';

export interface ArbiterIntervention {
  type: InterventionType;
  reason: string;
  action: string;
  affectedRounds?: number[];
  newContextFiles?: string[];
  rollbackToCheckpoint?: number;
}

// =============================================================================
// Convergence
// =============================================================================

export interface ConvergenceStatus {
  isConverged: boolean;
  reason?: string;
  categoryCoverage: Record<IssueCategory, { checked: number; total: number }>;
  unresolvedIssues: number;
  criticalUnresolved: number;
  roundsWithoutNewIssues: number;
}

// =============================================================================
// Tool Responses
// =============================================================================

export interface StartSessionResponse {
  sessionId: string;
  status: SessionStatus;
  context: {
    target: string;
    filesCollected: number;
    requirements: string;
  };
}

export interface SubmitRoundResponse {
  roundNumber: number;
  role: RoundRole;
  issuesRaised: number;
  issuesResolved: number;
  contextExpanded: boolean;
  newFilesDiscovered: string[];
  convergence: ConvergenceStatus;
  intervention?: ArbiterIntervention;
  nextRole: RoundRole | 'complete';
}

export interface GetContextResponse {
  sessionId: string;
  target: string;
  requirements: string;
  files: Array<{
    path: string;
    layer: 'base' | 'discovered';
  }>;
  currentRound: number;
  issuesSummary: {
    total: number;
    bySeverity: Record<Severity, number>;
    byStatus: Record<IssueStatus, number>;
  };
}
