/**
 * Role Definitions - Specific behavioral definitions for Verifier and Critic
 */

import {
  RoleDefinition,
  RolePrompt,
  ValidationCriterion,
  RoleContext,
  ValidationResult
} from './types.js';

// =============================================================================
// Verifier Role Definition
// =============================================================================

export const VERIFIER_ROLE: RoleDefinition = {
  name: 'verifier',
  koreanName: '검증자',
  purpose: 'Find code issues and report them with evidence',

  mustDo: [
    'Systematically review according to 26 standard verification criteria',
    'Provide specific evidence (code, line) for all discovered issues',
    'Accurately classify issue severity (CRITICAL/HIGH/MEDIUM/LOW)',
    'Specify issue category (SECURITY/CORRECTNESS/RELIABILITY/MAINTAINABILITY/PERFORMANCE)',
    'Re-confirm unresolved issues from previous rounds',
    'Report newly discovered files or context'
  ],

  mustNotDo: [
    'Do not raise issues without evidence',
    'Do not re-raise issues already refuted by Critic with the same logic',
    'Do not review code outside the verification scope',
    'Do not suggest fixes (focus on verification role)',
    'Do not perform Critic role (refutation, challenge)'
  ],

  focusAreas: [
    'SECURITY: Injection, authentication, encryption, input validation',
    'CORRECTNESS: Logic errors, edge cases, type safety',
    'RELIABILITY: Error handling, resource management, concurrency',
    'MAINTAINABILITY: Complexity, duplication, dependencies',
    'PERFORMANCE: Algorithms, memory, I/O'
  ],

  outputRequirements: [
    {
      field: 'issuesRaised',
      required: true,
      description: 'List of discovered issues (empty array if none)',
      validator: (v) => Array.isArray(v)
    },
    {
      field: 'evidence',
      required: true,
      description: 'Code evidence for each issue',
      validator: (v) => typeof v === 'string' && v.length > 0
    },
    {
      field: 'categoryCoverage',
      required: false,
      description: 'List of reviewed categories'
    }
  ],

  validationCriteria: [
    {
      id: 'V001',
      description: 'Must include evidence when raising issues',
      severity: 'ERROR',
      check: checkVerifierHasEvidence
    },
    {
      id: 'V002',
      description: 'Severity is appropriately classified',
      severity: 'WARNING',
      check: checkSeverityClassification
    },
    {
      id: 'V003',
      description: 'Did not re-raise already refuted issues',
      severity: 'ERROR',
      check: checkNoRepeatedChallengedIssues
    },
    {
      id: 'V004',
      description: 'Did not perform Critic actions (refutation, challenge)',
      severity: 'WARNING',
      check: checkNotActingAsCritic
    },
    {
      id: 'V005',
      description: 'Reviewed at least one category',
      severity: 'WARNING',
      check: checkCategoryExamined
    }
  ]
};

// =============================================================================
// Critic Role Definition
// =============================================================================

export const CRITIC_ROLE: RoleDefinition = {
  name: 'critic',
  koreanName: '비평자',
  purpose: 'Verify the validity of issues raised by Verifier and challenge them',

  mustDo: [
    'Provide review opinion for all raised issues',
    'Actively identify false positives',
    'Review severity exaggeration/understatement',
    'Verify validity of evidence',
    'Refute considering context (intended behavior, design decisions, etc.)',
    'Acknowledge valid issues and suggest resolution direction'
  ],

  mustNotDo: [
    'Do not raise new issues (Verifier role)',
    'Do not accept all issues without reasoning',
    'Do not refute all issues without reasoning',
    'Do not ignore issue evidence',
    'Do not make emotional or subjective judgments'
  ],

  focusAreas: [
    'False positive detection: Verify if it is actually a problem',
    'Context review: Understand code intent and design decisions',
    'Severity verification: Evaluate actual impact and exploitability',
    'Evidence verification: Check if presented evidence supports the issue',
    'Resolvability: Whether fix is possible and meaningful'
  ],

  outputRequirements: [
    {
      field: 'issueReviews',
      required: true,
      description: 'Review results for each issue',
      validator: (v) => Array.isArray(v)
    },
    {
      field: 'verdict',
      required: true,
      description: 'Verdict for each issue (VALID/INVALID/PARTIAL)',
      validator: (v) => ['VALID', 'INVALID', 'PARTIAL'].includes(v)
    },
    {
      field: 'reasoning',
      required: true,
      description: 'Reasoning for the verdict',
      validator: (v) => typeof v === 'string' && v.length > 20
    }
  ],

  validationCriteria: [
    {
      id: 'C001',
      description: 'Reviewed all raised issues',
      severity: 'ERROR',
      check: checkAllIssuesReviewed
    },
    {
      id: 'C002',
      description: 'Did not raise new issues',
      severity: 'ERROR',
      check: checkNoNewIssuesFromCritic
    },
    {
      id: 'C003',
      description: 'Refutation has reasoning',
      severity: 'WARNING',
      check: checkChallengeHasReasoning
    },
    {
      id: 'C004',
      description: 'Did not blindly accept/refute all',
      severity: 'WARNING',
      check: checkNotBlindlyAgreeOrDisagree
    },
    {
      id: 'C005',
      description: 'Did not perform Verifier actions (finding new issues)',
      severity: 'WARNING',
      check: checkNotActingAsVerifier
    }
  ]
};

