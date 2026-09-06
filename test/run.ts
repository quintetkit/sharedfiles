/**
 * fixtures に対する結果を突き合わせる。
 *
 * **実際の `git log` の出力を1本入れてある**（`test/fixtures/real-log.txt`）。
 * 自分で書いた入力だけでテストすると、実装と同じ思い込みが両側に入り、
 * その思い込みは検証できない。捕獲は `node test/capture.mjs <repo>`。
 */
import { readFileSync } from "node:fs";
import { analyze } from "../src/analyze.ts";
import { parseLog, SEP } from "../src/git.ts";
import { exitCode, formatGithub, formatHuman, formatJson } from "../src/report.ts";

const F = new URL("./fixtures/", import.meta.url).pathname;

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (!cond) {
    console.error(`  NG  ${label}`);
    failed += 1;
  }
};

const log = (...commits: string[][]): string =>
  commits.map((f, i) => `${SEP}hash${i}\n${f.join("\n")}`).join("\n");

// ---------------------------------------------------------------- parse
console.log("parseLog");
{
  const c = parseLog(log(["a.ts", "b.ts"], ["a.ts"]));
  ok(c.length === 2, `2コミット（出たもの: ${c.length}）`);
  ok(c[0]!.files.length === 2 && c[1]!.files.length === 1, "ファイル数");
  ok(c[0]!.hash === "hash0", "ハッシュを拾う");
  ok(parseLog("").length === 0, "空の入力は0件");
  // マージコミットは --name-only で何も出さない。空のコミットを落とさない
  ok(parseLog(`${SEP}h1\n`).length === 1, "ファイルの無いコミットも1件として読む");
}

// ---------------------------------------------------------------- 数える
console.log("analyze");
{
  const r = analyze(parseLog(log(
    ["a.ts", "b.ts"], ["a.ts", "b.ts"], ["a.ts", "b.ts"], ["a.ts", "c.ts"])));
  ok(r.commits === 4, "コミット数");
  const a = r.files.find((f) => f.path === "a.ts")!;
  ok(a.commits === 4 && Math.abs(a.share - 1) < 1e-9, "a.ts は全コミット");
  const ab = r.pairs.find((p) => p.a === "a.ts" && p.b === "b.ts")!;
  ok(ab?.together === 3, `a と b の共起は3（出たもの: ${ab?.together}）`);
  // b は3回中3回 a と一緒だが、a は4回中3回。低いほうを採る
  ok(Math.abs(ab.confidence - 0.75) < 1e-9,
     `低いほうの割合を採る（出たもの: ${ab?.confidence}）`);
  ok(!r.pairs.some((p) => p.b === "c.ts"), "共起1回の組は出さない（既定の下限3）");
}

// ---------------------------------------------------------------- 除外
console.log("ignore");
{
  const l = log(["package-lock.json", "src/a.ts"], ["package-lock.json"],
                ["package-lock.json"], ["src/a.ts"]);
  const r = analyze(parseLog(l));
  ok(!r.files.some((f) => f.path === "package-lock.json"), "ロックファイルは既定で除外");
  ok(r.commits === 2, `中身が全部除外されたコミットは数えない（出たもの: ${r.commits}）`);

  const r2 = analyze(parseLog(log(["docs/x.md", "src/a.ts"], ["src/a.ts"])),
                     { ignore: ["docs"] });
  ok(!r2.files.some((f) => f.path.startsWith("docs/")), "--ignore はディレクトリに効く");

  const r3 = analyze(parseLog(log(["gone.ts", "src/a.ts"])),
                     { tracked: new Set(["src/a.ts"]) });
  ok(!r3.files.some((f) => f.path === "gone.ts"),
     "すでに消えたファイルは出さない（直せないため）");
}

// ------------------------------------------------------------ 実データ
console.log("real log");
{
  const real = parseLog(readFileSync(`${F}real-log.txt`, "utf8"));
  ok(real.length === 34, `実データ 34 コミット（出たもの: ${real.length}）`);
  ok(real.every((c) => /^[0-9a-f]{40}$/.test(c.hash)), "ハッシュが40桁の16進");
  const r = analyze(real);
  ok(r.commits > 0 && r.files.length > 0, "実データで結果が出る");
  // 日英で対になっているフィードは、必ず一緒に変わる
  const feed = r.pairs.find((p) => p.a.endsWith("feed.xml") && p.b.endsWith("feed.xml"));
  ok(feed !== undefined && feed.confidence === 1,
     `対のフィードは必ず一緒に変わる（出たもの: ${feed?.confidence}）`);
  ok(r.files.every((f) => f.share <= 1), "割合が1を超えない");
}

// ---------------------------------------------------------------- 出力
console.log("report");
{
  const r = analyze(parseLog(log(["a.ts", "b.ts"], ["a.ts", "b.ts"], ["a.ts", "b.ts"])));
  ok(exitCode(r) === 0, "既定では常に 0（この道具は問題を宣言しない）");
  ok(exitCode(r, 0.5) === 1, "--max を超えたら 1");
  ok(exitCode(r, 1) === 0, "--max を超えなければ 0");
  const h = formatHuman(r, false);
  ok(h.includes("a.ts") && h.includes("Read 3 commits"), "human に中身が出る");
  ok(!h.includes("["), "tty でないときは色を付けない");
  ok(formatGithub(r).startsWith("::notice"), "github 形式は notice");
  ok(JSON.parse(formatJson(r)).commits === 3, "json が読める");
  ok(formatHuman(analyze([]), false).startsWith("No commits"), "0件のときは説明を出す");
  // 「読めなかった」と「読んだが全部除外された」を混ぜない。直す場所が違う
  const allFiltered = analyze(parseLog(log(["package-lock.json"], ["yarn.lock"])));
  ok(allFiltered.commits === 0 && allFiltered.read === 2, "読んだ数と残った数を分けて持つ");
  ok(formatHuman(allFiltered, false).includes("every file in them was excluded"),
     "全部除外されたときは、そう言う");
}

console.log(failed === 0 ? "\nすべて通過" : `\n${failed} 件が失敗`);
process.exit(failed === 0 ? 0 : 1);
