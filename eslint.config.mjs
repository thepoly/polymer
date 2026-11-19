import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Staff-only CMS layout previews and drag overlays intentionally use plain images.
    name: "cms-layout-editor-previews",
    files: [
      "components/Dashboard/LayoutEditor/index.tsx",
      "components/Dashboard/FeaturesLayoutEditor/index.tsx",
      "components/Dashboard/NewsLayoutEditor/index.tsx",
      "components/Dashboard/OpinionLayoutEditor/index.tsx",
      "components/Dashboard/SportsLayoutEditor/index.tsx",
    ],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".claude/**",
    ".worktrees/**",
    "mobile/**",
  ]),
]);

export default eslintConfig;
