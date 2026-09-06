/**
 * git の履歴を読む。
 *
 * 外から API を叩かない。**手元のリポジトリだけで答えが出る**のがこの道具の要点で、
 * トークンも設定も要らずに5秒で試せることに価値がある。
 */
import { execFileSync } from "node:child_process";

/** コミットの区切り。ファイル名に現れない文字を使う（レコード区切り、U+001E）。 */
export const SEP = "\u001e";

export interface Commit {
  readonly hash: string;
  readonly files: readonly string[];
}

/** `git log` の出力を解析する。テストでは実際の出力を固定して食わせる。 */
export function parseLog(text: string): Commit[] {
  const out: Commit[] = [];
  let cur: { hash: string; files: string[] } | null = null;
  for (const line of text.split("\n")) {
    if (line.startsWith(SEP)) {
      if (cur) out.push(cur);
      cur = { hash: line.slice(1).trim(), files: [] };
      continue;
    }
    const f = line.trim();
    if (cur && f) cur.files.push(f);
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * 直近 `limit` 件の履歴。マージコミットは除く。
 *
 * マージを数えると同じ変更を二重に数えることになる。
 * ただし squash merge のリポジトリでは 1 コミット = 1 タスクなので、
 * **「コミット数 = タスク数」が成り立つかは運用による。** その前提は出力にも書く。
 */
export function readLog(cwd: string, limit: number, since?: string): Commit[] {
  const args = ["log", "--no-merges", `-n${limit}`, "--name-only",
                `--pretty=format:${SEP}%H`];
  if (since) args.splice(1, 0, `--since=${since}`);
  const text = execFileSync("git", args, {
    cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
  });
  return parseLog(text);
}

/**
 * いま追跡されているファイル。すでに消えたファイルを報告しても直せない。
 *
 * `--full-name` が要る。**付けないと、サブディレクトリで実行したときだけ
 * リポジトリ相対ではなくカレント相対のパスが返る。**
 * `git log --name-only` は常にリポジトリ相対なので、突き合わせが全部外れ、
 * 「履歴に何も無い」ように見える。
 */
export function trackedFiles(cwd: string): Set<string> {
  const out = execFileSync("git", ["ls-files", "--full-name"], { cwd, encoding: "utf8" });
  return new Set(out.split("\n").filter(Boolean));
}
