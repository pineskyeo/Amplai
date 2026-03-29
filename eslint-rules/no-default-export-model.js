/**
 * Rule: no-default-export-model
 * -model.ts 파일에서 default export 금지. named export만 허용.
 * export default RestaurantModel  ❌
 * export type { RestaurantModel }  ✅
 * export interface RestaurantModel {}  ✅
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Model files must use named exports only, no default export',
    },
    schema: [],
    messages: {
      noDefaultExport:
        'Model files must not use default export. Use named exports instead: export type { {{name}} }',
    },
  },
  create(context) {
    const filePath = context.filename ?? context.getFilename()

    if (!filePath.includes('-model.')) return {}

    return {
      ExportDefaultDeclaration(node) {
        const name =
          node.declaration?.id?.name ??
          node.declaration?.name ??
          'Model'

        context.report({ node, messageId: 'noDefaultExport', data: { name } })
      },
    }
  },
}

export default rule
