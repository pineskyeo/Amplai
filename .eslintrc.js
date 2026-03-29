module.exports = {
  root: true,
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  plugins: ['@typescript-eslint', 'import'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/consistent-type-imports': 'warn',
    'no-console': 'error',
    'prefer-const': 'error',
    'import/order': [
      'error',
      {
        groups: ['builtin','external','internal','parent','sibling','index'],
        pathGroups: [
          { pattern: 'react', group: 'external', position: 'before' },
          { pattern: 'next/**', group: 'external', position: 'before' },
          { pattern: '@/**', group: 'internal' }
        ],
        alphabetize: { order: 'asc' }
      }
    ]
  }
}
