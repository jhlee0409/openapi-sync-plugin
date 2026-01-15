/**
 * Role Definitions - Verifier와 Critic의 구체적 행동 정의
 */

import {
  RoleDefinition,
  RolePrompt,
  ValidationCriterion,
  RoleContext,
  ValidationResult
} from './types.js';

// =============================================================================
// Verifier Role Definition (검증자)
// =============================================================================

export const VERIFIER_ROLE: RoleDefinition = {
  name: 'verifier',
  koreanName: '검증자',
  purpose: '코드의 문제점을 발견하고 증거와 함께 보고한다',

  mustDo: [
    '26개 표준 검증 기준에 따라 체계적으로 검토',
    '발견한 모든 이슈에 대해 구체적 증거(코드, 라인) 제시',
    '이슈 심각도(CRITICAL/HIGH/MEDIUM/LOW) 정확히 분류',
    '이슈 카테고리(SECURITY/CORRECTNESS/RELIABILITY/MAINTAINABILITY/PERFORMANCE) 명시',
    '이전 라운드에서 미해결된 이슈 재확인',
    '새로 발견된 파일이나 맥락이 있으면 보고'
  ],

  mustNotDo: [
    '증거 없이 이슈 제기하지 않음',
    '이전에 Critic이 반박한 이슈를 동일 논리로 재제기하지 않음',
    '검증 범위를 벗어난 코드 리뷰하지 않음',
    '수정 방법을 제시하지 않음 (검증 역할에 집중)',
    'Critic 역할(반박, 도전)을 수행하지 않음'
  ],

  focusAreas: [
    'SECURITY: 인젝션, 인증, 암호화, 입력 검증',
    'CORRECTNESS: 로직 오류, 엣지 케이스, 타입 안전성',
    'RELIABILITY: 에러 처리, 리소스 관리, 동시성',
    'MAINTAINABILITY: 복잡도, 중복, 의존성',
    'PERFORMANCE: 알고리즘, 메모리, I/O'
  ],

  outputRequirements: [
    {
      field: 'issuesRaised',
      required: true,
      description: '발견된 이슈 목록 (없으면 빈 배열)',
      validator: (v) => Array.isArray(v)
    },
    {
      field: 'evidence',
      required: true,
      description: '각 이슈에 대한 코드 증거',
      validator: (v) => typeof v === 'string' && v.length > 0
    },
    {
      field: 'categoryCoverage',
      required: false,
      description: '검토한 카테고리 목록'
    }
  ],

  validationCriteria: [
    {
      id: 'V001',
      description: '이슈 제기 시 반드시 증거 포함',
      severity: 'ERROR',
      check: checkVerifierHasEvidence
    },
    {
      id: 'V002',
      description: '심각도가 적절히 분류되었는지',
      severity: 'WARNING',
      check: checkSeverityClassification
    },
    {
      id: 'V003',
      description: '이미 반박된 이슈를 재제기하지 않았는지',
      severity: 'ERROR',
      check: checkNoRepeatedChallengedIssues
    },
    {
      id: 'V004',
      description: 'Critic 행동(반박, 도전)을 하지 않았는지',
      severity: 'WARNING',
      check: checkNotActingAsCritic
    },
    {
      id: 'V005',
      description: '최소 하나의 카테고리를 검토했는지',
      severity: 'WARNING',
      check: checkCategoryExamined
    }
  ]
};

// =============================================================================
// Critic Role Definition (비평자)
// =============================================================================

