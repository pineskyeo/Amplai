import type { GeneratedFile, LintViolation } from '@/types'

const HARNESS_RULES = [
  'file-kebab-case',
  'no-list-detail-suffix',
  'no-interface-prefix',
  'suffix-naming',
  'array-prop-plural',
  'presenter-naming',
  'no-default-export-model',
  'no-direct-supabase',
  'layer-boundary',
] as const

type RuleName = (typeof HARNESS_RULES)[number]

function checkFileKebabCase(filePath: string): LintViolation | null {
  const basename = filePath.split('/').pop() ?? ''
  if (basename.startsWith('.')) return null
  if (basename.includes('.config.')) return null
  const exceptions = [
    'index',
    'layout',
    'page',
    'error',
    'loading',
    'not-found',
    'middleware',
    'route',
  ]
  const nameWithoutExt = basename.replace(/\.[^.]+$/, '')
  if (exceptions.includes(nameWithoutExt)) return null
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(nameWithoutExt)) {
    return {
      rule: 'file-kebab-case',
      message: `File "${basename}" must be kebab-case`,
      file: filePath,
    }
  }
  return null
}

function checkNoListDetailSuffix(filePath: string): LintViolation | null {
  const basename = filePath.split('/').pop() ?? ''
  const nameWithoutExt = basename.replace(/\.[^.]+$/, '')
  if (nameWithoutExt.endsWith('-list') || nameWithoutExt.endsWith('-detail')) {
    return {
      rule: 'no-list-detail-suffix',
      message: `File "${basename}" must not use -list or -detail suffix`,
      file: filePath,
    }
  }
  return null
}

function checkNoInterfacePrefix(
  filePath: string,
  code: string
): LintViolation[] {
  return [...code.matchAll(/\binterface\s+(I[A-Z]\w*)/g)].map((m) => ({
    rule: 'no-interface-prefix',
    message: `Interface "${m[1]}" must not start with I`,
    file: filePath,
  }))
}

function checkSuffixNaming(filePath: string, code: string): LintViolation[] {
  const violations: LintViolation[] = []
  const isRepositoryInterface =
    filePath.includes('-repository.') && !filePath.includes('-repository-')
  const isViewModel = filePath.includes('-view-model.')
  if (!isRepositoryInterface && !isViewModel) return violations

  for (const m of code.matchAll(/export\s+(?:interface|type)\s+(\w+)/g)) {
    const name = m[1]
    if (isRepositoryInterface && !name.endsWith('Repository')) {
      violations.push({
        rule: 'suffix-naming',
        message: `"${name}" should end with Repository`,
        file: filePath,
      })
    }
    if (isViewModel && !name.endsWith('ViewModel')) {
      violations.push({
        rule: 'suffix-naming',
        message: `"${name}" should end with ViewModel`,
        file: filePath,
      })
    }
  }
  return violations
}

function checkArrayPropPlural(filePath: string, code: string): LintViolation[] {
  return [...code.matchAll(/\b(\w+)\s*\??\s*:\s*\w+(?:<[^>]*>)?\[\]/g)]
    .filter((m) => m[1].endsWith('List') || m[1].endsWith('Item'))
    .map((m) => ({
      rule: 'array-prop-plural',
      message: `Array prop "${m[1]}" should be plural (not end with List or Item)`,
      file: filePath,
    }))
}

function checkPresenterNaming(filePath: string, code: string): LintViolation[] {
  if (!filePath.includes('-presenter.')) return []
  return [...code.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)]
    .filter((m) => !/^use[A-Z]\w+Presenter$/.test(m[1]))
    .map((m) => ({
      rule: 'presenter-naming',
      message: `"${m[1]}" should match useXxxPresenter pattern`,
      file: filePath,
    }))
}

function checkNoDefaultExportModel(
  filePath: string,
  code: string
): LintViolation | null {
  if (!filePath.includes('-model.')) return null
  if (/export\s+default/.test(code)) {
    return {
      rule: 'no-default-export-model',
      message: 'Model files must not use default export',
      file: filePath,
    }
  }
  return null
}

function checkNoDirectSupabase(
  filePath: string,
  code: string
): LintViolation | null {
  if (!filePath.endsWith('.tsx') && !filePath.includes('-presenter.'))
    return null
  if (
    /from\s+['"]@supabase\/supabase-js['"]/.test(code) ||
    /from\s+['"]@\/lib\/supabase['"]/.test(code)
  ) {
    return {
      rule: 'no-direct-supabase',
      message: 'Direct Supabase access not allowed here',
      file: filePath,
    }
  }
  return null
}

function checkLayerBoundary(filePath: string, code: string): LintViolation[] {
  const violations: LintViolation[] = []
  const isDomainFile =
    filePath.includes('/domain/') ||
    filePath.includes('-model.') ||
    filePath.includes('-repository.')
  const isViewFile =
    filePath.endsWith('-page.tsx') && !filePath.includes('-presenter')
  const isViewModelFile = filePath.includes('-view-model.')

  if (isDomainFile && /from\s+['"][^'"]*infrastructure/.test(code)) {
    violations.push({
      rule: 'layer-boundary',
      message: 'Domain cannot import from infrastructure',
      file: filePath,
    })
  }
  if (isViewFile && /from\s+['"][^'"]*-repository/.test(code)) {
    violations.push({
      rule: 'layer-boundary',
      message: 'View cannot import repository directly',
      file: filePath,
    })
  }
  if (isViewModelFile && /from\s+['"][^'"]*-presenter/.test(code)) {
    violations.push({
      rule: 'layer-boundary',
      message: 'ViewModel cannot import from presenter',
      file: filePath,
    })
  }
  return violations
}

export function lintFiles(files: GeneratedFile[]): {
  violations: LintViolation[]
  ruleResults: Record<RuleName, 'pass' | 'fail'>
  score: number
} {
  const allViolations: LintViolation[] = []

  for (const file of files) {
    const v1 = checkFileKebabCase(file.path)
    if (v1) allViolations.push(v1)

    const v2 = checkNoListDetailSuffix(file.path)
    if (v2) allViolations.push(v2)

    allViolations.push(...checkNoInterfacePrefix(file.path, file.content))
    allViolations.push(...checkSuffixNaming(file.path, file.content))
    allViolations.push(...checkArrayPropPlural(file.path, file.content))
    allViolations.push(...checkPresenterNaming(file.path, file.content))

    const v7 = checkNoDefaultExportModel(file.path, file.content)
    if (v7) allViolations.push(v7)

    const v8 = checkNoDirectSupabase(file.path, file.content)
    if (v8) allViolations.push(v8)

    allViolations.push(...checkLayerBoundary(file.path, file.content))
  }

  const failedRules = new Set(allViolations.map((v) => v.rule))
  const ruleResults = Object.fromEntries(
    HARNESS_RULES.map((r) => [r, failedRules.has(r) ? 'fail' : 'pass'])
  ) as Record<RuleName, 'pass' | 'fail'>

  const passed = HARNESS_RULES.filter((r) => ruleResults[r] === 'pass').length
  const score = Math.round((passed / HARNESS_RULES.length) * 100)

  return { violations: allViolations, ruleResults, score }
}
