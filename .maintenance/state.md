# 上游对齐基线

本文件是「与上游对齐」这一个动作的唯一事实来源：维护任务读它来判断有没有增量。

- 上游仓库：https://github.com/obra/superpowers
- **已对齐的上游 tag：v7.0.1**（commit `2ce8aa1`）
- 本仓库发布版本：**v0.3.2**（2026-10-25 发布）
- `package.json` 版本：**0.3.3**（待发布）
- 建立基线：2026-10-02（2026-10-03 / 10-04 / 10-11 复核与推进）

## 对齐方式（重放规则）

以上游该 tag 的 `skills/` 树为底，重放 DSH 适配：

1. 去掉命名空间前缀：`superpowers:<skill>` → `<skill>`
2. `executing-plans` 保留 `**Note:** On the DeepSeek Harness ...` 段；`using-superpowers` 保留
   「Invoking skills on DSH」段并指向 `references/dsh-tools.md`
3. 删除上游按 harness 分发的 references（`claude-code` / `codex` / `gemini` / `hermes` /
   `pi` / `antigravity` / `muse`-tools.md），只保留 `dsh-tools.md`
4. 上游新增的技能与脚本一并纳入，并补进 README 技能表
5. 脚本可执行位与上游一致（`100755`）——POSIX 上 `./task-brief` 之类的直接调用依赖它，Windows 无影响但不要丢
6. Windows 上技能脚本经 Git Bash 调用（`sh scripts/x`）：裸 `bash` 会落到未装发行版的 WSL 桩，裸路径也没有 shebang —— 见 `references/dsh-tools.md`
7. 完成后 `node scripts/check.mjs` 必须 0 失败

## 变更记录

| 日期 | 上游 tag | 本仓库版本 | 备注 |
| --- | --- | --- | --- |
| 2026-10-02 | v6.4.2 | 0.2.0 | 首次建立基线（自 v6.3.0 对齐至 v6.4.2） |
| 2026-10-03 | v6.4.2 | 0.2.1 | 上游无新 tag（v6.4.2 即 upstream/main tip），无对齐动作；0.2.1 仅为本仓库修复的版本准备，未打 tag |
| 2026-10-11 | v7.0.0 | 0.3.0 | 上游发布 v7.0.0（brainstorming 重建、Windows hook 修复、Antigravity manifest）；对齐 8 个技能文件、去前缀 4 处、修 6 个脚本可执行位；版本准备 0.3.0 并清理历史 tarball（只留最新）；手册改为「版本更新周必须打包 + 打 tag + 发 Release」，并新增「发布产物」断言 |
| 2026-10-11 (2) | v7.0.0 | 0.3.1 | 补 Windows 技能脚本调用约定（`sh`/Git Bash）；自检新增「技能脚本」「文本整洁」两项断言（后者抓到 README 里被误写的退格符）；8 个 helper 语法通过、`task-start`/`task-done` 端到端实测跑通 |
| 2026-10-11 (3) | v7.0.0 | 0.3.2 | 修正 `bash` 失败原因的描述：WSL 已安装、默认发行版是无 bash 的 `docker-desktop`（并非"未安装发行版"）；补 `wsl --set-default Ubuntu` 修法与取舍说明（作者指出后复核更正） |
| 2026-10-04 | v6.4.2 | 0.2.1 | 上游无变化（`v6.4.2..upstream/main` = 0 提交）；同步发布事实：v0.2.1 已于 2026-10-03 发布，tag → `b56932a` |