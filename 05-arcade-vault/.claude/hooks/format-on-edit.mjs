#!/usr/bin/env node
// PostToolUse hook (Write|Edit): runs Prettier on any project file that was
// just written/edited, then ESLint --fix on JS/TS files. Never blocks the
// turn — formatting/lint failures are reported but don't fail the hook.
import { execFileSync } from "node:child_process";
import { extname } from "node:path";

const PRETTIER_EXTS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".json", ".md", ".mdx", ".css",
]);
const ESLINT_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  let filePath;
  try {
    const payload = JSON.parse(input);
    filePath = payload?.tool_input?.file_path ?? payload?.tool_response?.filePath;
  } catch {
    process.exit(0);
  }
  if (!filePath) process.exit(0);

  const ext = extname(filePath);

  if (PRETTIER_EXTS.has(ext)) {
    run("prettier", ["--write", filePath]);
  }
  if (ESLINT_EXTS.has(ext)) {
    run("eslint", ["--fix", "--no-warn-ignored", filePath]);
  }
  process.exit(0);
});

function run(bin, args) {
  try {
    // shell: true so Windows resolves npx.cmd (execFileSync has no PATHEXT
    // lookup on its own).
    execFileSync("npx", ["--no-install", bin, ...args], {
      stdio: ["ignore", "inherit", "inherit"],
      shell: true,
    });
  } catch {
    // Non-blocking: formatting/lint errors are surfaced via stdout/stderr
    // above but must not stop the hook (and thus the turn).
  }
}
