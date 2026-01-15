/**
 * Mediator (중재자) - 적극적 개입, 컨텍스트 이해, 검증 품질 보장
 *
 * 역할:
 * 1. 코드베이스 전체 맥락 이해 (의존성 그래프)
 * 2. 검증자가 놓친 부분 적극 지적
 * 3. 사이드 이펙트 / 리플 이펙트 경고
 * 4. 검증 커버리지 추적
 * 5. 범위 이탈 감지 및 교정
 */

import {
  DependencyGraph,
  MediatorState,
  ActiveIntervention,
  ActiveInterventionType,
  MissedCodeInfo,
  RippleEffect,
  AffectedFile
} from './types.js';
import {
  buildDependencyGraph,
  findAffectedFiles,
  detectCircularDependencies,
  calculateFileImportance
} from './analyzer.js';
import { Session, Issue } from '../types/index.js';

/**
 * [FIX: MNT-01] Mediator configuration constants
 */
const MEDIATOR_CONFIG = {
  CRITICAL_THRESHOLD_FACTOR: 0.5,    // 중요 파일 임계값 (최대 중요도 * factor)
  MAX_AFFECTED_FILES_DISPLAY: 10,    // 표시할 최대 영향 파일 수
  MAX_CRITICAL_FILES_DISPLAY: 5,     // 표시할 최대 중요 파일 수
  COVERAGE_CHECK_MIN_ROUND: 3,       // 커버리지 체크 시작 라운드
  LOW_COVERAGE_CHECK_MIN_ROUND: 5,   // 낮은 커버리지 체크 시작 라운드
  LOW_COVERAGE_THRESHOLD: 0.5,       // 낮은 커버리지 임계값 (50%)
  DRIFT_THRESHOLD: 0.5,              // 범위 이탈 임계값 (50%)
  MIN_FILES_FOR_DRIFT: 3,            // 범위 이탈 체크 최소 파일 수
  DEFAULT_MAX_DEPTH: 100,            // 기본 최대 의존성 깊이
  SIDE_EFFECT_WARNING_THRESHOLD: 5,  // 사이드 이펙트 경고 임계값
  RIPPLE_EFFECT_MAX_DEPTH: 3,        // 리플 이펙트 최대 깊이
  FILE_IMPORTANCE_THRESHOLD: 3       // 파일 중요도 임계값
} as const;

// =============================================================================
// Mediator State Management
// =============================================================================

const mediatorStates = new Map<string, MediatorState>();

/**
 * 세션에 대한 중재자 초기화
 */
export async function initializeMediator(
  sessionId: string,
  files: string[],
  workingDir: string
): Promise<MediatorState> {
  // 의존성 그래프 구축
  const graph = await buildDependencyGraph(files, workingDir);

  const state: MediatorState = {
    sessionId,
    graph,
    coverage: {
      totalFiles: files.length,
      verifiedFiles: new Set(),
      partiallyVerified: new Map(),
      unverifiedCritical: []
    },
    interventions: [],
    mentionedLocations: new Map(),
    verifierFocus: [],
    ignoredWarnings: []
  };

  // [FIX: MNT-01] 중요 파일 식별 (검증 필수) - use MEDIATOR_CONFIG
  const importance = calculateFileImportance(graph);
  const criticalThreshold = Math.max(...Array.from(importance.values())) * MEDIATOR_CONFIG.CRITICAL_THRESHOLD_FACTOR;

  for (const [file, score] of importance) {
    if (score >= criticalThreshold) {
      state.coverage.unverifiedCritical.push(file);
    }
  }

  mediatorStates.set(sessionId, state);
  return state;
}

/**
 * 중재자 상태 가져오기
 */
export function getMediatorState(sessionId: string): MediatorState | undefined {
  return mediatorStates.get(sessionId);
}

// =============================================================================
// Active Intervention Logic
// =============================================================================

/**
 * 라운드 출력 분석 및 개입 결정
 * [FIX: PRF-01] Cache importance calculation to avoid redundant recalculation
 */
