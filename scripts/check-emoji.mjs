import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync } from "node:fs";

const emojiPattern = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\uFE0F|\u20E3/gu;
const files = execFileSync(
  "git",
  ["-c", "core.quotepath=false", "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);

// Binary assets are not text; reading them as utf8 produces byte sequences that
// can false-positive on the emoji pattern, so skip known binary extensions.
const BINARY_EXTENSIONS = new Set([
  "woff",
  "woff2",
  "ttf",
  "otf",
  "eot",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "ico",
  "mp3",
  "ogg",
  "wav",
  "m4a",
  "pdf",
]);

const failures = [];
let scanned = 0;

for (const file of files) {
  // Skip symlinks (e.g. .claude/skills/* -> .agents/skills/*): the target
  // content is scanned via its real path, and directory symlinks would throw EISDIR.
  if (lstatSync(file).isSymbolicLink()) {
    continue;
  }

  const extension = file.slice(file.lastIndexOf(".") + 1).toLowerCase();
  if (BINARY_EXTENSIONS.has(extension)) {
    continue;
  }

  const content = readFileSync(file, "utf8");
  scanned += 1;
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
  console.log(`Emoji scan passed (${scanned} files).`);
}
