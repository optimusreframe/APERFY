import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "supabase/.temp/**", "supabase/.branches/**"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // These modules intentionally co-locate providers/hooks/constants with
    // their components. Fast Refresh can preserve state safely here; the
    // rule is a false positive for this shared design-system/runtime code.
    files: [
      "src/components/ui/**/*.{ts,tsx}",
      "src/components/layout/MacShellContext.tsx",
      "src/contexts/**/*.{ts,tsx}",
      "src/i18n/LanguageContext.tsx",
      "src/pages/Index.tsx",
      "supabase/functions/_shared/transactional-email-templates/**/*.{ts,tsx}",
    ],
    rules: { "react-refresh/only-export-components": "off" },
  },
);
