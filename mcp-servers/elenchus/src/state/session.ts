/**
 * Session State Management
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  Session,
  SessionStatus,
  Round,
  Issue,
  Checkpoint,
  ConvergenceStatus,
  IssueCategory,
  Severity,
  IssueStatus
} from '../types/index.js';

// Session storage directory
const SESSIONS_DIR = path.join(
  process.env.HOME || '~',
  '.claude',
  'elenchus',
  'sessions'
);

// In-memory session cache
const sessions = new Map<string, Session>();

/**
 * Generate unique session ID
 */
function generateSessionId(target: string): string {
  const date = new Date().toISOString().split('T')[0];
  const targetSlug = target.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 30);
  const random = Math.random().toString(36).slice(2, 8);
  return `${date}_${targetSlug}_${random}`;
}

/**
 * Create new session
 */
export async function createSession(
  target: string,
  requirements: string,
  maxRounds: number = 10
): Promise<Session> {
  const sessionId = generateSessionId(target);
  const now = new Date().toISOString();

  const session: Session = {
    id: sessionId,
    target,
    requirements,
    status: 'initialized',
    currentRound: 0,
    maxRounds,
    context: {
      target,
      requirements,
      files: new Map()
    },
    issues: [],
    rounds: [],
    checkpoints: [],
    createdAt: now,
    updatedAt: now
  };

  sessions.set(sessionId, session);
  await persistSession(session);

  return session;
}

/**
 * Get session by ID
 */
export async function getSession(sessionId: string): Promise<Session | null> {
  // Check memory cache first
  if (sessions.has(sessionId)) {
    return sessions.get(sessionId)!;
  }

  // Try loading from disk
  try {
    const sessionPath = path.join(SESSIONS_DIR, sessionId, 'session.json');
    const data = await fs.readFile(sessionPath, 'utf-8');
    const session = JSON.parse(data) as Session;

    // Restore Map from serialized form
    session.context.files = new Map(Object.entries(session.context.files || {}));

    sessions.set(sessionId, session);
    return session;
  } catch {
    return null;
  }
}

/**
 * Update session status
 */
export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus
): Promise<Session | null> {
  const session = await getSession(sessionId);
  if (!session) return null;

  session.status = status;
  session.updatedAt = new Date().toISOString();

  await persistSession(session);
  return session;
}

/**
 * Add round to session
 */
export async function addRound(
  sessionId: string,
  round: Omit<Round, 'number' | 'timestamp'>
): Promise<Round | null> {
  const session = await getSession(sessionId);
  if (!session) return null;

  const newRound: Round = {
    ...round,
    number: session.currentRound + 1,
    timestamp: new Date().toISOString()
  };

  session.rounds.push(newRound);
  session.currentRound = newRound.number;
  session.status = 'verifying';
  session.updatedAt = new Date().toISOString();

  await persistSession(session);
  return newRound;
}

/**
 * Add or update issue
 */
export async function upsertIssue(
  sessionId: string,
  issue: Issue
): Promise<Issue | null> {
  const session = await getSession(sessionId);
  if (!session) return null;

  const existingIndex = session.issues.findIndex(i => i.id === issue.id);

  if (existingIndex >= 0) {
    session.issues[existingIndex] = issue;
  } else {
    session.issues.push(issue);
  }

  session.updatedAt = new Date().toISOString();
  await persistSession(session);

  return issue;
}

/**
 * Create checkpoint
 */
export async function createCheckpoint(
  sessionId: string
): Promise<Checkpoint | null> {
  const session = await getSession(sessionId);
  if (!session) return null;

  const checkpoint: Checkpoint = {
    roundNumber: session.currentRound,
    timestamp: new Date().toISOString(),
    contextSnapshot: Array.from(session.context.files.keys()),
    issuesSnapshot: [...session.issues],
    canRollbackTo: true
  };

  session.checkpoints.push(checkpoint);
  session.updatedAt = new Date().toISOString();

  await persistSession(session);
  return checkpoint;
}

