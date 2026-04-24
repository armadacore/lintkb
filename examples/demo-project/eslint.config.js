import tseslint from "typescript-eslint";

export default [
  ...tseslint.configs.recommended,
  {
    rules: {
      "no-console": "error",
      eqeqeq: "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": "error",
    },
  },
];
