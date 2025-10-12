module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./tsconfig.json"],
  },
  plugins: ["@typescript-eslint", "react-hooks", "import"],
  extends: ["next", "next/core-web-vitals", "plugin:@typescript-eslint/recommended", "plugin:react-hooks/recommended", "prettier"],
  rules: {
    "import/order": [
      "error",
      {
        "groups": [["builtin", "external"], ["internal"], ["parent", "sibling", "index"]],
        "newlines-between": "always"
      }
    ],
    "@typescript-eslint/explicit-module-boundary-types": "off"
  }
};
