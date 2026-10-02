# superpowers-dsh 每周维护任务

你是本仓库的维护 agent。本周要做的事只有三件：**修 bug、处理外来的 PR/issue、与上游对齐**。
本文件是唯一执行依据，每次运行都从第 1 步完整走到第 7 步，不要跳步，不要凭记忆。

会话起始应当已经注入了 `using-superpowers`（SessionStart hook）。若没有，先 `skill(name: "using-superpowers")`。
工具：`pwsh` / `read` / `write` / `edit` / `grep` / `glob` / `subagent` 已在 DSH 上可用。

## 1. 体检（永远先做）

```sh
node scripts/check.mjs
```

- 退出码非 0 → **这是本周第一优先级**。用 `systematic-debugging` 找根因，用 `test-driven-development` 修
  （先把失败项变成可复现的断言），改完重跑直到 0 失败。
- 退出码 0 → 记下输出，进入第 2 步。

## 2. 外部信号（PR / issue）

```sh
git fetch origin --prune
gh pr list --state open --json number,title,author,createdAt,mergeable,files
gh issue list --state open --json number,title,author,createdAt,labels
```

对每个 PR（`gh pr diff <n>` 读 diff）按这个标准判：

- 不破坏 `scripts/check.mjs` 的不变量；不引入非 DSH 的 references；不退回命名空间前缀；不引入 npm 运行时依赖。
- 达标 → 本地取出验证（`git fetch origin pull/<n>/head:pr-<n>` → 跑 check → 通过后 `gh pr merge <n> --squash`）。
- 不达标 → 留评论指出具体问题（引用 check 输出或具体行），**不要直接关**。

issue：能复现的按第 3 步当 bug 处理；判断不了的加一条 `needs-info` 评论并说明缺什么信息。

## 3. Bug 修复纪律

- `systematic-debugging`：先复现，再改。复现手段优先写进 `scripts/check.mjs`（这是本仓库的验收脚本）。
- `test-driven-development`：断言先失败 → 改 → `node scripts/check.mjs` 全绿。
- `verification-before-completion`：贴出命令与输出，再声明修好。

## 4. 上游对齐

```sh
git fetch upstream --tags
# 与 .maintenance/state.md 的基线 tag 比对
git log --oneline v6.4.2..<最新 tag> -- skills
```

- **没有新 tag** → 报告里写「上游无变化」，跳到第 5 步。
- **有新 tag** → 用 `writing-plans` 写对齐计划，然后：
  1. 建分支 `sync/upstream-<tag>`
  2. 以新 tag 的 `skills/` 树为底，按 `.maintenance/state.md` 的「重放规则」重新施加 DSH 适配
  3. `node scripts/check.mjs` 必须 0 失败
  4. 更新 `.maintenance/state.md` 的基线 tag、commit 与变更记录表
  5. 用 `requesting-code-review` 对整份 diff 自审一遍，再开 PR
- 合并拿不准的地方 → 开 **draft** PR，写清分歧点，不要硬合。

## 5. 版本与发布

`package.json` 的版本号与 GitHub Release **不要自动发布**，除非：

- 本周发生了上游对齐（技能内容变化）或修了影响使用的 bug；
- 且 `check.mjs` 全绿。

此时才：改版本号 → 重新 `npm pack` 覆盖 tarball → 在分支里提交 → PR 描述里写明要打什么 tag。
打 tag、发 Release、改 profile 依赖一律留给人工确认。

## 6. 产出（每次必做）

1. 报告写到 `.maintenance/reports/YYYY-MM-DD.md`：

```md
# 维护报告 YYYY-MM-DD

## 体检
<check.mjs 输出摘要；若修过东西，写修复前后对比>

## 外部信号
| PR/issue | 作者 | 处置 | 依据 |
| --- | --- | --- | --- |

## 上游
基线 <tag> → 最新 <tag>；增量：<文件清单摘要 或 "无变化">

## 本周动作
分支 / PR / 提交链接

## 未能处理
<原因 + 需要人工判断的点>

维护完成：<日期> | check=<pass/fail> | PR=<数量> | 上游=<基线→最新>
```

2. 报告与脚本改动走分支 + PR：`gh pr create --fill --draft`。

## 7. 硬边界（违反即视为任务失败）

- **不直接 push main**；一切改动走分支 + PR。
- 不 force push、不删分支、不 rewrite 历史。
- 不改 `skills/` 内技能正文的语义（那是上游内容）；只做移植适配与仓库维护。
- 不自动升版本号、不自动打 tag、不自动发 Release（见第 5 步）。
- 不引入 npm 运行时依赖（本插件必须保持零依赖）。
- 凭据、token、`.env` 内容不得进入报告、提交或 PR 描述。

## 8. 无人值守纪律

本任务由计划任务触发，**没有人在旁边回答问题**：

- 不要调用 `ask_user_question`。需要人判断的事项写进报告的「未能处理」。
- 凭据操作若失败，直接记录失败，不要尝试交互式登录或弹窗流程。
- 单次运行控制在 2 小时内。某一步卡住就跳过并记录，把剩下的步骤走完。
- 报告与 PR 是给人看的唯一出口：写清楚「做了什么、依据是什么、什么没做、为什么」。