/**
 * Rule: file-kebab-case
 * 모든 파일명은 kebab-case여야 한다.
 * 예: restaurant-model.ts ✅  RestaurantModel.ts ❌  restaurantModel.ts ❌
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce kebab-case file names',
    },
    schema: [],
    messages: {
      notKebabCase: 'File name "{{name}}" must be kebab-case (e.g. restaurant-model.ts)',
    },
  },
  create(context) {
    return {
      Program(node) {
        const filePath = context.filename ?? context.getFilename()
        const basename = filePath.split('/').pop()
        if (!basename) return

        // dotfiles (.eslintrc.js 등) 예외
        if (basename.startsWith('.')) return

        // config 파일 예외 (next.config.ts, postcss.config.mjs 등)
        if (basename.includes('.config.')) return

        // 고정 예외 파일명
        const EXCEPTIONS = ['index', 'layout', 'page', 'error', 'loading', 'not-found', 'middleware', 'route']
        const nameWithoutExt = basename.replace(/\.[^.]+$/, '')
        if (EXCEPTIONS.includes(nameWithoutExt)) return

        // kebab-case 검사: 소문자, 숫자, 하이픈만 허용
        const isKebabCase = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(nameWithoutExt)

        if (!isKebabCase) {
          context.report({
            node,
            messageId: 'notKebabCase',
            data: { name: basename },
          })
        }
      },
    }
  },
}

export default rule