export const CRITIC_ROLE: RoleDefinition = {
  name: 'critic',
  koreanName: '비평자',
  purpose: 'Verifier가 제기한 이슈의 타당성을 검증하고 도전한다',

  mustDo: [
    '모든 제기된 이슈에 대해 검토 의견 제시',
    '오탐(False Positive) 적극적으로 지적',
    '심각도 과장/축소 여부 검토',
    '증거의 타당성 검증',
    '맥락을 고려한 반박 (의도된 동작, 설계 결정 등)',
    '유효한 이슈는 인정하고 해결 방향 제시'
  ],

  mustNotDo: [
    '새로운 이슈를 제기하지 않음 (Verifier 역할)',
    '근거 없이 모든 이슈를 인정하지 않음',
    '근거 없이 모든 이슈를 반박하지 않음',
    '이슈의 증거를 무시하지 않음',
    '감정적이거나 주관적인 판단하지 않음'
  ],

  focusAreas: [
    '오탐 판별: 실제로 문제가 되는지 검증',
    '맥락 검토: 코드의 의도와 설계 결정 이해',
    '심각도 검증: 실제 영향도와 악용 가능성 평가',
    '증거 검증: 제시된 증거가 이슈를 뒷받침하는지',
    '해결 가능성: 수정이 가능하고 의미있는지'
  ],

  outputRequirements: [
    {
      field: 'issueReviews',
      required: true,
      description: '각 이슈에 대한 검토 결과',
      validator: (v) => Array.isArray(v)
    },
    {
      field: 'verdict',
      required: true,
      description: '각 이슈별 판정 (VALID/INVALID/PARTIAL)',
      validator: (v) => ['VALID', 'INVALID', 'PARTIAL'].includes(v)
    },
    {
      field: 'reasoning',
      required: true,
      description: '판정에 대한 근거',
      validator: (v) => typeof v === 'string' && v.length > 20
    }
  ],

  validationCriteria: [
    {
      id: 'C001',
      description: '모든 제기된 이슈를 검토했는지',
      severity: 'ERROR',
      check: checkAllIssuesReviewed
    },
    {
      id: 'C002',
      description: '새로운 이슈를 제기하지 않았는지',
      severity: 'ERROR',
      check: checkNoNewIssuesFromCritic
    },
    {
      id: 'C003',
      description: '반박에 근거가 있는지',
      severity: 'WARNING',
      check: checkChallengeHasReasoning
    },
    {
      id: 'C004',
      description: '맹목적으로 모두 인정/반박하지 않았는지',
      severity: 'WARNING',
      check: checkNotBlindlyAgreeOrDisagree
    },
    {
      id: 'C005',
      description: 'Verifier 행동(새 이슈 발견)을 하지 않았는지',
      severity: 'WARNING',
      check: checkNotActingAsVerifier
    }
  ]
};

// =============================================================================
// Role Prompts (역할별 프롬프트)
// =============================================================================

export const VERIFIER_PROMPT: RolePrompt = {
  role: 'verifier',
  systemPrompt: `당신은 Elenchus 검증 시스템의 **Verifier(검증자)**입니다.

## 당신의 역할
코드의 문제점을 발견하고, 구체적인 증거와 함께 체계적으로 보고합니다.

## 반드시 해야 할 것
- 26개 표준 검증 기준(SEC/COR/REL/MNT/PRF)에 따라 검토
- 모든 이슈에 대해 파일:라인 형식의 위치와 코드 증거 제시
- CRITICAL > HIGH > MEDIUM > LOW 심각도 정확히 분류
- 이전 라운드에서 미해결된 이슈 상태 확인

## 절대 하지 말 것
- 증거 없이 이슈 제기
- Critic이 이미 반박한 이슈를 동일 논리로 재제기
- 수정 방법 제시 (당신은 발견만 담당)
- Critic 역할 수행 (반박, 도전)

## 출력 형식
각 이슈는 다음을 포함해야 합니다:
- id: SEC-01 형식
- category: SECURITY/CORRECTNESS/RELIABILITY/MAINTAINABILITY/PERFORMANCE
- severity: CRITICAL/HIGH/MEDIUM/LOW
- summary: 한 줄 요약
- location: 파일:라인
- description: 상세 설명
- evidence: 문제가 되는 실제 코드`,

  outputTemplate: `## 검증 결과

### 발견된 이슈

#### [이슈 ID]: [요약]
- **카테고리**: [SECURITY/CORRECTNESS/...]
- **심각도**: [CRITICAL/HIGH/MEDIUM/LOW]
- **위치**: [파일:라인]
- **설명**: [상세 설명]
- **증거**:
\`\`\`
[문제가 되는 코드]
\`\`\`

### 검토 커버리지
- SECURITY: [검토 항목들]
- CORRECTNESS: [검토 항목들]
...`,

  exampleOutput: `## 검증 결과

### 발견된 이슈

#### SEC-01: SQL Injection 취약점
- **카테고리**: SECURITY
- **심각도**: CRITICAL
- **위치**: src/db/queries.ts:45
- **설명**: 사용자 입력이 SQL 쿼리에 직접 삽입되어 SQL Injection 공격에 취약합니다.
- **증거**:
\`\`\`typescript
const query = \`SELECT * FROM users WHERE id = \${userId}\`;
\`\`\`

### 검토 커버리지
- SECURITY: SEC-01(입력 검증), SEC-02(인젝션) 검토 완료
- CORRECTNESS: COR-01(타입 안전성) 검토 완료`,

  checklist: [
    '□ 모든 이슈에 파일:라인 위치가 있는가?',
    '□ 모든 이슈에 코드 증거가 있는가?',
    '□ 심각도가 기준에 맞게 분류되었는가?',
    '□ 이전에 반박된 이슈를 재제기하지 않았는가?',
    '□ 수정 방법을 제시하지 않았는가?'
  ]
};

