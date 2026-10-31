import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "typescript-eslint";
// @ts-ignore -- no types for this plugin
import drizzle from "eslint-plugin-drizzle";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default tseslint.config(
  {
    ignores: [".next", "tests/**", "scripts/**"],
  },
  ...compat.extends("next/core-web-vitals"),
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      drizzle,
    },
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    rules: {
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-type-imports": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/prefer-optional-chain": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/prefer-regexp-exec": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/non-nullable-type-assertion-style": "off",
      "@typescript-eslint/no-inferrable-types": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
      "drizzle/enforce-delete-with-where": [
        "error",
        { drizzleObjectName: ["db", "ctx.db"] },
      ],
      "drizzle/enforce-update-with-where": [
        "error",
        { drizzleObjectName: ["db", "ctx.db"] },
      ],
    },
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
);
