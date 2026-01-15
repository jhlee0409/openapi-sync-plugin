/**
 * Context Management - Layered context with lazy loading
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  FileContext,
  VerificationContext,
  Session
} from '../types/index.js';
import { getSession } from './session.js';

/**
 * Initialize base context for a session
 * Layer 0: Target files + direct dependencies
 */
export async function initializeContext(
  sessionId: string,
  targetPath: string,
  workingDir: string
): Promise<VerificationContext | null> {
  const session = await getSession(sessionId);
  if (!session) return null;

  const context = session.context;

  // Resolve target path
  const absoluteTarget = path.isAbsolute(targetPath)
    ? targetPath
    : path.join(workingDir, targetPath);

  // Check if directory or file
  const stat = await fs.stat(absoluteTarget).catch(() => null);
  if (!stat) {
    return context; // Target doesn't exist, return empty context
  }

  if (stat.isDirectory()) {
    // Collect all files in directory
    await collectFilesFromDirectory(absoluteTarget, context, 'base');
  } else {
    // Single file
    await addFileToContext(absoluteTarget, context, 'base');
  }

  return context;
}

/**
 * Expand context with discovered files
 * Layer 1: Files discovered during verification
 */
export async function expandContext(
  sessionId: string,
  filePaths: string[],
  roundNumber: number
): Promise<string[]> {
  const session = await getSession(sessionId);
  if (!session) return [];

  const addedFiles: string[] = [];

  for (const filePath of filePaths) {
    // Skip if already in context
    if (session.context.files.has(filePath)) continue;

    const added = await addFileToContext(
      filePath,
      session.context,
      'discovered',
      roundNumber
    );

    if (added) {
      addedFiles.push(filePath);
    }
  }

  return addedFiles;
}

/**
 * Extract file references from round output
 */
export function extractFileReferences(output: string): string[] {
  const patterns = [
    // file:line format
    /([a-zA-Z0-9_\-./]+\.[a-zA-Z]+):(\d+)/g,
    // Markdown code block with filename
    /```\w*\s+([a-zA-Z0-9_\-./]+\.[a-zA-Z]+)/g,
    // Import statements
    /import\s+.*from\s+['"]([^'"]+)['"]/g,
    /require\(['"]([^'"]+)['"]\)/g,
    // Explicit file mentions
    /(?:file|path|in)\s*[:=]?\s*[`'"]?([a-zA-Z0-9_\-./]+\.[a-zA-Z]+)[`'"]?/gi
  ];

  const files = new Set<string>();

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(output)) !== null) {
      const filePath = match[1];
      // Filter out common non-file matches
      if (isValidFilePath(filePath)) {
        files.add(filePath);
      }
    }
  }

  return Array.from(files);
}

/**
 * Check if round output mentions files not in context
 */
export function findNewFileReferences(
  output: string,
  context: VerificationContext
): string[] {
  const mentioned = extractFileReferences(output);
  const contextFiles = Array.from(context.files.keys());

  return mentioned.filter(f => {
    // Check if file is not in context
    const inContext = contextFiles.some(cf =>
      cf.endsWith(f) || f.endsWith(cf) || cf === f
    );
    return !inContext;
  });
}

/**
 * Get context summary for agent prompt
 */
export function getContextSummary(context: VerificationContext): string {
  const baseFiles = Array.from(context.files.values())
    .filter(f => f.layer === 'base')
    .map(f => f.path);

  const discoveredFiles = Array.from(context.files.values())
    .filter(f => f.layer === 'discovered')
    .map(f => `${f.path} (discovered in round ${f.addedInRound})`);

  return `
## Verification Context

**Target**: ${context.target}
**Requirements**: ${context.requirements}

### Base Files (Layer 0)
${baseFiles.map(f => `- ${f}`).join('\n')}

### Discovered Files (Layer 1)
${discoveredFiles.length > 0
  ? discoveredFiles.map(f => `- ${f}`).join('\n')
  : '(none yet)'}
`.trim();
}

// =============================================================================
// Helper Functions
// =============================================================================

async function collectFilesFromDirectory(
  dirPath: string,
  context: VerificationContext,
  layer: 'base' | 'discovered'
): Promise<void> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      // Skip common non-code directories
      if (['node_modules', '.git', 'dist', 'build', '__pycache__'].includes(entry.name)) {
        continue;
      }
      await collectFilesFromDirectory(fullPath, context, layer);
    } else if (entry.isFile() && isCodeFile(entry.name)) {
      await addFileToContext(fullPath, context, layer);
    }
  }
}

async function addFileToContext(
  filePath: string,
  context: VerificationContext,
  layer: 'base' | 'discovered',
  roundNumber?: number
): Promise<boolean> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const dependencies = extractImports(content, filePath);

    const fileContext: FileContext = {
      path: filePath,
      content,
      dependencies,
      layer,
      addedInRound: roundNumber
    };

    context.files.set(filePath, fileContext);
    return true;
  } catch {
    return false;
  }
}

function extractImports(content: string, filePath: string): string[] {
  const imports: string[] = [];
  const ext = path.extname(filePath);
  const dir = path.dirname(filePath);

  // TypeScript/JavaScript imports
  if (['.ts', '.tsx', '.js', '.jsx', '.mjs'].includes(ext)) {
    const importRegex = /import\s+.*from\s+['"]([^'"]+)['"]/g;
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;

    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(resolveImportPath(match[1], dir));
    }
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push(resolveImportPath(match[1], dir));
    }
  }

  // Python imports
  if (ext === '.py') {
    const fromImportRegex = /from\s+([a-zA-Z0-9_.]+)\s+import/g;
    const importRegex = /^import\s+([a-zA-Z0-9_.]+)/gm;

    let match;
    while ((match = fromImportRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
  }

  return imports;
}

function resolveImportPath(importPath: string, fromDir: string): string {
  if (importPath.startsWith('.')) {
    return path.resolve(fromDir, importPath);
  }
  return importPath; // Package import
}

function isCodeFile(filename: string): boolean {
  const codeExtensions = [
    '.ts', '.tsx', '.js', '.jsx', '.mjs',
    '.py', '.rb', '.go', '.rs', '.java',
    '.c', '.cpp', '.h', '.hpp',
    '.cs', '.php', '.swift', '.kt'
  ];
  return codeExtensions.some(ext => filename.endsWith(ext));
}

function isValidFilePath(str: string): boolean {
  // Filter out common false positives
  const invalid = [
    'http', 'https', 'mailto',
    'node_modules', 'package.json',
    '.git', '.env'
  ];

  if (invalid.some(i => str.includes(i))) return false;
  if (str.length < 3 || str.length > 200) return false;
  if (!str.includes('.')) return false;

  return true;
}
