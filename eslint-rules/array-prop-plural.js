/**
 * Rule: array-prop-plural
 * interface/type의 배열 타입 prop은 반드시 복수형이어야 한다.
 * restaurants: RestaurantModel[]  ✅
 * restaurantList: RestaurantModel[]  ❌  (List suffix 금지)
 * restaurantItem: RestaurantModel[]  ❌  (단수형 금지)
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Array typed props must use plural names, no -List or -Item suffix',
    },
    schema: [],
    messages: {
      listSuffix:
        'Array prop "{{name}}" must not end with "List". Use plural form "{{suggestion}}" instead.',
      itemSuffix:
        'Array prop "{{name}}" must not end with "Item". Use plural form instead.',
      singular:
        'Array prop "{{name}}" should be plural (e.g. "{{suggestion}}").',
    },
  },
  create(context) {
    function isArrayType(typeAnnotation) {
      if (!typeAnnotation) return false
      const t = typeAnnotation.typeAnnotation ?? typeAnnotation
      return (
        t.type === 'TSArrayType' ||
        (t.type === 'TSTypeReference' &&
          (t.typeName?.name === 'Array' || t.typeName?.name === 'ReadonlyArray'))
      )
    }

    function checkProp(node, name, typeAnnotation) {
      if (!isArrayType(typeAnnotation)) return

      if (name.endsWith('List')) {
        const suggestion = name.slice(0, -4)
        context.report({ node, messageId: 'listSuffix', data: { name, suggestion } })
        return
      }

      if (name.endsWith('Item')) {
        context.report({ node, messageId: 'itemSuffix', data: { name } })
        return
      }

      // 단수형 감지 (s로 안 끝나는 경우 — 간단한 휴리스틱)
      // 너무 많은 false positive 방지를 위해 List/Item만 체크
    }

    return {
      TSPropertySignature(node) {
        const name = node.key?.name
        if (!name) return
        checkProp(node, name, node.typeAnnotation)
      },
    }
  },
}

export default rule
