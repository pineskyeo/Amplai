/**
 * Rule: no-list-detail-suffix
 * 파일명에 -list, -detail suffix 금지.
 * 목록 페이지는 복수형으로: restaurants-page.tsx ✅  restaurant-list-page.tsx ❌
 * 상세 페이지는 -[id]-page 또는 restaurant-page: restaurant-detail-page.tsx ❌
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow -list or -detail suffix in file names',
    },
    schema: [],
    messages: {
      noListSuffix:
        'File name "{{name}}" must not contain "-list". Use plural form instead (e.g. restaurants-page.tsx)',
      noDetailSuffix:
        'File name "{{name}}" must not contain "-detail". Use singular noun instead (e.g. restaurant-page.tsx)',
    },
  },
  create(context) {
    return {
      Program(node) {
        const filePath = context.filename ?? context.getFilename()
        const basename = filePath.split('/').pop()
        if (!basename) return

        const nameWithoutExt = basename.replace(/\.[^.]+$/, '')

        if (nameWithoutExt.includes('-list')) {
          context.report({ node, messageId: 'noListSuffix', data: { name: basename } })
        }
        if (nameWithoutExt.includes('-detail')) {
          context.report({ node, messageId: 'noDetailSuffix', data: { name: basename } })
        }
      },
    }
  },
}

export default rule