export function analyzeRoundAndIntervene(
  session: Session,
  roundOutput: string,
  role: 'verifier' | 'critic',
  newIssues: Issue[]
): ActiveIntervention[] {
  const state = mediatorStates.get(session.id);
  if (!state) return [];

  const interventions: ActiveIntervention[] = [];

  // [FIX: PRF-01] Calculate importance once and cache for use in checks
  const cachedImportance = calculateFileImportance(state.graph);

  // 1. 출력에서 언급된 파일/라인 추출
  const mentionedFiles = extractMentionedFiles(roundOutput);
  updateCoverage(state, mentionedFiles, session.currentRound);

  // 2. 놓친 의존성 체크
  const missedDeps = checkMissedDependencies(state, mentionedFiles, newIssues, cachedImportance);
  if (missedDeps) interventions.push(missedDeps);

  // 3. 커버리지 부족 체크
  const coverageIssue = checkIncompleteCoverage(state, session.currentRound, cachedImportance);
  if (coverageIssue) interventions.push(coverageIssue);

  // 4. 사이드 이펙트 경고
  const sideEffects = checkSideEffects(state, newIssues);
  if (sideEffects) interventions.push(sideEffects);

  // 5. 범위 이탈 체크
  const scopeDrift = checkScopeDrift(state, mentionedFiles, session);
  if (scopeDrift) interventions.push(scopeDrift);

  // 6. 순환 의존성 체크 (첫 라운드에만)
  if (session.currentRound === 1) {
    const circular = checkCircularDependencies(state);
    if (circular) interventions.push(circular);
  }

  // 7. 중요 경로 무시 체크
  const ignoredCritical = checkCriticalPathIgnored(state, mentionedFiles, cachedImportance);
  if (ignoredCritical) interventions.push(ignoredCritical);

  // 8. 검증자 이해 오류 체크 (Critic 역할일 때)
  if (role === 'critic') {
    const contextCorrection = checkVerifierMisunderstanding(state, roundOutput, session);
    if (contextCorrection) interventions.push(contextCorrection);
  }

  // 상태에 개입 기록
  state.interventions.push(...interventions);

  return interventions;
}

// =============================================================================
// Specific Intervention Checks
// =============================================================================

/**
 * 놓친 의존성 체크
 * [FIX: PRF-01] Accept cached importance map to avoid recalculation
 */
function checkMissedDependencies(
  state: MediatorState,
  mentionedFiles: Map<string, number[]>,
  newIssues: Issue[],
  cachedImportance?: Map<string, number>
): ActiveIntervention | null {
  const missedCode: MissedCodeInfo[] = [];
  // [FIX: PRF-01] Use cached importance or calculate if not provided
  const importance = cachedImportance || calculateFileImportance(state.graph);

  for (const [file] of mentionedFiles) {
    // 이 파일의 의존성 확인
    const node = state.graph.nodes.get(file);
    if (!node) continue;

    for (const imp of node.imports) {
      // 로컬 import만 확인
      if (!imp.source.startsWith('.')) continue;

      const importedFile = findResolvedImport(state.graph, file, imp.source);
      if (!importedFile) continue;

      // 이 파일이 검증되었는지
      if (!state.coverage.verifiedFiles.has(importedFile) &&
          !mentionedFiles.has(importedFile)) {

        // 관련 이슈가 있는지
        const relatedIssues = newIssues.filter(i =>
          i.location.includes(file) &&
          imp.specifiers.some(s => i.description.includes(s))
        );

        if (relatedIssues.length > 0) {
          missedCode.push({
            file: importedFile,
            functions: imp.specifiers,
            reason: `${file}에서 사용 중이며 관련 이슈 발견됨`,
            importance: 'HIGH'
          });
        } else {
          // [FIX: MNT-01] 중요 파일인 경우 - use cached importance with constant threshold
          if ((importance.get(importedFile) || 0) > MEDIATOR_CONFIG.FILE_IMPORTANCE_THRESHOLD) {
            missedCode.push({
              file: importedFile,
              functions: imp.specifiers,
              reason: `${file}의 의존성이며 다른 곳에서도 많이 사용됨`,
              importance: 'MEDIUM'
            });
          }
        }
      }
    }
  }

  if (missedCode.length === 0) return null;

  const highPriority = missedCode.filter(m => m.importance === 'HIGH');

  return {
    type: 'MISSED_DEPENDENCY',
    severity: highPriority.length > 0 ? 'WARNING' : 'INFO',
    reason: `${missedCode.length}개의 관련 파일이 검증되지 않음`,
    action: '다음 파일들도 검증에 포함하세요',
    missedCode,
    affectedFiles: missedCode.map(m => m.file),
    suggestedChecks: missedCode
      .filter(m => m.importance === 'HIGH')
      .map(m => `${m.file}: ${m.reason}`)
  };
}

