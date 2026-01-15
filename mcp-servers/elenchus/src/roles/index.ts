/**
 * Role Enforcement Module - 두 검증자 역할 강제
 *
 * 1. 역할 정의 (mustDo, mustNotDo)
 * 2. 출력 검증 (역할 준수 여부)
 * 3. 순응도 추적
 * 4. 역할 교대 강제
 */

import {
  VerifierRole,
  RoleContext,
  RoleComplianceResult,
  RoleViolation,
  RoleWarning,
  RoleEnforcementConfig,
  RolePrompt,
  PreviousRoundSummary,
  ExistingIssueSummary
} from './types.js';
import {
  ROLE_DEFINITIONS,
  ROLE_PROMPTS,
  VERIFIER_ROLE,
  CRITIC_ROLE
} from './definitions.js';
import { Session, Issue } from '../types/index.js';

// =============================================================================
// State Management
// =============================================================================

/**
 * [FIX: MNT-02] Role alternation configuration
 */
interface RoleAlternation {
  expectedRole: VerifierRole;
  nextRole: VerifierRole;
  history: Array<{ role: VerifierRole; round: number }>;
}

interface RoleState {
  sessionId: string;
  complianceHistory: RoleComplianceResult[];
  currentExpectedRole: VerifierRole;
  config: RoleEnforcementConfig;
  // [FIX: MNT-02] Consolidated role alternation tracking
  alternation: RoleAlternation;
}

const roleStates = new Map<string, RoleState>();

/**
 * [FIX: MNT-01] Compliance scoring constants
 */
const COMPLIANCE_SCORE = {
  BASE: 100,           // 기본 점수
  ERROR_PENALTY: 20,   // ERROR 위반 시 차감
  WARNING_PENALTY: 5,  // WARNING 위반 시 차감
  MIN_SCORE: 0,        // 최소 점수
  MAX_SCORE: 100       // 최대 점수
} as const;

const DEFAULT_CONFIG: RoleEnforcementConfig = {
  strictMode: false,         // 기본: 경고만, 거부 안함
  minComplianceScore: 60,    // 60점 이상이어야 통과
  allowRoleSwitch: false,    // 역할 전환 불허
  requireAlternation: true   // 교대 필수
};

// =============================================================================
// Initialization
// =============================================================================

/**
 * 세션에 대한 역할 강제 초기화
 */
export function initializeRoleEnforcement(
  sessionId: string,
  config?: Partial<RoleEnforcementConfig>
): RoleState {
  // [FIX: MNT-02] Initialize with consolidated alternation structure
  const state: RoleState = {
    sessionId,
    complianceHistory: [],
    currentExpectedRole: 'verifier',  // 항상 Verifier가 먼저
    config: { ...DEFAULT_CONFIG, ...config },
    alternation: {
      expectedRole: 'verifier',
      nextRole: 'critic',
      history: []
    }
  };

  roleStates.set(sessionId, state);
  return state;
}

/**
 * 역할 상태 가져오기
 */
export function getRoleState(sessionId: string): RoleState | undefined {
  return roleStates.get(sessionId);
}

// =============================================================================
// Role Enforcement
// =============================================================================

/**
 * 역할 준수 여부 검증
 */
export function validateRoleCompliance(
  sessionId: string,
  role: VerifierRole,
  output: string,
  session: Session
): RoleComplianceResult {
  const state = roleStates.get(sessionId);
  if (!state) {
    // 자동 초기화
    initializeRoleEnforcement(sessionId);
    return validateRoleCompliance(sessionId, role, output, session);
  }

  const violations: RoleViolation[] = [];
  const warnings: RoleWarning[] = [];
  const suggestions: string[] = [];

  // 1. 역할 교대 검증
  if (state.config.requireAlternation) {
    const alternationResult = checkRoleAlternation(state, role);
    if (!alternationResult.valid) {
      violations.push({
        criterionId: 'ALT001',
        severity: 'ERROR',
        message: alternationResult.message,
        fix: `예상 역할: ${state.currentExpectedRole}`
      });
    }
  }

  // 2. 역할별 검증 기준 적용
  const roleDefinition = ROLE_DEFINITIONS[role];
  const context = buildRoleContext(sessionId, session);

  for (const criterion of roleDefinition.validationCriteria) {
    const result = criterion.check(output, context);

    if (!result.passed) {
      if (criterion.severity === 'ERROR') {
        violations.push({
          criterionId: criterion.id,
          severity: 'ERROR',
          message: result.message,
          evidence: result.details?.join('\n')
        });
      } else {
        warnings.push({
          type: criterion.id,
          message: result.message,
          suggestion: result.details?.[0] || '검토 필요'
        });
      }
    }
  }

  // 3. 역할별 필수 요소 검증
  const requiredCheck = checkRequiredElements(role, output);
  violations.push(...requiredCheck.violations);
  warnings.push(...requiredCheck.warnings);

  // 4. 점수 계산
  const score = calculateComplianceScore(violations, warnings, roleDefinition.validationCriteria.length);

  // 5. 제안 생성
  suggestions.push(...generateSuggestions(role, violations, warnings));

  const result: RoleComplianceResult = {
    role,
    round: session.currentRound + 1,
    isCompliant: violations.filter(v => v.severity === 'ERROR').length === 0 &&
                 score >= state.config.minComplianceScore,
    score,
    violations,
    warnings,
    suggestions
  };

  // [FIX: MNT-02] 상태 업데이트 - use consolidated alternation structure
  state.complianceHistory.push(result);
  const nextRole = role === 'verifier' ? 'critic' : 'verifier';
  state.currentExpectedRole = nextRole;
  state.alternation = {
    expectedRole: nextRole,
    nextRole: role,  // The one after next
    history: [...state.alternation.history, { role, round: session.currentRound + 1 }]
  };

  return result;
}

