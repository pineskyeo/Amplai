/**
 * Rule: presenter-naming
 * -presenter.ts 파일에서 export된 함수는 반드시 useXxxPresenter 패턴이어야 한다.
 * useRestaurantsPagePresenter ✅
 * getRestaurantsPresenter ❌  RestaurantsPresenter ❌
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Exported functions in presenter files must follow useXxxPresenter pattern',
    },
    schema: [],
    messages: {
      wrongPattern:
        'Presenter function "{{name}}" must follow the pattern useXxxPresenter (e.g. useRestaurantsPagePresenter)',
    },
  },
  create(context) {
    const filePath = context.filename ?? context.getFilename()

    // presenter 파일에서만 동작
    if (!filePath.includes('-presenter.')) return {}

    function checkName(node, name) {
      if (!name) return
      if (!/^use[A-Z].*Presenter$/.test(name)) {
        context.report({ node, messageId: 'wrongPattern', data: { name } })
      }
    }

    return {
      // export function useXxxPresenter() {}
      'ExportNamedDeclaration > FunctionDeclaration'(node) {
        checkName(node, node.id?.name)
      },
      // export const useXxxPresenter = () => {}  (잡아서 경고)
      'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator'(node) {
        const name = node.id?.name
        if (name) checkName(node, name)
      },
    }
  },
}

export default rule