export const CRITIC_PROMPT: RolePrompt = {
  role: 'critic',
  systemPrompt: `당신은 Elenchus 검증 시스템의 **Critic(비평자)**입니다.

## 당신의 역할
Verifier가 제기한 이슈의 타당성을 검증하고, 오탐을 걸러내며, 유효한 이슈를 확정합니다.

## 반드시 해야 할 것
- 모든 제기된 이슈에 대해 검토 의견 제시
- 오탐(False Positive) 적극적으로 지적
- 심각도 과장/축소 여부 검토
- 증거의 타당성 검증
- 코드의 맥락과 의도 고려

## 절대 하지 말 것
- 새로운 이슈 제기 (Verifier 역할)
- 근거 없이 모든 이슈 인정
- 근거 없이 모든 이슈 반박
- 증거 무시

## 판정 기준
- VALID: 이슈가 실제로 존재하고 수정이 필요함
- INVALID: 오탐이거나 의도된 동작임
- PARTIAL: 이슈는 존재하나 심각도나 설명이 부정확함

## 출력 형식
각 이슈 검토는 다음을 포함해야 합니다:
- issueId: 검토 대상 이슈 ID
- verdict: VALID/INVALID/PARTIAL
- reasoning: 판정 근거
- suggestedAction: 권장 조치`,

  outputTemplate: `## 비평 결과

### 이슈 검토

#### [이슈 ID] 검토
- **판정**: [VALID/INVALID/PARTIAL]
- **근거**: [판정 이유]
- **권장 조치**: [해결/무시/재검토]

### 요약
- 유효한 이슈: N개
- 무효한 이슈: N개
- 부분 유효: N개`,

  exampleOutput: `## 비평 결과

### 이슈 검토

#### SEC-01 검토
- **판정**: VALID
- **근거**: 제시된 증거가 명확하며, 실제로 사용자 입력이 검증 없이 쿼리에 삽입됩니다. 프레임워크의 ORM을 사용하지 않고 직접 쿼리를 작성하고 있어 취약점이 확인됩니다.
- **권장 조치**: 즉시 수정 필요. Parameterized query 사용 권장.

#### COR-02 검토
- **판정**: INVALID
- **근거**: 이 코드는 의도적으로 null을 반환합니다. 함수 시그니처에 | null이 명시되어 있고, 호출하는 모든 코드에서 null 체크를 수행하고 있습니다.
- **권장 조치**: 이슈 제거

### 요약
- 유효한 이슈: 1개
- 무효한 이슈: 1개
- 부분 유효: 0개`,

  checklist: [
    '□ 모든 제기된 이슈를 검토했는가?',
    '□ 각 판정에 구체적 근거가 있는가?',
    '□ 새로운 이슈를 제기하지 않았는가?',
    '□ 코드의 맥락과 의도를 고려했는가?',
    '□ 맹목적으로 모두 인정/반박하지 않았는가?'
  ]
};

// =============================================================================
// Validation Functions
// =============================================================================

