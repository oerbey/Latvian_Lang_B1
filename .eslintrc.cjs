module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
  },
  extends: ['eslint:recommended', 'plugin:import/recommended', 'prettier'],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 'latest',
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js'],
      },
    },
  },
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  overrides: [
    {
      files: ['test/**/*.test.js', 'scripts/**/*.mjs'],
      env: {
        node: true,
      },
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
