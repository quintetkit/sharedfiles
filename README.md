# sharedfiles

Finds where parallel work will collide, from git history alone.

```bash
npx @quintetkit/sharedfiles
```

No tokens, no configuration, no API. Run it inside a repository and it answers.

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

Counts are commits, not tasks. They line up only if you squash-merge.
```

## Why

Splitting work into parallel tasks fails for a boring reason: the tasks were
not independent. Two of them touch a shared file — a route table, a barrel of
type definitions, a DI container — and whichever branch merges second has to be
redone.

You can hold that in your head for a codebase you wrote last week. **Your git
history already knows it for the rest.**

Two signals come out of it:

- **Breadth** — a file touched by most commits will be touched again. Two tasks
  that both need it cannot run at the same time.
- **Co-change** — files that always change together are one unit of work
  wearing two filenames. Splitting them across two Issues makes them look
  independent when they are not.

## It reports; it does not judge

**There are no errors and no warnings.** The exit code is 0 unless you ask for
a threshold.

A README changing in every commit is normal. A route table changing in every
commit is a design problem. **History cannot tell those two apart**, and a tool
that guesses which is which produces false positives — after the first one,
nobody reads the output again.

So it prints the numbers and leaves the call to you.

If you do want it to fail, name the line yourself:

```bash
sharedfiles --max 0.4     # exit 1 if any file is in more than 40% of commits
```

## Options

| | |
|---|---|
| `--limit N` | commits to read (default 300) |
| `--since DATE` | only after this — `--since "3 months ago"` |
| `--ignore PATH` | exclude a path or directory, repeatable |
| `--top N` | files to list (default 15) |
| `--pairs N` | pairs to list (default 10) |
| `--min-together N` | minimum co-occurrences for a pair (default 3) |
| `--max SHARE` | exit 1 if any file exceeds this share |
| `--format` | `human`, `github`, or `json` |

Lockfiles are excluded by default. They change constantly and never cause the
kind of collision this looks for. Files that no longer exist are excluded too —
reporting them cannot help you.

## What the numbers assume

**Commits are counted, not tasks.** Those line up when you squash-merge, and
drift apart when a branch lands as twenty small commits. Merge commits are
skipped so the same change is not counted twice.

The output says this too, every run. A number whose assumption is not visible
gets used as if it had none.

## In CI

```yaml
- uses: quintetkit/sharedfiles@v1
  with:
    max: "0.4"   # omit to report without ever failing
```

## Related

[scopecheck](https://github.com/quintetkit/scopecheck) answers the same question
from the other side: given Issues that declare which files they touch, which
pairs overlap. **That one needs the declarations. This one needs nothing** — use
it first, on a repository you have not organised yet.

[ccheck](https://github.com/quintetkit/ccheck) lints `.claude/` configuration,
citing the documentation for every finding.

[Quartet](https://github.com/quintetkit/quartet) is the free MIT workflow both
of them come from: Claude Code split into Architect / Coder / Reviewer /
Conflict Resolver around GitHub Issues.

A larger version with a UI Designer persona, the Reviewer's decision criteria,
a per-Issue parallel execution script and a 11-chapter guide is
[sold as Quintet](https://quintetkit.gumroad.com/l/quintet).

## License

MIT