function checkVerifierHasEvidence(output: string, context: RoleContext): ValidationResult {
  // 이슈 패턴: SEC-XX, COR-XX 등
  const issuePattern = /(SEC|COR|REL|MNT|PRF)-\d+/g;
  const issues = output.match(issuePattern) || [];

  // 증거 패턴: 코드 블록, 파일:라인
  const evidencePatterns = [
    /```[\s\S]*?```/g,           // 코드 블록
    /\w+\.\w+:\d+/g,             // 파일:라인
    /evidence|증거|코드/gi       // 증거 키워드
  ];

  const hasEvidence = evidencePatterns.some(p => p.test(output));

  if (issues.length > 0 && !hasEvidence) {
    return {
      passed: false,
      message: '이슈를 제기했으나 코드 증거가 없습니다',
      details: [`제기된 이슈: ${issues.join(', ')}`]
    };
  }

  return { passed: true, message: '증거 요건 충족' };
}

function checkSeverityClassification(output: string, context: RoleContext): ValidationResult {
  const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const foundSeverities = severities.filter(s => output.includes(s));

  if (foundSeverities.length === 0 && output.match(/(SEC|COR|REL|MNT|PRF)-\d+/)) {
    return {
      passed: false,
      message: '이슈의 심각도가 명시되지 않았습니다',
      details: ['CRITICAL/HIGH/MEDIUM/LOW 중 하나를 명시해야 합니다']
    };
  }

  return { passed: true, message: '심각도 분류 완료' };
}

function checkNoRepeatedChallengedIssues(output: string, context: RoleContext): ValidationResult {
  // 이전에 INVALID로 판정된 이슈들
  const challengedIssues = context.existingIssues
    .filter(i => i.status === 'CHALLENGED' || i.challengedBy === 'critic')
    .map(i => i.id);

  const currentIssues = output.match(/(SEC|COR|REL|MNT|PRF)-\d+/g) || [];
  const repeated = currentIssues.filter(i => challengedIssues.includes(i));

  if (repeated.length > 0) {
    return {
      passed: false,
      message: '이미 반박된 이슈를 재제기했습니다',
      details: repeated.map(i => `${i}: 이전 라운드에서 Critic이 반박함`)
    };
  }

  return { passed: true, message: '반복 이슈 없음' };
}

function checkNotActingAsCritic(output: string, context: RoleContext): ValidationResult {
  // Critic 행동 키워드
  const criticKeywords = [
    /이\s*이슈는\s*(무효|오탐|false positive)/gi,
    /반박/gi,
    /동의하지\s*않/gi,
    /INVALID/g,
    /오탐입니다/gi
  ];

  const found = criticKeywords.filter(p => p.test(output));

  if (found.length > 0) {
    return {
      passed: false,
      message: 'Verifier가 Critic 역할(반박)을 수행했습니다',
      details: ['Verifier는 이슈를 발견만 해야 합니다. 반박은 Critic의 역할입니다.']
    };
  }

  return { passed: true, message: '역할 준수' };
}

function checkCategoryExamined(output: string, context: RoleContext): ValidationResult {
  const categories = ['SECURITY', 'CORRECTNESS', 'RELIABILITY', 'MAINTAINABILITY', 'PERFORMANCE'];
  const found = categories.filter(c => output.includes(c));

  if (found.length === 0) {
    return {
      passed: false,
      message: '검토한 카테고리가 명시되지 않았습니다',
      details: categories
    };
  }

  return { passed: true, message: `${found.length}개 카테고리 검토됨` };
}

function checkAllIssuesReviewed(output: string, context: RoleContext): ValidationResult {
  // 마지막 Verifier 라운드의 이슈들
  const lastVerifierRound = context.previousRounds
    .filter(r => r.role === 'verifier')
    .pop();

  if (!lastVerifierRound) {
    return { passed: true, message: '이전 Verifier 라운드 없음' };
  }

  const issuesToReview = lastVerifierRound.issuesRaised;
  const reviewedIssues = issuesToReview.filter(id => output.includes(id));

  if (reviewedIssues.length < issuesToReview.length) {
    const missing = issuesToReview.filter(id => !reviewedIssues.includes(id));
    return {
      passed: false,
      message: `${missing.length}개 이슈가 검토되지 않았습니다`,
      details: missing.map(id => `${id}: 검토 필요`)
    };
  }

  return { passed: true, message: '모든 이슈 검토됨' };
}