/**
 * 역할 교대 검증
 * [FIX: MNT-02] Use alternation structure for validation
 */
function checkRoleAlternation(
  state: RoleState,
  attemptedRole: VerifierRole
): { valid: boolean; message: string } {
  const expectedRole = state.alternation.expectedRole;
  if (attemptedRole !== expectedRole) {
    return {
      valid: false,
      message: `역할 교대 위반: ${expectedRole} 차례인데 ${attemptedRole}가 제출됨`
    };
  }
  return { valid: true, message: '' };
}

/**
 * 역할 컨텍스트 구축
 */
function buildRoleContext(sessionId: string, session: Session): RoleContext {
  const previousRounds: PreviousRoundSummary[] = session.rounds.map(r => ({
    round: r.number,
    role: r.role as VerifierRole,
    issuesRaised: r.issuesRaised,
    issuesChallenged: [],  // TODO: 추적 추가
    issuesResolved: r.issuesResolved
  }));

  const existingIssues: ExistingIssueSummary[] = session.issues.map(i => ({
    id: i.id,
    severity: i.severity,
    status: i.status,
    raisedBy: i.raisedBy as VerifierRole,
    challengedBy: undefined  // TODO: 추적 추가
  }));

  return {
    sessionId,
    currentRound: session.currentRound,
    previousRounds,
    existingIssues,
    targetFiles: Array.from(session.context.files.keys())
  };
}

/**
 * 필수 요소 검증
 */
function checkRequiredElements(
  role: VerifierRole,
  output: string
): { violations: RoleViolation[]; warnings: RoleWarning[] } {
  const violations: RoleViolation[] = [];
  const warnings: RoleWarning[] = [];

  if (role === 'verifier') {
    // Verifier 필수 요소
    if (!output.match(/(SEC|COR|REL|MNT|PRF)-\d+/) && !output.includes('이슈 없음') && !output.includes('no issues')) {
      warnings.push({
        type: 'MISSING_ISSUE_FORMAT',
        message: '표준 이슈 ID 형식(SEC-01 등)이 없습니다',
        suggestion: '이슈가 있다면 SEC-XX, COR-XX 형식으로 명시하세요'
      });
    }

    if (!output.match(/\w+\.\w+:\d+/) && output.match(/(SEC|COR|REL|MNT|PRF)-\d+/)) {
      violations.push({
        criterionId: 'REQ001',
        severity: 'WARNING',
        message: '이슈 위치(파일:라인)가 명시되지 않았습니다',
        fix: '각 이슈에 파일명:라인번호 형식으로 위치를 명시하세요'
      });
    }
  }

  if (role === 'critic') {
    // Critic 필수 요소
    if (!output.match(/\b(VALID|INVALID|PARTIAL)\b/gi)) {
      warnings.push({
        type: 'MISSING_VERDICT',
        message: '이슈 판정(VALID/INVALID/PARTIAL)이 없습니다',
        suggestion: '각 이슈에 대해 VALID, INVALID, PARTIAL 중 하나를 명시하세요'
      });
    }

    if (!output.match(/근거|이유|reasoning|because/gi) && output.match(/INVALID/gi)) {
      violations.push({
        criterionId: 'REQ002',
        severity: 'WARNING',
        message: 'INVALID 판정에 근거가 부족합니다',
        fix: '반박 시 구체적인 이유를 제시하세요'
      });
    }
  }

  return { violations, warnings };
}

/**
 * 순응도 점수 계산
 * [FIX: MNT-01] Use COMPLIANCE_SCORE constants
 */
function calculateComplianceScore(
  violations: RoleViolation[],
  warnings: RoleWarning[],
  _totalCriteria: number
): number {
  const errorCount = violations.filter(v => v.severity === 'ERROR').length;
  const warningCount = violations.filter(v => v.severity === 'WARNING').length + warnings.length;

  // [FIX: MNT-01] Use constants instead of magic numbers
  const score = COMPLIANCE_SCORE.BASE
    - (errorCount * COMPLIANCE_SCORE.ERROR_PENALTY)
    - (warningCount * COMPLIANCE_SCORE.WARNING_PENALTY);

  return Math.max(COMPLIANCE_SCORE.MIN_SCORE, Math.min(COMPLIANCE_SCORE.MAX_SCORE, score));
}

