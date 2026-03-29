/**
 * Rule: suffix-naming
 * 레이어별 클래스/인터페이스/타입 이름에 올바른 suffix 강제.
 *
 * -repository.ts     → export interface XxxRepository
 * -view-model.ts     → export type/interface XxxViewModel
 * -repository-*.ts   → export class XxxRepositorySupabase (구현체)
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce correct suffix naming for MVPVM layers',
    },
    schema: [],
    messages: {
      repositorySuffix:
        '"{{name}}" in a repository file should end with "Repository" (e.g. RestaurantRepository)',
      viewModelSuffix:
        '"{{name}}" in a view-model file should end with "ViewModel" (e.g. RestaurantsPageViewModel)',
    },
  },
  create(context) {
    const filePath = context.filename ?? context.getFilename()

    const isRepositoryInterface =
      filePath.includes('-repository.') && !filePath.includes('-repository-')

    const isViewModel = filePath.includes('-view-model.')

    if (!isRepositoryInterface && !isViewModel) return {}

    function checkNode(node, name) {
      if (!name) return

      if (isRepositoryInterface && !name.endsWith('Repository')) {
        context.report({ node, messageId: 'repositorySuffix', data: { name } })
      }

      if (isViewModel && !name.endsWith('ViewModel')) {
        context.report({ node, messageId: 'viewModelSuffix', data: { name } })
      }
    }

    return {
      TSInterfaceDeclaration(node) {
        checkNode(node.id, node.id?.name)
      },
      TSTypeAliasDeclaration(node) {
        checkNode(node.id, node.id?.name)
      },
    }
  },
}

export default rule
