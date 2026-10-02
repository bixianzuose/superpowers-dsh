<div align="center">

[English](README.en.md) | **简体中文**

</div>

<div align="center">

![superpowers-dsh](static/home.png)

</div>

# superpowers-dsh

为 **DeepSeek Harness (DSH)** 打造的 Superpowers 插件包：把
[obra/superpowers](https://github.com/obra/superpowers) 的核心技能
（Claude-Code 技能库：TDD、调试、规划、协作模式）移植到 DSH 的 Cordis
插件架构上。

本仓库是 [LayneChai/superpowers-dsh](https://github.com/LayneChai/superpowers-dsh) 的 fork：技能内容已同步到上游 **obra/superpowers v6.4.2**（新增 `diagnosing-superpowers`），DSH 移植改动全部保留。

插件会向 `ctx.skills` 注册表的 **host 层** 注册一个技能提供者，因此每个
agent preset 的作用域链都会合并这些技能。技能正文随包分发
（`skills/<name>/SKILL.md`），通过 `import.meta.url` 定位——这是包的
组装事实，不需要任何用户配置。

## 在 DeepSeek Harness 中安装与使用

这是 DeepSeek Harness 的**插件包**。安装后会把下面的 15 个技能注册进
host 技能注册表，你 profile 里的每个 agent 会话都能在技能目录中看到它们，
并可用 `skill` 工具加载。

### 最简单：一条命令

不需要先全局安装 `dsh`，在任意目录执行：

```sh
npx @deepseek-ai/dsh plugin --profile web add github:bixianzuose/superpowers-dsh
```

装完后重启 `npx @deepseek-ai/dsh web`（或 `dsh web`），刷新浏览器即可。

### 最推荐：直接让 DeepSeek Harness 帮你安装

打开 DeepSeek Harness（Web 界面），新建对话，把下面这句话发给它：

```
帮我安装这个链接里边的插件：https://github.com/bixianzuose/superpowers-dsh
```

Agent 会自动完成安装（`dsh plugin --profile web add` → 重启 profile →
验证技能注册），无需你手动敲任何命令。装完后你可以在对话里让它运行
`dsh --profile web --dump-config`，确认输出里有 `superpowers-dsh` 行。

### 关于 npm 上的 `superpowers-dsh`

npm 上的 `superpowers-dsh` 是**上游移植作者 LayneChai 发布的包**（0.1.0，技能基线 v6.3.0）。本 fork 未发布 npm 包，两者不同步：

```sh
# 这条命令装到的是 LayneChai 的 0.1.0，不是本仓库的 0.2.0
dsh plugin --profile web add superpowers-dsh
```

要装本 fork，用上面的 GitHub 方式或下面的 tarball / 本地文件夹方式。

> 必须用 `dsh plugin` 形式——直接 `npm install superpowers-dsh` 只会把包当
> 普通库装到当前目录，**不会**注册进任何 DeepSeek Harness profile，技能
> 永远不会被加载。

### 从 GitHub 安装

```sh
# 任意目录下执行
dsh plugin --profile web add https://github.com/bixianzuose/superpowers-dsh.git
```

### 从 tarball 或本地文件夹安装

```sh
# tarball（例如仓库根目录的 superpowers-dsh-0.2.0.tgz）
dsh plugin --profile web add C:\路径\to\superpowers-dsh-0.2.0.tgz

# 或解压后的插件文件夹（pnpm 以链接方式安装，改完重启即生效）
dsh plugin --profile web add C:\路径\to\superpowers-dsh
```

### 重启并验证

bundle 层在 profile 启动时挂载，所以需要**重启 profile**（停掉后重新运行
`dsh web` / `npx @deepseek-ai/dsh web`，再刷新浏览器）。确认层已组合：

```sh
dsh --profile web --dump-config     # 必须出现 `superpowers-dsh` 行
```

之后技能会出现在 agent 技能目录中（`using-superpowers` 是入口技能），
可以用 `skill` 工具加载。

安装成功后的界面如下：

![安装成功截图](static/install-success.png)

### 在其他 profile（headless / tui / 自定义）中使用

把 `--profile` 指向你实际运行的 profile：

```sh
dsh plugin --profile headless add superpowers-dsh
dsh --profile headless --dump-config
```

### 卸载

```sh
dsh plugin --profile web remove superpowers-dsh
# 卸载后同样需要重启 profile
```

### 注意事项

- 国内用户可以先把 npm 镜像设为 npmmirror，让 `dsh plugin add
  superpowers-dsh` 更快：`npm config set registry https://registry.npmmirror.com`
- 从文件夹或 `file:` 规格安装的插件是链接安装（不是复制）：修改该文件夹后，
  下次重启 profile 生效
- 使用者**不需要 npm 账号，也不需要 2FA**——安装只是普通的包下载

## 技能列表

| 技能 | 用途 |
| --- | --- |
| `using-superpowers` | 如何查找和使用技能；入口技能 |
| `diagnosing-superpowers` | 复盘一次会话为什么走歪（重复劳动、计划被忽略、耗时与花费异常），并生成给上游维护者的报告 |
| `brainstorming` | 通过协作对话把想法变成设计 |
| `writing-plans` | 根据规格编写全面的实施计划 |
| `executing-plans` | 在当前会话内自己按计划执行（原生执行：任务台账 + 收尾一次整体评审） |
| `subagent-driven-development` | 每个任务派发全新子代理并评审 |
| `dispatching-parallel-agents` | 把独立工作扇出到并行代理 |
| `systematic-debugging` | 先找根因的调试纪律 |
| `test-driven-development` | RED-GREEN-REFACTOR 实施循环 |
| `verification-before-completion` | 声称成功前先拿出证据 |
| `requesting-code-review` | 合并前获得严格评审 |
| `receiving-code-review` | 核实反馈，而不是盲目照做 |
| `finishing-a-development-branch` | 安全地整合已完成的工作 |
| `using-git-worktrees` | 功能开发的隔离工作区 |
| `writing-skills` | 以 TDD 方式编写并验证新技能 |

## 工作原理

- **Bundle 层** —— `cordis.patch.yml` 在 dsh-base 层之上插入一行
  （`- id: superpowers-dsh, name: superpowers-dsh`）。后面的层（profile 的
  `cordis.patch.yml`、`--patch` 叠加）仍可按 id 定位这一行。
- **提供者** —— `lib/index.js` 调用 `ctx.skills.registerProvider(...)`，
  注册一个提供者：
  - `list()` 扫描包内 `skills/` 目录，把每个 `<name>/SKILL.md` 作为候选，
    从 YAML frontmatter 解析出 `name`、`description`、`whenToUse`。
  - `get()` 按需读取候选技能正文，返回完整技能定义，`resourceBase` 指向
    技能所在目录，使相对引用（脚本、提示模板）可以正确解析。
- **零运行时依赖** —— 插件只使用 Node 内置模块，消费注入的 `ctx.skills`
  服务接口。

## 让技能自动唤起（可选）

上游在 Claude Code 上靠 `SessionStart` hook 把 `using-superpowers` 全文注入会话上下文；
插件本身只注册技能目录，**默认不会自动唤起**（模型要先看到目录，再自己决定调 `skill`）。
DSH 带 Claude Code hooks 桥，把下面这段加进 profile 的 `cordis.patch.yml` 就能拿到与上游一致的行为：

```yaml
- insert:
    - id: hooks-claude-code
      name: '@deepseek-ai/dsh-hooks-claude-code'
      config:
        configPath: <本包路径>/hooks/hooks.json
        pluginRoot: <本包路径>
```

```sh
dsh plugin --profile <你的 profile> add @deepseek-ai/dsh-hooks-claude-code@0.2.0-rc.2
```

两点注意：patch 条目必须写成 `insert:` 形式（非 insert 的条目要有 `id` 去改已有行，只有 `name` 会被跳过）；
`hooks/session-start.mjs` 是 Node 实现（全平台可跑，不依赖 bash），输出 `hookSpecificOutput.additionalContext`。

## 移植说明（对比上游 obra/superpowers）

- 去掉了命名空间前缀：`superpowers:brainstorming` → `brainstorming`
  （DSH 技能用裸名称寻址）。
- `using-superpowers` 现在介绍 DSH 的 `skill` 工具，并指向
  `skills/using-superpowers/references/dsh-tools.md`——完整的
  Claude-Code → DSH 工具映射（`pwsh`、`subagent`、`workflow`、`goal` ...）。
- 子代理引用映射到 DSH 的 `subagent` / `subagent_fork` 工具。
- `brainstorming` 的视觉伴侣补充了 Windows 说明：Node 服务
  （`scripts/server.cjs`）全平台可跑；`.sh` 辅助脚本仅限 bash。
- **技能基线：obra/superpowers v6.4.2。** 上游这一版把 `executing-plans`
  重写为"原生执行"（任务台账、`task-start` / `task-done` 脚本、收尾整体评审），
  并新增 `diagnosing-superpowers`；本包同步后重放了全部 DSH 适配（去前缀、
  `subagent` / `subagent_fork` 说明、指向 `dsh-tools.md`）。
- 上游按 harness 分发的工具参考（Claude Code / Codex / Pi / Antigravity /
  Hermes / Muse）未随包分发，本包只带 DSH 映射 `references/dsh-tools.md`。

## 与上游同步

本仓库已配置三个 remote：`origin`（本 fork）、`source`（LayneChai 的移植仓库）、
`upstream`（obra/superpowers）。下次同步上游新版：

```sh
git fetch upstream --tags
git diff --stat v6.4.2 <新 tag> -- skills    # 先看改动面
```

然后以上游新 tag 为底重放 DSH 适配：去掉 `superpowers:` 命名空间前缀、
补 `**Note:** On the DeepSeek Harness ...` 说明、裁掉非 DSH 的 references。
`vendor` 分支保留着上一轮的合并过程（v6.3.0 基准 → 0.1.0 移植态 → v6.4.2 合并），
可作为下次同步的模板。

## 添加自己的技能

往包里放一个新的 `skills/<kebab-name>/SKILL.md` 即可——它必须以 YAML
frontmatter 开头（`name` + `description`，可选 `whenToUse`）。无需改任何
代码：`list()` 会自动发现它。

## 许可证

MIT。技能内容改编自
[obra/superpowers](https://github.com/obra/superpowers)（MIT），© Jesse Vincent
及贡献者。
