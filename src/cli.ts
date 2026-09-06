#!/usr/bin/env node
/**
 * sharedfiles — 並列で走らせるとぶつかる場所を、git の履歴から探す。
 *
 *   sharedfiles [path] [options]
 *
 * 設定も API トークンも要らない。リポジトリの中で叩けば答えが出る。
 */
import { analyze } from "./analyze.ts";
import { readLog, trackedFiles } from "./git.ts";
import { exitCode, formatGithub, formatHuman, formatJson } from "./report.ts";

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (name: string): boolean => args.includes(`--${name}`);
const num = (name: string, fallback: number): number => {
  const v = flag(name);
  if (v === undefined) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) {
    console.error(`--${name} takes a number, got ${JSON.stringify(v)}`);
    process.exit(2);
  }
  return n;
};

if (has("help")) {
  console.log(`sharedfiles - find where parallel work will collide, from git history

  sharedfiles [path] [options]

Options:
  --limit N                   commits to read (default: 300)
  --since DATE                only commits after this (e.g. "3 months ago")
  --ignore PATH               exclude a path or directory (repeatable)
  --top N                     files to list (default: 15)
  --pairs N                   pairs to list (default: 10)
  --min-together N            minimum co-occurrences for a pair (default: 3)
  --max SHARE                 exit 1 if any file exceeds this share, e.g. 0.4
  --format human|github|json  output format (default: human)
  --help                      this

It reports; it does not judge. A README changing in every commit is normal and
a route table changing in every commit is a design problem, and history cannot
tell those apart. So it prints the numbers and leaves the call to you.

Lockfiles are excluded by default. They change constantly and never cause the
kind of collision this is looking for.`);
  process.exit(0);
}

const path = args.find((a) => !a.startsWith("--") &&
  args[args.indexOf(a) - 1]?.startsWith("--") !== true) ?? ".";

let commits;
let tracked;
try {
  commits = readLog(path, num("limit", 300), flag("since"));
  tracked = trackedFiles(path);
} catch (e) {
  console.error(`Could not read git history: ${(e as Error).message.split("\n")[0]}`);
  process.exit(2);
}

const ignore: string[] = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === "--ignore" && args[i + 1]) ignore.push(args[i + 1] as string);
}

// `git ls-files` が空なら、追跡の情報が取れなかったということ。
// それで絞ると全ファイルが消え、「履歴が無い」ように見える。
// 分からないときは絞らない
if (tracked.size === 0) {
  console.error("(git ls-files returned nothing; not filtering by tracked files)");
}

const result = analyze(commits, {
  tracked: tracked.size > 0 ? tracked : undefined,
  ignore,
  topFiles: num("top", 15),
  topPairs: num("pairs", 10),
  minTogether: num("min-together", 3),
});

const format = flag("format") ?? "human";
if (format === "json") console.log(formatJson(result));
else if (format === "github") console.log(formatGithub(result));
else console.log(formatHuman(result, process.stdout.isTTY === true));

process.exit(exitCode(result, flag("max") === undefined ? undefined : num("max", 1)));
