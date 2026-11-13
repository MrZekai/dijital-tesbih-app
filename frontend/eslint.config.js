// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { files: ["scripts/**/*.js", "tests/**/*.js"], languageOptions: { globals: { __dirname: "readonly" } } },
  {
    ignores: ['dist/**', 'scripts/cmd-guard/vendor/**'],
  },
]);
