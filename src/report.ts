/**
 * 出力。
 *
 * この道具は error を出さない。**測って並べるだけ**なので、
 * 何が問題かを決めるのは読む人。`--max` を指定したときだけ、
 * 利用者が決めた線を超えたかどうかで終了コードが変わる。
 */
import type { Result } from "./analyze.ts";

const RESET = "\u001b[0m";
const DIM = "\u001b[2m";
const ANCHOR = "\u001b[33m";

const color = (on: boolean, code: string, s: string): string => (on ? `${code}${s}${RESET}` : s);
const pct = (x: number): string => `${Math.round(x * 100)}%`;

export function formatHuman(r: Result, tty: boolean): string {
  if (r.commits === 0) {
    // 「読めなかった」と「読んだが全部除外された」を同じ文言にしない。
    // 前者は入力の問題、後者は除外設定の問題で、直す場所が違う
    if (r.read === 0) {
      return "No commits to read. Check --limit, --since, or whether this is a git repository.";
    }
    return `Read ${r.read} commits, and every file in them was excluded.\n` +
           "  Check --ignore, and whether `git ls-files` lists anything in this repository.";
  }
  const lines: string[] = [];
  lines.push(`Read ${r.commits} commits.`);
  lines.push("");
  lines.push("Files touched by the most commits");
  lines.push(color(tty, DIM, "  two tasks that both need one of these cannot run in parallel"));
  lines.push("");
  const w = Math.max(...r.files.map((f) => f.path.length), 4);
  for (const f of r.files) {
    const share = pct(f.share);
    const bar = "#".repeat(Math.max(1, Math.round(f.share * 24)));
    lines.push(`  ${f.path.padEnd(w)}  ${String(f.commits).padStart(4)}  ` +
               `${share.padStart(4)}  ${color(tty, ANCHOR, bar)}`);
  }
  if (r.pairs.length > 0) {
    lines.push("");
    lines.push("Files that change together");
    lines.push(color(tty, DIM, "  splitting these across two Issues makes them look independent when they are not"));
    lines.push("");
    for (const p of r.pairs) {
      lines.push(`  ${pct(p.confidence).padStart(4)}  ${p.together}x  ${p.a}`);
      lines.push(`             ${p.b}`);
    }
  }
  lines.push("");
  lines.push(color(tty, DIM,
    "Counts are commits, not tasks. They line up only if you squash-merge."));
  return lines.join("\n");
}

export function formatGithub(r: Result): string {
  const out: string[] = [];
  for (const f of r.files.slice(0, 5)) {
    out.push(`::notice title=shared-file::${f.path} is touched by ${pct(f.share)} ` +
             `of the last ${r.commits} commits`);
  }
  for (const p of r.pairs.slice(0, 5)) {
    out.push(`::notice title=changes-together::${p.a} and ${p.b} change together ` +
             `in ${pct(p.confidence)} of the commits that touch either`);
  }
  return out.join("\n");
}

export const formatJson = (r: Result): string => JSON.stringify(r, null, 2);

/**
 * 終了コード。
 *
 * 既定は常に 0。**この道具は問題を宣言しない。**
 * `--max` を渡したときだけ、利用者が決めた割合を超えたファイルがあれば 1。
 */
export function exitCode(r: Result, max?: number): number {
  if (max === undefined) return 0;
  return r.files.some((f) => f.share > max) ? 1 : 0;
}
