/**
 * Elenchus MCP Tools
 */

import { z } from 'zod';
import {
  Session,
  Issue,
  Round,
  StartSessionResponse,
  SubmitRoundResponse,
  GetContextResponse,
  ArbiterIntervention,
  InterventionType
} from '../types/index.js';
import {
  createSession,
  getSession,
  updateSessionStatus,
  addRound,
  upsertIssue,
  createCheckpoint,
  rollbackToCheckpoint,
  checkConvergence,
  getIssuesSummary,
  listSessions
} from '../state/session.js';
import {
  initializeContext,
  expandContext,
  findNewFileReferences,
  getContextSummary
} from '../state/context.js';

// =============================================================================
// Tool Schemas
// =============================================================================

export const StartSessionSchema = z.object({
  target: z.string().describe('Target path to verify (file or directory)'),
  requirements: z.string().describe('User verification requirements'),
  workingDir: z.string().describe('Working directory for relative paths'),
  maxRounds: z.number().optional().default(10).describe('Maximum rounds before forced stop')
});

export const GetContextSchema = z.object({
  sessionId: z.string().describe('Session ID')
});

export const SubmitRoundSchema = z.object({
  sessionId: z.string().describe('Session ID'),
  role: z.enum(['verifier', 'critic']).describe('Role of this round'),
  output: z.string().describe('Complete output from the agent'),
  issuesRaised: z.array(z.object({
    id: z.string(),
    category: z.enum(['SECURITY', 'CORRECTNESS', 'RELIABILITY', 'MAINTAINABILITY', 'PERFORMANCE']),
    severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    summary: z.string(),
    location: z.string(),
    description: z.string(),
    evidence: z.string()
  })).optional().describe('New issues raised in this round'),
  issuesResolved: z.array(z.string()).optional().describe('Issue IDs resolved in this round')
});

export const GetIssuesSchema = z.object({
  sessionId: z.string().describe('Session ID'),
  status: z.enum(['all', 'unresolved', 'critical']).optional().default('all')
});

export const CheckpointSchema = z.object({
  sessionId: z.string().describe('Session ID')
});

export const RollbackSchema = z.object({
  sessionId: z.string().describe('Session ID'),
  toRound: z.number().describe('Round number to rollback to')
});

export const EndSessionSchema = z.object({
  sessionId: z.string().describe('Session ID'),
  verdict: z.enum(['PASS', 'FAIL', 'CONDITIONAL']).describe('Final verdict')
});

// =============================================================================
// Tool Implementations
// =============================================================================

/**
 * Start a new verification session
 */
export async function startSession(
  args: z.infer<typeof StartSessionSchema>
): Promise<StartSessionResponse> {
  const session = await createSession(args.target, args.requirements, args.maxRounds);

  // Initialize context
  await initializeContext(session.id, args.target, args.workingDir);
  await updateSessionStatus(session.id, 'initialized');

  const updatedSession = await getSession(session.id);

  return {
    sessionId: session.id,
    status: session.status,
    context: {
      target: args.target,
      filesCollected: updatedSession?.context.files.size || 0,
      requirements: args.requirements
    }
  };
}

/**
 * Get current context for verification
 */
export async function getContext(
  args: z.infer<typeof GetContextSchema>
): Promise<GetContextResponse | null> {
  const session = await getSession(args.sessionId);
  if (!session) return null;

  const files = Array.from(session.context.files.entries()).map(([path, ctx]) => ({
    path,
    layer: ctx.layer
  }));

  return {
    sessionId: session.id,
    target: session.target,
    requirements: session.requirements,
    files,
    currentRound: session.currentRound,
    issuesSummary: getIssuesSummary(session)
  };
}

/**
 * Submit round output and get analysis
 */
export async function submitRound(
  args: z.infer<typeof SubmitRoundSchema>
): Promise<SubmitRoundResponse | null> {
  const session = await getSession(args.sessionId);
  if (!session) return null;

  // Check for new file references
  const newFiles = findNewFileReferences(args.output, session.context);
  let contextExpanded = false;

  if (newFiles.length > 0) {
    const added = await expandContext(session.id, newFiles, session.currentRound + 1);
    contextExpanded = added.length > 0;
  }

  // Process new issues
  const raisedIds: string[] = [];
  if (args.issuesRaised) {
    for (const issueData of args.issuesRaised) {
      const issue: Issue = {
        ...issueData,
        raisedBy: args.role,
        raisedInRound: session.currentRound + 1,
        status: 'RAISED'
      };
      await upsertIssue(session.id, issue);
      raisedIds.push(issue.id);
    }
  }

  // Process resolved issues
  if (args.issuesResolved) {
    for (const issueId of args.issuesResolved) {
      const issue = session.issues.find(i => i.id === issueId);
      if (issue) {
        issue.status = 'RESOLVED';
        issue.resolvedInRound = session.currentRound + 1;
        await upsertIssue(session.id, issue);
      }
    }
  }

  // Add round
  const round = await addRound(session.id, {
    role: args.role,
    input: getContextSummary(session.context),
    output: args.output,
    issuesRaised: raisedIds,
    issuesResolved: args.issuesResolved || [],
    contextExpanded,
    newFilesDiscovered: newFiles
  });

  // Check for arbiter intervention
  const intervention = checkForIntervention(session, args.output, newFiles);

  // Auto checkpoint every 2 rounds
  if (session.currentRound % 2 === 0) {
    await createCheckpoint(session.id);
  }

  // Check convergence
  const updatedSession = await getSession(session.id);
  const convergence = checkConvergence(updatedSession!);

  // Determine next role
  let nextRole: 'verifier' | 'critic' | 'complete' = 'complete';
  if (!convergence.isConverged && session.currentRound < session.maxRounds) {
    nextRole = args.role === 'verifier' ? 'critic' : 'verifier';
  }

  return {
    roundNumber: round?.number || 0,
    role: args.role,
    issuesRaised: raisedIds.length,
    issuesResolved: args.issuesResolved?.length || 0,
    contextExpanded,
    newFilesDiscovered: newFiles,
    convergence,
    intervention,
    nextRole
  };
}

