import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import next from "ultracite/oxlint/next";
import react from "ultracite/oxlint/react";

export default defineConfig({
  extends: [core, react, next, antiSlop],
  ignorePatterns: [
    ...(core.ignorePatterns ?? []),
    "*.tsbuildinfo",
    ".eve",
    ".workflow-data",
    ".claude",
    ".codex",
  ],
  overrides: [
    {
      files: ["agent/tools/**"],
      rules: {
        // eve names each tool after its file, and the model sees snake_case names.
        "unicorn/filename-case": ["error", { case: "snakeCase" }],
      },
    },
  ],
  rules: {
    // Sequential awaits in loops are deliberate here (ordered tool calls, rate-limited reads).
    "no-await-in-loop": "off",
  },
});