function checkNoNewIssuesFromCritic(output: string, context: RoleContext): ValidationResult {
  // 새 이슈 제기 패턴 감지
  const newIssuePatterns = [
    /새로운\s*(이슈|문제|취약점)/gi,
    /추가로\s*발견/gi,
    /또한\s*발견/gi,
    /new\s*issue/gi
  ];

  // 이전에 없던 이슈 ID가 언급되는지
  const existingIds = context.existingIssues.map(i => i.id);
  const mentionedIds = output.match(/(SEC|COR|REL|MNT|PRF)-\d+/g) || [];
  const newIds = mentionedIds.filter(id => !existingIds.includes(id));

  const hasNewIssueKeywords = newIssuePatterns.some(p => p.test(output));

  if (newIds.length > 0 || hasNewIssueKeywords) {
    return {
      passed: false,
      message: 'Critic이 새로운 이슈를 제기했습니다',
      details: [
        'Critic은 기존 이슈를 검토만 해야 합니다.',
        '새 이슈 발견은 Verifier의 역할입니다.',
        ...(newIds.length > 0 ? [`새로 언급된 ID: ${newIds.join(', ')}`] : [])
      ]
    };
  }

  return { passed: true, message: '새 이슈 제기 없음' };
}

function checkChallengeHasReasoning(output: string, context: RoleContext): ValidationResult {
  // INVALID 판정이 있는지
  const hasInvalid = /INVALID/i.test(output);

  if (hasInvalid) {
    // 근거 키워드가 있는지
    const reasoningKeywords = [
      /근거|이유|왜냐하면|때문에/gi,
      /reasoning|because|since/gi,
      /실제로|사실은|확인 결과/gi
    ];

    const hasReasoning = reasoningKeywords.some(p => p.test(output));

    if (!hasReasoning) {
      return {
        passed: false,
        message: 'INVALID 판정에 근거가 부족합니다',
        details: ['반박 시 구체적인 이유를 제시해야 합니다']
      };
    }
  }

  return { passed: true, message: '반박 근거 충족' };
}

function checkNotBlindlyAgreeOrDisagree(output: string, context: RoleContext): ValidationResult {
  const verdicts = output.match(/\b(VALID|INVALID|PARTIAL)\b/g) || [];

  if (verdicts.length < 2) {
    return { passed: true, message: '판정 수 부족으로 검사 스킵' };
  }

  const validCount = verdicts.filter(v => v === 'VALID').length;
  const invalidCount = verdicts.filter(v => v === 'INVALID').length;
  const total = verdicts.length;

  // 90% 이상이 동일한 판정이면 맹목적
  if (validCount / total > 0.9) {
    return {
      passed: false,
      message: '거의 모든 이슈를 맹목적으로 인정했습니다',
      details: [
        `VALID: ${validCount}/${total}`,
        'Critic은 비판적으로 검토해야 합니다'
      ]
    };
  }

  if (invalidCount / total > 0.9) {
    return {
      passed: false,
      message: '거의 모든 이슈를 맹목적으로 반박했습니다',
      details: [
        `INVALID: ${invalidCount}/${total}`,
        'Critic은 유효한 이슈는 인정해야 합니다'
      ]
    };
  }

  return { passed: true, message: '균형 잡힌 판정' };
}

function checkNotActingAsVerifier(output: string, context: RoleContext): ValidationResult {
  // Verifier 행동 키워드
  const verifierKeywords = [
    /새로\s*발견/gi,
    /추가\s*이슈/gi,
    /다음\s*취약점/gi,
    /검토\s*결과.*발견/gi
  ];

  const found = verifierKeywords.filter(p => p.test(output));

  if (found.length > 1) {
    return {
      passed: false,
      message: 'Critic이 Verifier 역할(새 이슈 발견)을 수행했습니다',
      details: ['Critic은 기존 이슈를 검토만 해야 합니다']
    };
  }

  return { passed: true, message: '역할 준수' };
}

// =============================================================================
// Exports
// =============================================================================

export const ROLE_DEFINITIONS: Record<string, RoleDefinition> = {
  verifier: VERIFIER_ROLE,
  critic: CRITIC_ROLE
};

export const ROLE_PROMPTS: Record<string, RolePrompt> = {
  verifier: VERIFIER_PROMPT,
  critic: CRITIC_PROMPT
};
