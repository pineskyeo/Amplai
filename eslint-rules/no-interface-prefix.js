/**
 * Rule: no-interface-prefix
 * interface 이름에 "I" 접두사 금지.
 * IRestaurant ❌  Restaurant ✅
 * IUserRepository ❌  UserRepository ✅
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow "I" prefix on interface names',
    },
    fixable: 'code',
    schema: [],
    messages: {
      noIPrefix:
        'Interface "{{name}}" must not start with "I". Use "{{suggestion}}" instead.',
    },
  },
  create(context) {
    return {
      TSInterfaceDeclaration(node) {
        const name = node.id?.name
        if (!name) return

        // "I" 다음에 대문자가 오는 경우만 잡음 (예: IUser, IRepo)
        if (/^I[A-Z]/.test(name)) {
          const suggestion = name.slice(1)
          context.report({
            node: node.id,
            messageId: 'noIPrefix',
            data: { name, suggestion },
            fix(fixer) {
              return fixer.replaceText(node.id, suggestion)
            },
          })
        }
      },
    }
  },
}

export default rule
