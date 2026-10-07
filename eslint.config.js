const { fixupConfigRules } = require('@eslint/compat');
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  {
    ignores: ['dist/**', '.expo/**', 'coverage/**', 'video/**'],
  },
  ...fixupConfigRules(expoConfig),
  {
    rules: {
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]);
