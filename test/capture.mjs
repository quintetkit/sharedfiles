/**
 * fixtures にする git log を、実際のリポジトリから捕獲する。
 *
 * 自分で書いた入力だけでテストすると、自分の思い込みも一緒に固定される。
 * **本物を1本入れておくのが目的**なので、これは手で書き換えない。
 *
 *   node test/capture.mjs <repo> [n]
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const SEP = "\u001e";
const repo = process.argv[2] ?? ".";
const n = process.argv[3] ?? "60";

const out = execFileSync(
  "git",
  ["log", "--no-merges", `-n${n}`, "--name-only", `--pretty=format:${SEP}%H`],
  { cwd: repo, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
);
const path = new URL("./fixtures/real-log.txt", import.meta.url).pathname;
writeFileSync(path, out);
console.log(`捕獲: ${out.split(SEP).length - 1} コミット / ${out.length} bytes -> ${path}`);
