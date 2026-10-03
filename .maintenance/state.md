# 上游对齐基线

本文件是「与上游对齐」这一个动作的唯一事实来源：维护任务读它来判断有没有增量。

- 上游仓库：https://github.com/obra/superpowers
- **已对齐的上游 tag：v6.4.2**（commit `8ca22dba9a94f28898bbce59f2537ff4d87c747d`）
- 本仓库发布版本：**v0.2.0**（tag → `4660349`）；`package.json` 已备好 **0.2.1**（待人工打 tag，见第 5 步）
- 建立基线：2026-10-02（2026-10-03 复核：基线仍等于上游最新 tag）

## 对齐方式（重放规则）

以上游该 tag 的 `skills/` 树为底，重放 DSH 适配：

1. 去掉命名空间前缀：`superpowers:<skill>` → `<skill>`
2. `executing-plans` 保留 `**Note:** On the DeepSeek Harness ...` 段；`using-superpowers` 保留
   「Invoking skills on DSH」段并指向 `references/dsh-tools.md`
3. 删除上游按 harness 分发的 references（`claude-code` / `codex` / `gemini` / `hermes` /
   `pi` / `antigravity` / `muse`-tools.md），只保留 `dsh-tools.md`
4. 上游新增的技能与脚本一并纳入，并补进 README 技能表
5. 完成后 `node scripts/check.mjs` 必须 0 失败

## 变更记录

| 日期 | 上游 tag | 本仓库版本 | 备注 |
| --- | --- | --- | --- |
| 2026-10-02 | v6.4.2 | 0.2.0 | 首次建立基线（自 v6.3.0 对齐至 v6.4.2） |
| 2026-10-03 | v6.4.2 | 0.2.1 | 上游无新 tag（v6.4.2 即 upstream/main tip），无对齐动作；0.2.1 仅为本仓库修复的版本准备，未打 tag |