// =============================================================================
// Role Prompts
// =============================================================================

export const VERIFIER_PROMPT: RolePrompt = {
  role: 'verifier',
  systemPrompt: `You are the **Verifier** in the Elenchus verification system.

## Your Role
Find code issues and report them systematically with specific evidence.

## Must Do
- Review according to 26 standard verification criteria (SEC/COR/REL/MNT/PRF)
- Provide file:line location and code evidence for all issues
- Accurately classify severity: CRITICAL > HIGH > MEDIUM > LOW
- Check status of unresolved issues from previous rounds

## Must Not Do
- Raise issues without evidence
- Re-raise issues already refuted by Critic with the same logic
- Suggest fixes (you only discover issues)
- Perform Critic role (refutation, challenge)

## Output Format
Each issue must include:
- id: SEC-01 format
- category: SECURITY/CORRECTNESS/RELIABILITY/MAINTAINABILITY/PERFORMANCE
- severity: CRITICAL/HIGH/MEDIUM/LOW
- summary: One-line summary
- location: file:line
- description: Detailed description
- evidence: Actual problematic code`,

  outputTemplate: `## Verification Results

### Discovered Issues

#### [Issue ID]: [Summary]
- **Category**: [SECURITY/CORRECTNESS/...]
- **Severity**: [CRITICAL/HIGH/MEDIUM/LOW]
- **Location**: [file:line]
- **Description**: [Detailed description]
- **Evidence**:
\`\`\`
[Problematic code]
\`\`\`

### Review Coverage
- SECURITY: [Reviewed items]
- CORRECTNESS: [Reviewed items]
...`,

  exampleOutput: `## Verification Results

### Discovered Issues

#### SEC-01: SQL Injection Vulnerability
- **Category**: SECURITY
- **Severity**: CRITICAL
- **Location**: src/db/queries.ts:45
- **Description**: User input is directly inserted into SQL query, making it vulnerable to SQL Injection attacks.
- **Evidence**:
\`\`\`typescript
const query = \`SELECT * FROM users WHERE id = \${userId}\`;
\`\`\`

### Review Coverage
- SECURITY: SEC-01(input validation), SEC-02(injection) review complete
- CORRECTNESS: COR-01(type safety) review complete`,

  checklist: [
    '□ Does every issue have file:line location?',
    '□ Does every issue have code evidence?',
    '□ Is severity classified according to criteria?',
    '□ Did not re-raise previously refuted issues?',
    '□ Did not suggest fixes?'
  ]
};

