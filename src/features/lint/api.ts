import type { AIModel } from '@/types'

interface LintReport {
  score: number
  details: Record<string, 'pass' | 'fail'>
}

const MOCK_LINT_RESULTS: Record<AIModel, LintReport> = {
  codex: {
    score: 52,
    details: {
      'naming-convention': 'pass',
      'import-suffix': 'fail',
      'article-naming': 'pass',
      'array-prop-naming': 'fail',
      'no-interface-prefix': 'pass',
      'barrel-export': 'fail',
      'import-order': 'pass',
      'no-default-export-model': 'fail',
      'presenter-naming': 'pass',
      'view-model-suffix': 'fail',
      'repository-suffix': 'fail',
      'adapter-suffix': 'fail',
    },
  },
  gemini: {
    score: 70,
    details: {
      'naming-convention': 'pass',
      'import-suffix': 'pass',
      'article-naming': 'pass',
      'array-prop-naming': 'fail',
      'no-interface-prefix': 'pass',
      'barrel-export': 'pass',
      'import-order': 'pass',
      'no-default-export-model': 'fail',
      'presenter-naming': 'pass',
      'view-model-suffix': 'pass',
      'repository-suffix': 'pass',
      'adapter-suffix': 'fail',
    },
  },
  claude: {
    score: 100,
    details: {
      'naming-convention': 'pass',
      'import-suffix': 'pass',
      'article-naming': 'pass',
      'array-prop-naming': 'pass',
      'no-interface-prefix': 'pass',
      'barrel-export': 'pass',
      'import-order': 'pass',
      'no-default-export-model': 'pass',
      'presenter-naming': 'pass',
      'view-model-suffix': 'pass',
      'repository-suffix': 'pass',
      'adapter-suffix': 'pass',
    },
  },
}

export async function runLintCheck(
  _code: string,
  model: AIModel
): Promise<LintReport> {
  // In production: spawn ESLint child process against generated files
  // For now: return realistic mock scores
  return MOCK_LINT_RESULTS[model]
}