/**
 * 커버리지 부족 체크
 * [FIX: PRF-01] Accept cached importance map for consistency (currently unused but available)
 */
function checkIncompleteCoverage(
  state: MediatorState,
  currentRound: number,
  _cachedImportance?: Map<string, number>
): ActiveIntervention | null {
  // [FIX: MNT-01] 라운드 체크에 상수 사용
  if (currentRound < MEDIATOR_CONFIG.COVERAGE_CHECK_MIN_ROUND) return null;

  const { totalFiles, verifiedFiles, unverifiedCritical } = state.coverage;
  const coverageRate = verifiedFiles.size / totalFiles;

  // 중요 파일 중 미검증
  const stillCritical = unverifiedCritical.filter(f => !verifiedFiles.has(f));

  if (stillCritical.length > 0 && currentRound >= MEDIATOR_CONFIG.COVERAGE_CHECK_MIN_ROUND) {
    return {
      type: 'INCOMPLETE_COVERAGE',
      severity: 'WARNING',
      reason: `중요 파일 ${stillCritical.length}개가 아직 검증되지 않음 (전체 커버리지: ${(coverageRate * 100).toFixed(1)}%)`,
      action: '다음 중요 파일들을 검증하세요',
      affectedFiles: stillCritical.slice(0, MEDIATOR_CONFIG.MAX_CRITICAL_FILES_DISPLAY),
      suggestedChecks: stillCritical.slice(0, MEDIATOR_CONFIG.MAX_CRITICAL_FILES_DISPLAY).map(f => {
        const deps = state.graph.reverseEdges.get(f) || [];
        return `${f} (${deps.length}개 파일에서 참조)`;
      })
    };
  }

  if (coverageRate < MEDIATOR_CONFIG.LOW_COVERAGE_THRESHOLD && currentRound >= MEDIATOR_CONFIG.LOW_COVERAGE_CHECK_MIN_ROUND) {
    return {
      type: 'INCOMPLETE_COVERAGE',
      severity: 'INFO',
      reason: `전체 커버리지가 ${(coverageRate * 100).toFixed(1)}%로 낮음`,
      action: '더 많은 파일을 검증하거나 범위를 좁히세요',
      affectedFiles: Array.from(state.graph.nodes.keys())
        .filter(f => !verifiedFiles.has(f))
        .slice(0, MEDIATOR_CONFIG.MAX_AFFECTED_FILES_DISPLAY)
    };
  }

  return null;
}

/**
 * 사이드 이펙트 경고
 */
function checkSideEffects(
  state: MediatorState,
  newIssues: Issue[]
): ActiveIntervention | null {
  // 수정이 필요한 이슈들에 대해 영향 범위 분석
  const criticalIssues = newIssues.filter(i =>
    i.severity === 'CRITICAL' || i.severity === 'HIGH'
  );

  if (criticalIssues.length === 0) return null;

  const allAffected = new Set<string>();
  const rippleDetails: Array<{ issue: string; affected: string[] }> = [];

  for (const issue of criticalIssues) {
    // 이슈 위치에서 파일 추출
    const fileMatch = issue.location.match(/^([^:]+)/);
    if (!fileMatch) continue;

    const file = fileMatch[1];
    const affected = findAffectedFiles(file, state.graph, 2);

    if (affected.length > 0) {
      rippleDetails.push({
        issue: issue.id,
        affected: affected.slice(0, 3)
      });
      affected.forEach(f => allAffected.add(f));
    }
  }

  if (allAffected.size === 0) return null;

  // [FIX: MNT-01] Use constant for threshold
  return {
    type: 'SIDE_EFFECT_WARNING',
    severity: allAffected.size > MEDIATOR_CONFIG.SIDE_EFFECT_WARNING_THRESHOLD ? 'WARNING' : 'INFO',
    reason: `${criticalIssues.length}개 이슈 수정 시 ${allAffected.size}개 파일에 영향 가능`,
    action: '수정 전 영향 범위를 확인하세요',
    affectedFiles: Array.from(allAffected).slice(0, MEDIATOR_CONFIG.MAX_AFFECTED_FILES_DISPLAY),
    relatedIssues: criticalIssues.map(i => i.id),
    suggestedChecks: rippleDetails.map(r =>
      `${r.issue} 수정 시 확인 필요: ${r.affected.join(', ')}`
    )
  };
}

