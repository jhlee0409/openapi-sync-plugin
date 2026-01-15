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
  listSessions,
  deleteSessionFromCache  // [FIX: REL-02]
} from '../state/session.js';
import {
  initializeContext,
  expandContext,
  findNewFileReferences,
  getContextSummary
} from '../state/context.js';
import {
  initializeMediator,
  analyzeRoundAndIntervene,
  analyzeRippleEffect,
  getMediatorSummary,
  getMediatorState,
  deleteMediatorState  // [FIX: REL-02]
} from '../mediator/index.js';
import { ActiveIntervention } from '../mediator/types.js';
import {
  initializeRoleEnforcement,
  validateRoleCompliance,
  getExpectedRole,
  getRolePrompt,
  getRoleDefinition,
  getComplianceHistory,
  getRoleEnforcementSummary,
  updateRoleConfig,
  deleteRoleState  // [FIX: REL-02]
} from '../roles/index.js';
import { RoleComplianceResult, VerifierRole } from '../roles/types.js';

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
): Promise<StartSessionResponse & { mediator?: object; roles?: object }> {
  const session = await createSession(args.target, args.requirements, args.maxRounds);

  // Initialize context
  await initializeContext(session.id, args.target, args.workingDir);
  await updateSessionStatus(session.id, 'initialized');

  const updatedSession = await getSession(session.id);

  // Initialize Mediator (중재자)
  const files = updatedSession
    ? Array.from(updatedSession.context.files.keys())
    : [];
  const mediatorState = await initializeMediator(session.id, files, args.workingDir);

  // Initialize Role Enforcement (역할 강제)
  const roleState = initializeRoleEnforcement(session.id);
  const verifierPrompt = getRolePrompt('verifier');

  return {
    sessionId: session.id,
    status: session.status,
    context: {
      target: args.target,
      filesCollected: updatedSession?.context.files.size || 0,
      requirements: args.requirements
    },
    mediator: {
      initialized: true,
      graphNodes: mediatorState.graph.nodes.size,
      graphEdges: mediatorState.graph.edges.length,
      criticalFiles: mediatorState.coverage.unverifiedCritical.length
    },
    // 🆕 역할 강제 정보
    roles: {
      initialized: true,
      expectedRole: roleState.currentExpectedRole,
      config: roleState.config,
      verifierGuidelines: {
        mustDo: getRoleDefinition('verifier').mustDo.slice(0, 3),
        mustNotDo: getRoleDefinition('verifier').mustNotDo.slice(0, 3)
      },
      firstRolePrompt: verifierPrompt.systemPrompt.slice(0, 500) + '...'
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
): Promise<SubmitRoundResponse & {
  mediatorInterventions?: ActiveIntervention[];
  roleCompliance?: RoleComplianceResult;
} | null> {
  const session = await getSession(args.sessionId);
  if (!session) return null;

  // 🆕 역할 준수 검증 (Role Compliance Check)
  const roleCompliance = validateRoleCompliance(
    args.sessionId,
    args.role as VerifierRole,
    args.output,
    session
  );

  // Check for new file references
  const newFiles = findNewFileReferences(args.output, session.context);
  let contextExpanded = false;

  if (newFiles.length > 0) {
    const added = await expandContext(session.id, newFiles, session.currentRound + 1);
    contextExpanded = added.length > 0;
  }

  // Process new issues
  const raisedIds: string[] = [];
  const newIssues: Issue[] = [];
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
      newIssues.push(issue);
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

  // Check for basic arbiter intervention (기존 로직)
  const intervention = checkForIntervention(session, args.output, newFiles);

  // 🆕 중재자 개입 분석 (Mediator Active Intervention)
  const mediatorInterventions = analyzeRoundAndIntervene(
    session,
    args.output,
    args.role,
    newIssues
  );

  // Auto checkpoint every 2 rounds
  if (session.currentRound % 2 === 0) {
    await createCheckpoint(session.id);
  }

  // Check convergence
  const updatedSession = await getSession(session.id);
  const convergence = checkConvergence(updatedSession!);

  // Determine next role (from role enforcement)
  const expectedNextRole = getExpectedRole(args.sessionId);
  let nextRole: 'verifier' | 'critic' | 'complete' = 'complete';
  if (!convergence.isConverged && session.currentRound < session.maxRounds) {
    nextRole = expectedNextRole;
  }

  // Get next role prompt if not complete
  const nextRolePrompt = nextRole !== 'complete'
    ? getRolePrompt(nextRole)
    : undefined;

  return {
    roundNumber: round?.number || 0,
    role: args.role,
    issuesRaised: raisedIds.length,
    issuesResolved: args.issuesResolved?.length || 0,
    contextExpanded,
    newFilesDiscovered: newFiles,
    convergence,
    intervention,
    nextRole,
    // 🆕 중재자 개입 결과
    mediatorInterventions: mediatorInterventions.length > 0 ? mediatorInterventions : undefined,
    // 🆕 역할 준수 결과
    roleCompliance: {
      ...roleCompliance,
      // 다음 역할 안내 추가
      nextRoleGuidelines: nextRolePrompt ? {
        role: nextRole,
        mustDo: getRoleDefinition(nextRole as VerifierRole).mustDo.slice(0, 3),
        checklist: nextRolePrompt.checklist
      } : undefined
    } as any
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

  const result = {
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

  // [FIX: REL-02] Clean up memory caches to prevent memory leaks
  deleteSessionFromCache(session.id);
  deleteMediatorState(session.id);
  deleteRoleState(session.id);

  return result;
}

/**
 * List all sessions
 */
export async function getSessions(): Promise<string[]> {
  return listSessions();
}

// =============================================================================
// New Mediator Tools
// =============================================================================

export const RippleEffectSchema = z.object({
  sessionId: z.string().describe('Session ID'),
  changedFile: z.string().describe('File that will be changed'),
  changedFunction: z.string().optional().describe('Specific function that will be changed')
});

export const MediatorSummarySchema = z.object({
  sessionId: z.string().describe('Session ID')
});

/**
 * Analyze ripple effect of a change (리플 이펙트 분석)
 */
export async function rippleEffect(
  args: z.infer<typeof RippleEffectSchema>
): Promise<object | null> {
  const result = analyzeRippleEffect(args.sessionId, args.changedFile, args.changedFunction);
  if (!result) return null;

  return {
    changedFile: result.changedFile,
    changedFunction: result.changedFunction,
    totalAffected: result.totalAffected,
    maxDepth: result.depth,
    affectedFiles: result.affectedFiles.map(f => ({
      path: f.path,
      depth: f.depth,
      impactType: f.impactType,
      affectedFunctions: f.affectedFunctions,
      reason: f.reason
    }))
  };
}

/**
 * Get mediator summary (중재자 상태 요약)
 */
export async function mediatorSummary(
  args: z.infer<typeof MediatorSummarySchema>
): Promise<object | null> {
  return getMediatorSummary(args.sessionId);
}

// =============================================================================
// New Role Enforcement Tools (역할 강제 도구)
// =============================================================================

export const GetRolePromptSchema = z.object({
  role: z.enum(['verifier', 'critic']).describe('Role to get prompt for')
});

export const RoleSummarySchema = z.object({
  sessionId: z.string().describe('Session ID')
});

export const UpdateRoleConfigSchema = z.object({
  sessionId: z.string().describe('Session ID'),
  strictMode: z.boolean().optional().describe('Reject non-compliant rounds'),
  minComplianceScore: z.number().optional().describe('Minimum compliance score (0-100)'),
  requireAlternation: z.boolean().optional().describe('Require verifier/critic alternation')
});

/**
 * Get role prompt and guidelines (역할 프롬프트 가져오기)
 */
export async function getRolePromptTool(
  args: z.infer<typeof GetRolePromptSchema>
): Promise<object> {
  const prompt = getRolePrompt(args.role as VerifierRole);
  const definition = getRoleDefinition(args.role as VerifierRole);

  return {
    role: args.role,
    koreanName: definition.koreanName,
    purpose: definition.purpose,
    systemPrompt: prompt.systemPrompt,
    mustDo: definition.mustDo,
    mustNotDo: definition.mustNotDo,
    focusAreas: definition.focusAreas,
    outputTemplate: prompt.outputTemplate,
    checklist: prompt.checklist,
    exampleOutput: prompt.exampleOutput
  };
}

/**
 * Get role enforcement summary (역할 강제 요약)
 */
export async function roleSummary(
  args: z.infer<typeof RoleSummarySchema>
): Promise<object | null> {
  return getRoleEnforcementSummary(args.sessionId);
}

/**
 * Update role enforcement config (역할 강제 설정 변경)
 */
export async function updateRoleConfigTool(
  args: z.infer<typeof UpdateRoleConfigSchema>
): Promise<object | null> {
  const config = updateRoleConfig(args.sessionId, {
    strictMode: args.strictMode,
    minComplianceScore: args.minComplianceScore,
    requireAlternation: args.requireAlternation
  });

  if (!config) return null;

  return {
    sessionId: args.sessionId,
    updated: true,
    newConfig: config
  };
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
    description: 'Start a new Elenchus verification session. Collects initial context, builds dependency graph, and initializes mediator.',
    schema: StartSessionSchema,
    handler: startSession
  },
  elenchus_get_context: {
    description: 'Get current verification context including files, issues summary, and session state.',
    schema: GetContextSchema,
    handler: getContext
  },
  elenchus_submit_round: {
    description: 'Submit the output of a verification round. Analyzes for new issues, context expansion, convergence, and mediator interventions.',
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
  },
  // 🆕 중재자 도구들
  elenchus_ripple_effect: {
    description: 'Analyze ripple effect of a code change. Shows which files and functions will be affected by modifying a specific file.',
    schema: RippleEffectSchema,
    handler: rippleEffect
  },
  elenchus_mediator_summary: {
    description: 'Get mediator summary including dependency graph stats, verification coverage, and intervention history.',
    schema: MediatorSummarySchema,
    handler: mediatorSummary
  },
  // 🆕 역할 강제 도구들
  elenchus_get_role_prompt: {
    description: 'Get detailed role prompt and guidelines for Verifier or Critic. Includes mustDo/mustNotDo rules, output templates, and checklists.',
    schema: GetRolePromptSchema,
    handler: getRolePromptTool
  },
  elenchus_role_summary: {
    description: 'Get role enforcement summary including compliance history, average scores, violations, and current expected role.',
    schema: RoleSummarySchema,
    handler: roleSummary
  },
  elenchus_update_role_config: {
    description: 'Update role enforcement configuration. Can enable strict mode, change minimum compliance score, or toggle role alternation requirement.',
    schema: UpdateRoleConfigSchema,
    handler: updateRoleConfigTool
  }
};
