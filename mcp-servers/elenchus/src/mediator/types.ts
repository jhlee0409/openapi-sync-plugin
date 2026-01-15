/**
 * Mediator Types - 코드 관계 분석 및 중재 로직
 */

// =============================================================================
// Dependency Graph Types
// =============================================================================

export interface DependencyNode {
  path: string;
  imports: ImportInfo[];
  exports: ExportInfo[];
  functions: FunctionInfo[];
  classes: ClassInfo[];
}

export interface ImportInfo {
  source: string;           // import from 'source'
  specifiers: string[];     // { a, b, c }
  isDefault: boolean;
  isDynamic: boolean;       // dynamic import()
  line: number;
}

export interface ExportInfo {
  name: string;
  isDefault: boolean;
  type: 'function' | 'class' | 'variable' | 'type' | 're-export';
  line: number;
}

export interface FunctionInfo {
  name: string;
  line: number;
  endLine: number;
  calls: string[];          // 호출하는 다른 함수들
  isAsync: boolean;
  isExported: boolean;
  parameters: string[];
}

export interface ClassInfo {
  name: string;
  line: number;
  endLine: number;
  methods: string[];
  extends?: string;
  implements?: string[];
  isExported: boolean;
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: DependencyEdge[];
  reverseEdges: Map<string, string[]>;  // path -> files that import this
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: 'import' | 'dynamic-import' | 'type-import';
  specifiers: string[];
}

// =============================================================================
// Coverage Tracking Types
// =============================================================================

export interface VerificationCoverage {
  totalFiles: number;
  verifiedFiles: Set<string>;
  partiallyVerified: Map<string, CoverageDetail>;
  unverifiedCritical: string[];   // 중요하지만 검증 안된 파일
}

export interface CoverageDetail {
  path: string;
  functionsTotal: number;
  functionsVerified: string[];
  linesTotal: number;
  linesMentioned: number[];       // 검증 출력에서 언급된 라인들
  lastVerifiedRound: number;
}

// =============================================================================
// Active Intervention Types
// =============================================================================

export type ActiveInterventionType =
  | 'MISSED_DEPENDENCY'      // 관련 코드 누락
  | 'INCOMPLETE_COVERAGE'    // 중요 섹션 미검증
  | 'SIDE_EFFECT_WARNING'    // 사이드 이펙트 가능성
  | 'RIPPLE_EFFECT'          // 변경 영향 범위
  | 'CONTEXT_CORRECTION'     // 검증자 이해 오류
  | 'SCOPE_DRIFT'            // 범위 이탈
  | 'CIRCULAR_DEPENDENCY'    // 순환 의존성 발견
  | 'CRITICAL_PATH_IGNORED'; // 중요 경로 무시

export interface ActiveIntervention {
  type: ActiveInterventionType;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  reason: string;
  action: string;

  // 구체적 정보
  affectedFiles?: string[];
  missedCode?: MissedCodeInfo[];
  suggestedChecks?: string[];
  relatedIssues?: string[];
}

export interface MissedCodeInfo {
  file: string;
  functions?: string[];
  lines?: number[];
  reason: string;           // 왜 이 코드를 봐야 하는지
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
}

// =============================================================================
// Ripple Effect Analysis
// =============================================================================

export interface RippleEffect {
  changedFile: string;
  changedFunction?: string;
  affectedFiles: AffectedFile[];
  depth: number;              // 영향 깊이 (1=직접, 2=간접...)
  totalAffected: number;
}

export interface AffectedFile {
  path: string;
  depth: number;
  affectedFunctions: string[];
  impactType: 'direct' | 'indirect' | 'type-only';
  reason: string;
}

// =============================================================================
// Mediator State
// =============================================================================

export interface MediatorState {
  sessionId: string;
  graph: DependencyGraph;
  coverage: VerificationCoverage;
  interventions: ActiveIntervention[];
  mentionedLocations: Map<string, Set<number>>;  // file -> mentioned lines
  verifierFocus: string[];      // 검증자가 집중하고 있는 파일들
  ignoredWarnings: string[];    // 무시된 경고들
}
