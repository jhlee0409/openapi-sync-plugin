# Elenchus Plugin

Adversarial verification and QA skills inspired by Socratic elenchus method.

> **Elenchus** (ἔλεγχος): Socrates' method of refutation through questioning, exposing contradictions to arrive at truth.

## Skills

### /cross-verify

Adversarial cross-verification loop for thorough validation.

**How it works:**
- Two agents (Verifier + Critic) debate each claim
- Fresh context each round prevents confirmation bias
- Evidence-based consensus, not fatigue-based stopping
- Issue tracking throughout the process

**Usage:**
```
/cross-verify src/auth/login.ts
/cross-verify the authentication system
```

**Features:**
- Single file, multi-file, directory, and feature-based targets
- Maximum 10 rounds with forced-stop handling
- Genuine consensus detection (not just "no more feedback")
- Detailed issue tracking table
- Final verdict: PASS / FAIL / CONDITIONAL

## Installation

Add to your Claude Code plugins:
```
elenchus@jhlee0409-plugins
```
