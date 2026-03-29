/**
 * Rule: no-direct-supabase
 * View 컴포넌트 (.tsx), Presenter 파일에서 supabase 직접 import 금지.
 * supabase는 반드시 features/{feature}/repository.ts 에서만 사용.
 *
 * import { supabase } from '@/lib/supabase'  ← component에서 ❌
 * import { createClient } from '@supabase/supabase-js'  ← component에서 ❌
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow direct Supabase imports in View components and Presenters',
    },
    schema: [],
    messages: {
      noDirectSupabase:
        'Do not import Supabase directly in "{{file}}". Use features/{feature}/repository.ts instead.',
    },
  },
  create(context) {
    const filePath = context.filename ?? context.getFilename()

    // repository.ts, lib/supabase.ts 파일은 허용
    if (
      filePath.includes('repository') ||
      filePath.includes('lib/supabase') ||
      filePath.includes('supabase-adapter')
    ) {
      return {}
    }

    // .tsx 컴포넌트, presenter 파일에서만 검사
    const isComponent = filePath.endsWith('.tsx')
    const isPresenter = filePath.includes('-presenter.')
    if (!isComponent && !isPresenter) return {}

    const SUPABASE_SOURCES = ['@supabase/supabase-js', '@/lib/supabase', '../lib/supabase', '../../lib/supabase']

    return {
      ImportDeclaration(node) {
        const source = node.source.value
        if (SUPABASE_SOURCES.some((s) => source.includes(s))) {
          const file = filePath.split('/').pop()
          context.report({ node, messageId: 'noDirectSupabase', data: { file } })
        }
      },
    }
  },
}

export default rule
