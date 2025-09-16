module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname
  },
  plugins: ['@typescript-eslint', 'react-hooks', 'import'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript'
  ],
  settings: {
    react: { version: 'detect' },
    'import/resolver': {
      typescript: {
        project: ['./tsconfig.json', './apps/*/tsconfig.json']
      }
    }
  },
  rules: {
    'import/order': ['error'],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'import/default': 'off',
    'import/no-named-as-default': 'off',
    'import/no-named-as-default-member': 'off'
  },
  ignorePatterns: [
    'dist',
    'node_modules',
    'apps/web/postcss.config.js',
    'apps/web/tailwind.config.ts',
    'apps/web/vite.config.ts',
    'apps/web/service-worker.ts',
    '**/*.test.ts',
    '**/*.spec.ts'
  ]
};