/**
 * 범위 이탈 체크
 */
function checkScopeDrift(
  state: MediatorState,
  mentionedFiles: Map<string, number[]>,
  session: Session
): ActiveIntervention | null {
  // 타겟과 무관한 파일이 많이 언급되는지
  const targetDir = session.target.replace(/\/[^/]+$/, '');  // 디렉토리 추출
  const outsideTarget: string[] = [];

  for (const file of mentionedFiles.keys()) {
    if (!file.startsWith(targetDir) && !file.includes(targetDir)) {
      outsideTarget.push(file);
    }
  }

  const driftRate = outsideTarget.length / mentionedFiles.size;

  // [FIX: MNT-01] Use constants for thresholds
  if (driftRate > MEDIATOR_CONFIG.DRIFT_THRESHOLD && mentionedFiles.size > MEDIATOR_CONFIG.MIN_FILES_FOR_DRIFT) {
    return {
      type: 'SCOPE_DRIFT',
      severity: 'WARNING',
      reason: `검증 범위가 타겟(${session.target}) 외부로 확장됨 (${(driftRate * 100).toFixed(0)}%)`,
      action: '타겟 범위에 집중하거나 검증 범위를 명시적으로 확장하세요',
      affectedFiles: outsideTarget.slice(0, MEDIATOR_CONFIG.MAX_CRITICAL_FILES_DISPLAY),
      suggestedChecks: [
        `현재 타겟: ${session.target}`,
        `외부 파일 ${outsideTarget.length}개 언급됨`,
        '범위 확장이 필요하면 명시적으로 요청하세요'
      ]
    };
  }

  return null;
}

/**
 * 순환 의존성 체크
 */
function checkCircularDependencies(
  state: MediatorState
): ActiveIntervention | null {
  const cycles = detectCircularDependencies(state.graph);

  if (cycles.length === 0) return null;

  return {
    type: 'CIRCULAR_DEPENDENCY',
    severity: cycles.length > 2 ? 'WARNING' : 'INFO',
    reason: `${cycles.length}개의 순환 의존성 발견`,
    action: '순환 의존성은 버그의 원인이 될 수 있으니 검토하세요',
    suggestedChecks: cycles.slice(0, 3).map(cycle =>
      `순환: ${cycle.join(' → ')}`
    )
  };
}

/**
 * 중요 경로 무시 체크
 * [FIX: PRF-01] Accept cached importance map to avoid recalculation
 */
function checkCriticalPathIgnored(
  state: MediatorState,
  mentionedFiles: Map<string, number[]>,
  cachedImportance?: Map<string, number>
): ActiveIntervention | null {
  // [FIX: PRF-01] Use cached importance or calculate if not provided
  const importance = cachedImportance || calculateFileImportance(state.graph);
  const sortedByImportance = Array.from(importance.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);  // 상위 5개

  const ignoredCritical = sortedByImportance.filter(
    ([file]) => !mentionedFiles.has(file) && !state.coverage.verifiedFiles.has(file)
  );

  if (ignoredCritical.length === 0) return null;

  // 3라운드 이후에만 경고
  const rounds = state.interventions.filter(i => i.type === 'CRITICAL_PATH_IGNORED').length;
  if (rounds > 0) return null;  // 이미 경고함

  return {
    type: 'CRITICAL_PATH_IGNORED',
    severity: 'INFO',
    reason: '프로젝트의 핵심 파일이 아직 검증되지 않음',
    action: '다음 핵심 파일들도 검토하세요',
    affectedFiles: ignoredCritical.map(([file]) => file),
    suggestedChecks: ignoredCritical.map(([file, score]) => {
      const deps = state.graph.reverseEdges.get(file) || [];
      return `${file} (중요도: ${score}, ${deps.length}개 파일에서 import)`;
    })
  };
}

