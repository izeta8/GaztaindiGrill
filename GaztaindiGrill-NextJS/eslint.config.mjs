import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import importPlugin from "eslint-plugin-import";
import noRelativeImportPaths from "eslint-plugin-no-relative-import-paths"; // <--- Importar nuevo plugin

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    plugins: {
      import: importPlugin,
      "no-relative-import-paths": noRelativeImportPaths,
    },
    rules: {
      // Replace relative paths by @ imports.
      "no-relative-import-paths/no-relative-import-paths": [
        "error",
        { "allowSameFolder": true, "rootDir": "src", "prefix": "@" }
      ],
    },
  }
];

export default eslintConfig;