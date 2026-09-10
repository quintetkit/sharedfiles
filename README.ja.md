# sharedfiles

**並列で走らせるとぶつかる場所を、git の履歴だけから探します。**

```bash
npx @quintetkit/sharedfiles
```

トークンも設定も API も要りません。リポジトリの中で叩けば答えが出ます。

```
Read 34 commits.

Files touched by the most commits
  two tasks that both need one of these cannot run in parallel

  sitemap.xml              22   65%  ################
  articles/index.html      18   53%  #############
  en/articles/index.html   17   50%  ############

Files that change together
  splitting these across two Issues makes them look independent when they are not

  100%  13x  en/feed.xml
             feed.xml
   94%  17x  articles/index.html
             en/articles/index.html
```

## なぜ要るか

並列化が失敗する理由は、たいてい地味です。**タスクが実は独立していない。**

2つが共有ファイル（ルーティング定義、型定義の集約、DI コンテナ）を触っていて、
**あとからマージする方がやり直しになる。**

先週自分で書いたコードなら、頭の中で把握できます。
**それ以外については、git の履歴がすでに知っています。**

出るのは2つです。

- **広さ** — ほとんどのコミットが触るファイルは、次も触られます。
  それを両方が必要とする2つのタスクは、同時に走らせられません
- **共変** — 常に一緒に変わるファイルは、**名前が2つある1つの作業単位**です。
  別々の Issue に分けると、独立しているように見えてしまいます

## 判定はしません

**error も warn も出ません。** 閾値を指定しない限り、終了コードは常に 0 です。

README が毎コミット変わるのは正常で、ルーティング定義が毎コミット変わるのは
設計の問題です。**履歴からその2つは区別できません。**
区別できないものを推測すると誤検出になり、**1件出た時点で出力ごと読まれなくなります。**

だから数字だけ出して、判断は人に残します。

落としたい場合は、線を自分で引いてください。

```bash
sharedfiles --max 0.4     # 全コミットの40%を超えるファイルがあれば 1
```

## オプション

| | |
|---|---|
| `--limit N` | 読むコミット数（既定 300） |
| `--since DATE` | それ以降だけ — `--since "3 months ago"` |
| `--ignore PATH` | 除外するパスかディレクトリ（複数可） |
| `--top N` | 出すファイル数（既定 15） |
| `--pairs N` | 出す組数（既定 10） |
| `--min-together N` | 組にする最低の共起回数（既定 3） |
| `--max SHARE` | この割合を超えるファイルがあれば 1 |
| `--format` | `human` / `github` / `json` |

ロックファイルは既定で除外します。**常に変わりますが、この種の衝突は起こしません。**
すでに消えたファイルも除外します。報告されても直せないからです。

## 数字が前提にしていること

**数えているのはコミットであって、タスクではありません。**

squash merge なら一致しますが、1つのブランチが20個の小さいコミットで入る運用ではずれます。
マージコミットは除いています（同じ変更を二重に数えるため）。

**この但し書きは毎回出力にも出ます。** 前提の見えない数字は、前提が無いものとして使われるので。

## CI で

```yaml
- uses: quintetkit/sharedfiles@v1
  with:
    max: "0.4"   # 省略すると、報告するだけで落ちません
```

## 関連

[scopecheck](https://github.com/quintetkit/scopecheck) は同じ問いを反対側から見ます。
**触るファイルを宣言した Issue** があるとき、どの組が重なっているか。

**あちらは宣言が要ります。こちらは何も要りません。**
まだ整理していないリポジトリには、こちらを先に使ってください。

[ccheck](https://github.com/quintetkit/ccheck) は `.claude/` の設定を検査します。
指摘には必ず公式ドキュメントへの出典が付きます。

[Quartet](https://github.com/quintetkit/quartet) は、この2つが出てきた元の
ワークフローです（Claude Code を設計・実装・レビュー・コンフリクト解消に分ける、MIT）。

UI 設計人格・レビュー基準・Issue 単位の並列実行スクリプト・実践ガイド11章を足した
[Quintet は有料](https://quartet-dev.booth.pm/items/8807156)です。

## ライセンス

MIT