/**
 * 검증자 이해 오류 체크 (Critic이 판단)
 */
function checkVerifierMisunderstanding(
  state: MediatorState,
  criticOutput: string,
  session: Session
): ActiveIntervention | null {
  // Critic의 출력에서 "오해", "잘못", "틀림" 등 키워드 탐지
  const correctionKeywords = [
    '오해', '잘못', '틀림', '틀렸', '정확하지 않',
    'incorrect', 'wrong', 'misunderstand', 'false positive',
    '과장', '실제로는', '사실은'
  ];

  const hasCorrection = correctionKeywords.some(kw =>
    criticOutput.toLowerCase().includes(kw.toLowerCase())
  );

  if (!hasCorrection) return null;

  // 어떤 이슈가 잘못되었는지 추출 시도
  const lastVerifierRound = session.rounds
    .filter(r => r.role === 'verifier')
    .pop();

  if (!lastVerifierRound) return null;

  const disputedIssues = lastVerifierRound.issuesRaised.filter(issueId => {
    const issue = session.issues.find(i => i.id === issueId);
    return issue && (
      criticOutput.includes(issue.id) ||
      criticOutput.includes(issue.summary)
    );
  });

  if (disputedIssues.length === 0) return null;

  return {
    type: 'CONTEXT_CORRECTION',
    severity: 'INFO',
    reason: `Critic이 ${disputedIssues.length}개 이슈에 대해 이의 제기`,
    action: '해당 이슈들을 재검토하고 코드 컨텍스트를 다시 확인하세요',
    relatedIssues: disputedIssues,
    suggestedChecks: [
      '이슈의 증거(evidence)가 실제 동작과 일치하는지 확인',
      '관련 코드의 전체 맥락을 다시 읽어보기',
      '테스트 코드나 문서에서 의도된 동작 확인'
    ]
  };
}

// =============================================================================
// Coverage Tracking
// =============================================================================

/**
 * 커버리지 업데이트
 */
function updateCoverage(
  state: MediatorState,
  mentionedFiles: Map<string, number[]>,
  round: number
): void {
  for (const [file, lines] of mentionedFiles) {
    state.coverage.verifiedFiles.add(file);

    // 라인 레벨 커버리지
    const existing = state.coverage.partiallyVerified.get(file);
    if (existing) {
      lines.forEach(l => {
        if (!existing.linesMentioned.includes(l)) {
          existing.linesMentioned.push(l);
        }
      });
      existing.lastVerifiedRound = round;
    } else {
      const node = state.graph.nodes.get(file);
      state.coverage.partiallyVerified.set(file, {
        path: file,
        functionsTotal: node?.functions.length || 0,
        functionsVerified: [],
        linesTotal: 0,  // 추후 계산
        linesMentioned: lines,
        lastVerifiedRound: round
      });
    }

    // 중요 파일 목록에서 제거
    const idx = state.coverage.unverifiedCritical.indexOf(file);
    if (idx !== -1) {
      state.coverage.unverifiedCritical.splice(idx, 1);
    }
  }
}

// =============================================================================
// Ripple Effect Analysis
// =============================================================================

/**
 * 변경 시 리플 이펙트 분석
 */
