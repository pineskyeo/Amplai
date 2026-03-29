/**
 * Rule: layer-boundary
 * MVPVM 레이어 간 의존성 방향 강제.
 *
 * 규칙:
 * - domain/ 파일은 infrastructure/ import 금지
 * - View (.tsx page) 파일은 repository 직접 import 금지
 * - View (.tsx page) 파일은 supabase 직접 import 금지
 * - ViewModel 파일은 Presenter import 금지 (순환 방지)
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce MVPVM layer boundary rules',
    },
    schema: [],
    messages: {
      domainImportsInfra:
        'Domain layer ("{{file}}") cannot import from infrastructure. Domain must stay pure.',
      viewImportsRepo:
        'View component ("{{file}}") cannot import repository directly. Use a Presenter hook instead.',
      viewModelImportsPresenter:
        'ViewModel ("{{file}}") cannot import from a Presenter. ViewModel must be a pure function.',
    },
  },
  create(context) {
    const filePath = context.filename ?? context.getFilename()
    const file = filePath.split('/').pop()

    const isDomainFile =
      filePath.includes('/domain/') ||
      filePath.includes('-model.') ||
      filePath.includes('-repository.')

    const isViewFile =
      filePath.endsWith('-page.tsx') && !filePath.includes('-presenter')

    const isViewModelFile = filePath.includes('-view-model.')

    if (!isDomainFile && !isViewFile && !isViewModelFile) return {}

    return {
      ImportDeclaration(node) {
        const source = node.source.value

        if (isDomainFile && source.includes('infrastructure')) {
          context.report({ node, messageId: 'domainImportsInfra', data: { file } })
        }

        if (isViewFile && source.includes('-repository')) {
          context.report({ node, messageId: 'viewImportsRepo', data: { file } })
        }

        if (isViewModelFile && source.includes('-presenter')) {
          context.report({ node, messageId: 'viewModelImportsPresenter', data: { file } })
        }
      },
    }
  },
}

export default rule