/**
 * Get issues with optional filtering
 */
export async function getIssues(
  args: z.infer<typeof GetIssuesSchema>
): Promise<Issue[] | null> {
  const session = await getSession(args.sessionId);
  if (!session) return null;

  switch (args.status) {
    case 'unresolved':
      return session.issues.filter(i => i.status !== 'RESOLVED');
    case 'critical':
      return session.issues.filter(i => i.severity === 'CRITICAL');
    default:
      return session.issues;
  }
}

/**
 * Create manual checkpoint
 */
export async function checkpoint(
  args: z.infer<typeof CheckpointSchema>
): Promise<{ success: boolean; roundNumber: number } | null> {
  const cp = await createCheckpoint(args.sessionId);
  if (!cp) return null;

  return {
    success: true,
    roundNumber: cp.roundNumber
  };
}

/**
 * Rollback to previous checkpoint
 */
export async function rollback(
  args: z.infer<typeof RollbackSchema>
): Promise<{ success: boolean; restoredToRound: number } | null> {
  const session = await rollbackToCheckpoint(args.sessionId, args.toRound);
  if (!session) return null;

  return {
    success: true,
    restoredToRound: session.currentRound
  };
}

/**
 * End session with verdict
 */
export async function endSession(
  args: z.infer<typeof EndSessionSchema>
): Promise<{ sessionId: string; verdict: string; summary: object } | null> {
  const session = await getSession(args.sessionId);
  if (!session) return null;

  await updateSessionStatus(session.id, 'converged');

  return {
    sessionId: session.id,
    verdict: args.verdict,
    summary: {
      totalRounds: session.currentRound,
      totalIssues: session.issues.length,
      resolvedIssues: session.issues.filter(i => i.status === 'RESOLVED').length,
      unresolvedIssues: session.issues.filter(i => i.status !== 'RESOLVED').length,
      issuesBySeverity: getIssuesSummary(session).bySeverity
    }
  };
}

/**
 * List all sessions
 */
export async function getSessions(): Promise<string[]> {
  return listSessions();
}

// =============================================================================
// Arbiter Logic
// =============================================================================

function checkForIntervention(
  session: Session,
  output: string,
  newFiles: string[]
): ArbiterIntervention | undefined {
  // Check for context expansion needed
  if (newFiles.length > 3) {
    return {
      type: 'CONTEXT_EXPAND',
      reason: `${newFiles.length} new files discovered - significant scope expansion`,
      action: 'Review if all files are necessary for verification',
      newContextFiles: newFiles
    };
  }

  // Check for circular arguments
  if (isCircularArgument(session)) {
    return {
      type: 'LOOP_BREAK',
      reason: 'Same issues being raised/challenged repeatedly',
      action: 'Force conclusion on disputed issues'
    };
  }

  // Check for scope violation (too broad)
  if (session.context.files.size > 50) {
    return {
      type: 'SOFT_CORRECT',
      reason: 'Verification scope has grown too large',
      action: 'Focus on core files, defer peripheral issues'
    };
  }

  return undefined;
}

function isCircularArgument(session: Session): boolean {
  if (session.rounds.length < 4) return false;

  // Check if same issues keep appearing
  const recentRounds = session.rounds.slice(-4);
  const allRaisedIssues = recentRounds.flatMap(r => r.issuesRaised);

  const issueCounts = new Map<string, number>();
  for (const id of allRaisedIssues) {
    issueCounts.set(id, (issueCounts.get(id) || 0) + 1);
  }

  // If any issue appears 3+ times in last 4 rounds, it's circular
  return Array.from(issueCounts.values()).some(count => count >= 3);
}

// =============================================================================
// Export Tool Definitions
// =============================================================================

export const tools = {
  elenchus_start_session: {
    description: 'Start a new Elenchus verification session. Collects initial context and prepares for verification rounds.',
    schema: StartSessionSchema,
    handler: startSession
  },
  elenchus_get_context: {
    description: 'Get current verification context including files, issues summary, and session state.',
    schema: GetContextSchema,
    handler: getContext
  },
  elenchus_submit_round: {
    description: 'Submit the output of a verification round. Analyzes for new issues, context expansion, and convergence.',
    schema: SubmitRoundSchema,
    handler: submitRound
  },
  elenchus_get_issues: {
    description: 'Get issues from the current session with optional filtering.',
    schema: GetIssuesSchema,
    handler: getIssues
  },
  elenchus_checkpoint: {
    description: 'Create a checkpoint for potential rollback.',
    schema: CheckpointSchema,
    handler: checkpoint
  },
  elenchus_rollback: {
    description: 'Rollback session to a previous checkpoint.',
    schema: RollbackSchema,
    handler: rollback
  },
  elenchus_end_session: {
    description: 'End the verification session with a final verdict.',
    schema: EndSessionSchema,
    handler: endSession
  }
};