export function analyzeRippleEffect(
  sessionId: string,
  changedFile: string,
  changedFunction?: string
): RippleEffect | null {
  const state = mediatorStates.get(sessionId);
  if (!state) return null;

  // [FIX: MNT-01] Use MEDIATOR_CONFIG for max depth
  const affected = findAffectedFiles(changedFile, state.graph, MEDIATOR_CONFIG.RIPPLE_EFFECT_MAX_DEPTH);
  if (affected.length === 0) return null;

  const affectedDetails: AffectedFile[] = [];

  for (const file of affected) {
    const node = state.graph.nodes.get(file);
    if (!node) continue;

    // 어떤 함수가 영향받는지
    const affectedFunctions: string[] = [];
    const changedNode = state.graph.nodes.get(changedFile);

    if (changedFunction && changedNode) {
      // 변경된 함수를 호출하는 함수 찾기
      for (const fn of node.functions) {
        if (fn.calls.includes(changedFunction)) {
          affectedFunctions.push(fn.name);
        }
      }
    }

    // 의존 깊이 계산
    const depth = calculateDependencyDepth(state.graph, changedFile, file);

    affectedDetails.push({
      path: file,
      depth,
      affectedFunctions,
      impactType: depth === 1 ? 'direct' : 'indirect',
      reason: depth === 1
        ? `${changedFile}을 직접 import함`
        : `${depth}단계 의존 관계`
    });
  }

  return {
    changedFile,
    changedFunction,
    affectedFiles: affectedDetails.sort((a, b) => a.depth - b.depth),
    depth: Math.max(...affectedDetails.map(a => a.depth)),
    totalAffected: affectedDetails.length
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * 출력에서 언급된 파일 추출
 */
function extractMentionedFiles(output: string): Map<string, number[]> {
  const mentioned = new Map<string, number[]>();

  // 패턴: path/to/file.ts:123 또는 path/to/file.ts (line 123)
  const patterns = [
    /([a-zA-Z0-9_\-./]+\.[a-zA-Z]+):(\d+)/g,  // file.ts:123
    /([a-zA-Z0-9_\-./]+\.[a-zA-Z]+)\s*\(line\s*(\d+)\)/gi,  // file.ts (line 123)
    /`([a-zA-Z0-9_\-./]+\.[a-zA-Z]+)`/g  // `file.ts`
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(output)) !== null) {
      const file = match[1];
      const line = match[2] ? parseInt(match[2], 10) : 0;

      const existing = mentioned.get(file) || [];
      if (line > 0 && !existing.includes(line)) {
        existing.push(line);
      }
      mentioned.set(file, existing);
    }
  }

  return mentioned;
}

/**
 * import 경로 해결
 */
function findResolvedImport(
  graph: DependencyGraph,
  fromFile: string,
  importSource: string
): string | null {
  const edge = graph.edges.find(
    e => e.from === fromFile && e.to.includes(importSource.replace(/^\.\//, ''))
  );
  return edge?.to || null;
}

/**
 * 의존 깊이 계산
 * [FIX: COR-03] Added maxDepth parameter to prevent infinite loops
 * [FIX: MNT-01] Use MEDIATOR_CONFIG for default maxDepth
 */
function calculateDependencyDepth(
  graph: DependencyGraph,
  from: string,
  to: string,
  maxDepth: number = MEDIATOR_CONFIG.DEFAULT_MAX_DEPTH
): number {
  const visited = new Set<string>();
  const queue: Array<{ file: string; depth: number }> = [{ file: from, depth: 0 }];

  while (queue.length > 0) {
    const { file, depth } = queue.shift()!;

    if (file === to) return depth;
    if (visited.has(file)) continue;
    // [FIX: COR-03] Early termination if maxDepth exceeded
    if (depth >= maxDepth) continue;
    visited.add(file);

    const dependents = graph.reverseEdges.get(file) || [];
    for (const dep of dependents) {
      queue.push({ file: dep, depth: depth + 1 });
    }
  }

  return Infinity;
}

// =============================================================================
// Export Summary for Tools
// =============================================================================

/**
 * 중재자 상태 요약
 */
export function getMediatorSummary(sessionId: string): object | null {
  const state = mediatorStates.get(sessionId);
  if (!state) return null;

  const totalInterventions = state.interventions.length;
  const byType = new Map<ActiveInterventionType, number>();
  for (const i of state.interventions) {
    byType.set(i.type, (byType.get(i.type) || 0) + 1);
  }

  return {
    graphStats: {
      totalNodes: state.graph.nodes.size,
      totalEdges: state.graph.edges.length,
      circularDeps: detectCircularDependencies(state.graph).length
    },
    coverage: {
      totalFiles: state.coverage.totalFiles,
      verifiedFiles: state.coverage.verifiedFiles.size,
      coverageRate: (state.coverage.verifiedFiles.size / state.coverage.totalFiles * 100).toFixed(1) + '%',
      unverifiedCritical: state.coverage.unverifiedCritical.length
    },
    interventions: {
      total: totalInterventions,
      byType: Object.fromEntries(byType),
      lastIntervention: state.interventions[state.interventions.length - 1] || null
    }
  };
}