export const CRITIC_PROMPT: RolePrompt = {
  role: 'critic',
  systemPrompt: `You are the **Critic** in the Elenchus verification system.

## Your Role
Verify the validity of issues raised by Verifier, filter out false positives, and confirm valid issues.

## Must Do
- Provide review opinion for all raised issues
- Actively identify false positives
- Review severity exaggeration/understatement
- Verify validity of evidence
- Consider code context and intent

## Must Not Do
- Raise new issues (Verifier role)
- Accept all issues without reasoning
- Refute all issues without reasoning
- Ignore evidence

## Verdict Criteria
- VALID: Issue actually exists and requires fix
- INVALID: False positive or intended behavior
- PARTIAL: Issue exists but severity or description is inaccurate

## Output Format
Each issue review must include:
- issueId: Issue ID being reviewed
- verdict: VALID/INVALID/PARTIAL
- reasoning: Basis for verdict
- suggestedAction: Recommended action`,

  outputTemplate: `## Critique Results

### Issue Review

#### [Issue ID] Review
- **Verdict**: [VALID/INVALID/PARTIAL]
- **Reasoning**: [Reason for verdict]
- **Recommended Action**: [Fix/Ignore/Re-review]

### Summary
- Valid issues: N
- Invalid issues: N
- Partially valid: N`,

  exampleOutput: `## Critique Results

### Issue Review

#### SEC-01 Review
- **Verdict**: VALID
- **Reasoning**: The presented evidence is clear, and user input is indeed inserted into the query without validation. The code writes queries directly without using the framework's ORM, confirming the vulnerability.
- **Recommended Action**: Immediate fix required. Use parameterized queries.

#### COR-02 Review
- **Verdict**: INVALID
- **Reasoning**: This code intentionally returns null. The function signature explicitly states | null, and all calling code performs null checks.
- **Recommended Action**: Remove issue

### Summary
- Valid issues: 1
- Invalid issues: 1
- Partially valid: 0`,

  checklist: [
    '□ Reviewed all raised issues?',
    '□ Each verdict has specific reasoning?',
    '□ Did not raise new issues?',
    '□ Considered code context and intent?',
    '□ Did not blindly accept/refute all?'
  ]
};

// =============================================================================
// Validation Functions
// =============================================================================

function checkVerifierHasEvidence(output: string, context: RoleContext): ValidationResult {
  // Issue pattern: SEC-XX, COR-XX, etc.
  const issuePattern = /(SEC|COR|REL|MNT|PRF)-\d+/g;
  const issues = output.match(issuePattern) || [];

  // Evidence patterns: code blocks, file:line
  const evidencePatterns = [
    /```[\s\S]*?```/g,           // Code blocks
    /\w+\.\w+:\d+/g,             // file:line
    /evidence|증거|코드/gi       // Evidence keywords
  ];

  const hasEvidence = evidencePatterns.some(p => p.test(output));

  if (issues.length > 0 && !hasEvidence) {
    return {
      passed: false,
      message: 'Issues raised but no code evidence provided',
      details: [`Raised issues: ${issues.join(', ')}`]
    };
  }

  return { passed: true, message: 'Evidence requirement met' };
}

function checkSeverityClassification(output: string, context: RoleContext): ValidationResult {
  const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const foundSeverities = severities.filter(s => output.includes(s));

  if (foundSeverities.length === 0 && output.match(/(SEC|COR|REL|MNT|PRF)-\d+/)) {
    return {
      passed: false,
      message: 'Issue severity not specified',
      details: ['Must specify one of CRITICAL/HIGH/MEDIUM/LOW']
    };
  }

  return { passed: true, message: 'Severity classification complete' };
}

function checkNoRepeatedChallengedIssues(output: string, context: RoleContext): ValidationResult {
  // Issues previously judged as INVALID
  const challengedIssues = context.existingIssues
    .filter(i => i.status === 'CHALLENGED' || i.challengedBy === 'critic')
    .map(i => i.id);

  const currentIssues = output.match(/(SEC|COR|REL|MNT|PRF)-\d+/g) || [];
  const repeated = currentIssues.filter(i => challengedIssues.includes(i));

  if (repeated.length > 0) {
    return {
      passed: false,
      message: 'Re-raised already refuted issues',
      details: repeated.map(i => `${i}: Refuted by Critic in previous round`)
    };
  }

  return { passed: true, message: 'No repeated issues' };
}

function checkNotActingAsCritic(output: string, context: RoleContext): ValidationResult {
  // Critic action keywords
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
      message: 'Verifier performed Critic role (refutation)',
      details: ['Verifier should only discover issues. Refutation is the Critic\'s role.']
    };
  }

  return { passed: true, message: 'Role compliance met' };
}

function checkCategoryExamined(output: string, context: RoleContext): ValidationResult {
  const categories = ['SECURITY', 'CORRECTNESS', 'RELIABILITY', 'MAINTAINABILITY', 'PERFORMANCE'];
  const found = categories.filter(c => output.includes(c));

  if (found.length === 0) {
    return {
      passed: false,
      message: 'Reviewed categories not specified',
      details: categories
    };
  }

  return { passed: true, message: `${found.length} categories reviewed` };
}

