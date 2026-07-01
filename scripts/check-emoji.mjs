import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const emojiPattern = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\uFE0F|\u20E3/gu;
const files = execFileSync(
  "git",
  ["-c", "core.quotepath=false", "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);

const failures = [];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const matches = [...content.matchAll(emojiPattern)];

  for (const match of matches) {
    const before = content.slice(0, match.index);
    const line = before.split("\n").length;
    failures.push(`${file}:${line}: ${match[0]}`);
  }
}

if (failures.length > 0) {
  console.error("Emoji scan failed:\n" + failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Emoji scan passed (${files.length} files).`);
}
