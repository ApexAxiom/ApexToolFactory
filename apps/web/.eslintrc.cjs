module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname
  },
  plugins: ['@typescript-eslint'],
  extends: ['plugin:@typescript-eslint/recommended'],
  rules: {
    'import/no-unresolved': 'off',
    'import/namespace': 'off',
    'import/order': 'off'
  },
  ignorePatterns: ['vitest.config.ts', 'vite.config.ts', 'tailwind.config.ts', 'postcss.config.js', 'service-worker.ts']
};


