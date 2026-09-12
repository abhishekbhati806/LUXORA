import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import babelParser from '@babel/eslint-parser';

export default [
  { ignores: ['dist', 'node_modules', 'public'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2022 },
      // Babel parser so JSX usage counts as a real reference — with espree every
      // <Component /> in the tree reads as an unused import.
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        ecmaFeatures: { jsx: true },
        babelOptions: { plugins: ['@babel/plugin-syntax-jsx'] },
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: { react, 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...js.configs.recommended.rules,
      // JSX references must count as usages, otherwise every imported component looks dead.
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // With jsx-uses-vars wired in, no-unused-vars can stay strict across the board.
      'no-unused-vars': ['error', { args: 'after-used', argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
      'no-undef': 'error',
    },
  },
  // Contexts colocate their hooks, and HotelCard/Stepper export shared helpers alongside
  // the components that use them — deliberate conventions, so Fast-refresh's file-purity
  // heuristic does not apply to these files.
  {
    files: ['src/contexts/*.jsx', 'src/components/hotels/HotelCard.jsx', 'src/components/booking/Stepper.jsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
];