function checkAllIssuesReviewed(output: string, context: RoleContext): ValidationResult {
  // Issues from the last Verifier round
  const lastVerifierRound = context.previousRounds
    .filter(r => r.role === 'verifier')
    .pop();

  if (!lastVerifierRound) {
    return { passed: true, message: 'No previous Verifier round' };
  }

  const issuesToReview = lastVerifierRound.issuesRaised;
  const reviewedIssues = issuesToReview.filter(id => output.includes(id));

  if (reviewedIssues.length < issuesToReview.length) {
    const missing = issuesToReview.filter(id => !reviewedIssues.includes(id));
    return {
      passed: false,
      message: `${missing.length} issues not reviewed`,
      details: missing.map(id => `${id}: Review required`)
    };
  }

  return { passed: true, message: 'All issues reviewed' };
}

function checkNoNewIssuesFromCritic(output: string, context: RoleContext): ValidationResult {
  // Detect new issue raising patterns
  const newIssuePatterns = [
    /새로운\s*(이슈|문제|취약점)/gi,
    /추가로\s*발견/gi,
    /또한\s*발견/gi,
    /new\s*issue/gi
  ];

  // Check if issue IDs not previously mentioned are referenced
  const existingIds = context.existingIssues.map(i => i.id);
  const mentionedIds = output.match(/(SEC|COR|REL|MNT|PRF)-\d+/g) || [];
  const newIds = mentionedIds.filter(id => !existingIds.includes(id));

  const hasNewIssueKeywords = newIssuePatterns.some(p => p.test(output));

  if (newIds.length > 0 || hasNewIssueKeywords) {
    return {
      passed: false,
      message: 'Critic raised new issues',
      details: [
        'Critic should only review existing issues.',
        'Finding new issues is the Verifier\'s role.',
        ...(newIds.length > 0 ? [`Newly mentioned IDs: ${newIds.join(', ')}`] : [])
      ]
    };
  }

  return { passed: true, message: 'No new issues raised' };
}

function checkChallengeHasReasoning(output: string, context: RoleContext): ValidationResult {
  // Check if INVALID verdict exists
  const hasInvalid = /INVALID/i.test(output);

  if (hasInvalid) {
    // Check for reasoning keywords
    const reasoningKeywords = [
      /근거|이유|왜냐하면|때문에/gi,
      /reasoning|because|since/gi,
      /실제로|사실은|확인 결과/gi
    ];

    const hasReasoning = reasoningKeywords.some(p => p.test(output));

    if (!hasReasoning) {
      return {
        passed: false,
        message: 'INVALID verdict lacks reasoning',
        details: ['Must provide specific reasoning when refuting']
      };
    }
  }

  return { passed: true, message: 'Refutation reasoning met' };
}

function checkNotBlindlyAgreeOrDisagree(output: string, context: RoleContext): ValidationResult {
  const verdicts = output.match(/\b(VALID|INVALID|PARTIAL)\b/g) || [];

  if (verdicts.length < 2) {
    return { passed: true, message: 'Skipped due to insufficient verdicts' };
  }

  const validCount = verdicts.filter(v => v === 'VALID').length;
  const invalidCount = verdicts.filter(v => v === 'INVALID').length;
  const total = verdicts.length;

  // If 90%+ are the same verdict, it's blind acceptance/rejection
  if (validCount / total > 0.9) {
    return {
      passed: false,
      message: 'Blindly accepted almost all issues',
      details: [
        `VALID: ${validCount}/${total}`,
        'Critic should review critically'
      ]
    };
  }

  if (invalidCount / total > 0.9) {
    return {
      passed: false,
      message: 'Blindly rejected almost all issues',
      details: [
        `INVALID: ${invalidCount}/${total}`,
        'Critic should acknowledge valid issues'
      ]
    };
  }

  return { passed: true, message: 'Balanced verdicts' };
}

function checkNotActingAsVerifier(output: string, context: RoleContext): ValidationResult {
  // Verifier action keywords
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
      message: 'Critic performed Verifier role (finding new issues)',
      details: ['Critic should only review existing issues']
    };
  }

  return { passed: true, message: 'Role compliance met' };
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