/**
 * Rollback to checkpoint
 */
export async function rollbackToCheckpoint(
  sessionId: string,
  checkpointRound: number
): Promise<Session | null> {
  const session = await getSession(sessionId);
  if (!session) return null;

  const checkpoint = session.checkpoints.find(
    cp => cp.roundNumber === checkpointRound && cp.canRollbackTo
  );

  if (!checkpoint) return null;

  // Restore state
  session.currentRound = checkpoint.roundNumber;
  session.issues = [...checkpoint.issuesSnapshot];
  session.rounds = session.rounds.filter(r => r.number <= checkpoint.roundNumber);
  session.status = 'verifying';
  session.updatedAt = new Date().toISOString();

  await persistSession(session);
  return session;
}

/**
 * Check convergence status
 */
export function checkConvergence(session: Session): ConvergenceStatus {
  const categories: IssueCategory[] = [
    'SECURITY', 'CORRECTNESS', 'RELIABILITY', 'MAINTAINABILITY', 'PERFORMANCE'
  ];

  const categoryTotals: Record<IssueCategory, number> = {
    SECURITY: 8,
    CORRECTNESS: 6,
    RELIABILITY: 4,
    MAINTAINABILITY: 4,
    PERFORMANCE: 4
  };

  // Count issues by category
  const categoryCoverage: Record<IssueCategory, { checked: number; total: number }> =
    {} as any;

  for (const cat of categories) {
    const checked = session.issues.filter(i => i.category === cat).length;
    categoryCoverage[cat] = { checked, total: categoryTotals[cat] };
  }

  // Count unresolved issues
  const unresolvedIssues = session.issues.filter(
    i => i.status !== 'RESOLVED'
  ).length;

  const criticalUnresolved = session.issues.filter(
    i => i.severity === 'CRITICAL' && i.status !== 'RESOLVED'
  ).length;

  // Count rounds without new issues
  let roundsWithoutNewIssues = 0;
  for (let i = session.rounds.length - 1; i >= 0; i--) {
    if (session.rounds[i].issuesRaised.length === 0) {
      roundsWithoutNewIssues++;
    } else {
      break;
    }
  }

  // Convergence conditions
  const isConverged =
    criticalUnresolved === 0 &&
    roundsWithoutNewIssues >= 2 &&
    session.currentRound >= 2;

  return {
    isConverged,
    reason: isConverged
      ? 'No critical issues, 2+ rounds without new issues'
      : criticalUnresolved > 0
        ? `${criticalUnresolved} critical issues unresolved`
        : 'Verification in progress',
    categoryCoverage,
    unresolvedIssues,
    criticalUnresolved,
    roundsWithoutNewIssues
  };
}

/**
 * Get issues summary
 */
export function getIssuesSummary(session: Session) {
  const bySeverity: Record<Severity, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0
  };

  const byStatus: Record<IssueStatus, number> = {
    RAISED: 0,
    CHALLENGED: 0,
    RESOLVED: 0,
    UNRESOLVED: 0
  };

  for (const issue of session.issues) {
    bySeverity[issue.severity]++;
    byStatus[issue.status]++;
  }

  return {
    total: session.issues.length,
    bySeverity,
    byStatus
  };
}

/**
 * Persist session to disk
 */
async function persistSession(session: Session): Promise<void> {
  const sessionDir = path.join(SESSIONS_DIR, session.id);

  await fs.mkdir(sessionDir, { recursive: true });

  // Convert Map to object for JSON serialization
  const serializable = {
    ...session,
    context: {
      ...session.context,
      files: Object.fromEntries(session.context.files)
    }
  };

  await fs.writeFile(
    path.join(sessionDir, 'session.json'),
    JSON.stringify(serializable, null, 2)
  );
}

/**
 * List all sessions
 */
export async function listSessions(): Promise<string[]> {
  try {
    await fs.mkdir(SESSIONS_DIR, { recursive: true });
    const entries = await fs.readdir(SESSIONS_DIR);
    return entries;
  } catch {
    return [];
  }
}
