/**
 * Blocks pushes if a W&B (or similar) API key appears in tracked files.
 * Run: npm run check-secrets
 */
const { execSync } = require("child_process");
const fs = require("fs");

const PATTERNS = [/wandb_v1_[A-Za-z0-9_]+/, /sk-[A-Za-z0-9]{20,}/];

function gitLines(args) {
  try {
    return execSync(`git ${args}`, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

const tracked = gitLines("ls-files").split("\n").filter(Boolean);
const violations = [];

for (const file of tracked) {
  if (file.includes(".env.local") || file === ".env") continue;
  let content;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const re of PATTERNS) {
    if (re.test(content)) {
      violations.push(file);
      break;
    }
  }
}

if (violations.length > 0) {
  console.error("\nSecret detected in tracked files — remove before pushing:\n");
  violations.forEach((f) => console.error(`  • ${f}`));
  console.error("\nStore keys only in .env.local (gitignored).\n");
  process.exit(1);
}

console.log("OK: No API keys found in git-tracked files.");