/**
 * 개선 제안 생성
 */
function generateSuggestions(
  role: VerifierRole,
  violations: RoleViolation[],
  warnings: RoleWarning[]
): string[] {
  const suggestions: string[] = [];
  const prompt = ROLE_PROMPTS[role];

  if (violations.length > 0) {
    suggestions.push(`${role === 'verifier' ? '검증자' : '비평자'} 역할 체크리스트를 확인하세요:`);
    suggestions.push(...prompt.checklist.slice(0, 3));
  }

  // 역할별 특정 제안
  if (role === 'verifier') {
    if (violations.some(v => v.criterionId === 'V001')) {
      suggestions.push('💡 모든 이슈에 코드 블록으로 증거를 포함하세요');
    }
    if (violations.some(v => v.criterionId === 'V003')) {
      suggestions.push('💡 이전 라운드에서 반박된 이슈는 새로운 증거 없이 재제기하지 마세요');
    }
  }

  if (role === 'critic') {
    if (violations.some(v => v.criterionId === 'C001')) {
      suggestions.push('💡 Verifier가 제기한 모든 이슈에 대해 판정을 내려야 합니다');
    }
    if (violations.some(v => v.criterionId === 'C002')) {
      suggestions.push('💡 새로운 이슈 발견은 Verifier의 역할입니다. 기존 이슈만 검토하세요');
    }
  }

  return suggestions;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * 다음 예상 역할 가져오기
 */
export function getExpectedRole(sessionId: string): VerifierRole {
  const state = roleStates.get(sessionId);
  return state?.currentExpectedRole || 'verifier';
}

/**
 * 역할 프롬프트 가져오기
 */
export function getRolePrompt(role: VerifierRole): RolePrompt {
  return ROLE_PROMPTS[role];
}

/**
 * 역할 정의 가져오기
 */
export function getRoleDefinition(role: VerifierRole) {
  return ROLE_DEFINITIONS[role];
}

/**
 * 순응도 이력 가져오기
 */
export function getComplianceHistory(sessionId: string): RoleComplianceResult[] {
  return roleStates.get(sessionId)?.complianceHistory || [];
}

/**
 * 역할 강제 설정 업데이트
 */
export function updateRoleConfig(
  sessionId: string,
  config: Partial<RoleEnforcementConfig>
): RoleEnforcementConfig | null {
  const state = roleStates.get(sessionId);
  if (!state) return null;

  state.config = { ...state.config, ...config };
  return state.config;
}

/**
 * 역할 강제 요약
 */
export function getRoleEnforcementSummary(sessionId: string): object | null {
  const state = roleStates.get(sessionId);
  if (!state) return null;

  const history = state.complianceHistory;
  const verifierResults = history.filter(r => r.role === 'verifier');
  const criticResults = history.filter(r => r.role === 'critic');

  const avgVerifierScore = verifierResults.length > 0
    ? verifierResults.reduce((sum, r) => sum + r.score, 0) / verifierResults.length
    : 0;

  const avgCriticScore = criticResults.length > 0
    ? criticResults.reduce((sum, r) => sum + r.score, 0) / criticResults.length
    : 0;

  const totalViolations = history.reduce((sum, r) => sum + r.violations.length, 0);
  const totalWarnings = history.reduce((sum, r) => sum + r.warnings.length, 0);

  return {
    sessionId,
    config: state.config,
    currentExpectedRole: state.currentExpectedRole,
    // [FIX: MNT-02] Include alternation info in summary
    alternation: {
      expectedRole: state.alternation.expectedRole,
      nextRole: state.alternation.nextRole,
      totalAlternations: state.alternation.history.length
    },
    stats: {
      totalRounds: history.length,
      verifierRounds: verifierResults.length,
      criticRounds: criticResults.length,
      avgVerifierScore: avgVerifierScore.toFixed(1),
      avgCriticScore: avgCriticScore.toFixed(1),
      totalViolations,
      totalWarnings,
      complianceRate: history.length > 0
        ? ((history.filter(r => r.isCompliant).length / history.length) * 100).toFixed(1) + '%'
        : 'N/A'
    },
    recentViolations: history
      .flatMap(r => r.violations)
      .slice(-5)
      .map(v => ({ id: v.criterionId, message: v.message }))
  };
}

// =============================================================================
// Cache Cleanup
// =============================================================================

/**
 * [FIX: REL-02] Delete role state from memory cache
 * Called when session is ended to prevent memory leaks
 */
export function deleteRoleState(sessionId: string): boolean {
  return roleStates.delete(sessionId);
}

// =============================================================================
// Export for Tools
// =============================================================================

export {
  VERIFIER_ROLE,
  CRITIC_ROLE,
  ROLE_DEFINITIONS,
  ROLE_PROMPTS
};
