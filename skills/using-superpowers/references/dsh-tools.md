# DeepSeek Harness Tool Reference

This is the DSH platform adaptation for the superpowers skills. Read this file
when a skill mentions a tool, hook, or mechanism that does not exist on this
harness — the equivalent lives here.

## How skills are invoked here

The DeepSeek Harness exposes a `skill` tool. When a skill applies, call it
BEFORE acting:

- `skill(name: "brainstorming")` loads the skill body into context with the
  same `<skill_content>` framing the catalog advertises.
- The catalog lists every available skill with its `whenToUse` guidance.
  Superpowers skills are discoverable under their bare names (`brainstorming`,
  `writing-plans`, `systematic-debugging`, ...).

There is no `CLAUDE.md` auto-loading on DSH. Put durable project instructions
in `AGENTS.md` (or the session's system prompt), and load skills explicitly.

## Core tool mapping (Claude Code → DSH)

| Claude Code | DSH equivalent | Notes |
| --- | --- | --- |
| `Bash` | `pwsh` (Windows) / `bash` (POSIX) | PowerShell on Windows hosts; bash on POSIX hosts. |
| `Read` / `Write` / `Edit` | `read` / `write` / `edit` | Same semantics; DSH adds `sandbox_permissions` escalation on write/edit. |
| `Glob` / `Grep` | `glob` / `grep` | `glob` returns files only (never directories); `grep` is ripgrep syntax. |
| `TodoWrite` | `todo_write` | Whole-list replacement each call. |
| `Task` (subagents) | `subagent` / `subagent_fork` | Background by default; `subagent_fork` inherits this conversation. |
| `AskUserQuestion` | `ask_user_question` | Questions return stable ids echoed in answers. |
| `WebSearch` | `web_search` | Returns a summary answer plus source URLs. |
| `LS` (file list) | `glob` + `read` | There is no dedicated `ls` tool. |
| Hooks (SessionStart, PreToolUse, ...) | `@deepseek-ai/dsh-hooks-claude-code` bridge | DSH runs Claude Code's command-hook subset on its own seams (`@deepseek-ai/dsh-hook-protocol`); mount the bridge in a profile patch and point `configPath` at a `hooks.json`. |
| `/commands` slash commands | `dsh` CLI + `command-*` plugins | Slash-command UI lives in the web surface. |
| Plan mode | `exit_plan_mode` | Present the plan; on approval leave plan mode and execute. |
| `ReadImage` | `read_image` | PNG/JPEG/WebP/GIF only. |
| Background jobs | `run_in_background: true` on tools | `job_output` / `job_kill` / `job_list` manage them. |

## DSH-specific tools superpowers should know about

- `goal` tools (`create_goal`, `get_goal`, `update_goal`): persisted
  same-session completion objectives with automatic continuation rounds.
- `workflow`: fan work out across many subagents with phases and structured
  results — the DSH-native way to run `dispatching-parallel-agents` at scale.
- `ralph`: fresh-agent iterative loops (only when the human explicitly asks).
- `skill`: loads a skill's full instructions (see above).

## Session and diagnostic surfaces

Skill-level diagnosis on DSH leans on these paths and commands:

- Session transcripts: `$DSH_HOME/sessions/`, with older copies under
  `$DSH_HOME/dsh-session-archive/` and rotating logs under `$DSH_HOME/logs/`.
- Profile state: `$DSH_HOME/profiles/<profile>/` — `package.json` (the
  dependency specs that pin each plugin), `cordis.yml` / `cordis.patch.yml`
  (layer composition), and `.plugin-manager/logs/` (install/activation logs).
- Effective composition: `dsh --profile <profile> --dump-config` — the
  authoritative list of layers actually mounted.
- Skill catalog: whatever the session's system prompt lists; packaged skills
  from this bundle appear under their bare names.
## Hooks on DSH

DSH keeps no hook config of its own, but it does run Claude Code's command-hook
subset: mount `@deepseek-ai/dsh-hooks-claude-code` in a profile patch with
`configPath` pointing at a `hooks.json`, and `SessionStart`, `UserPromptSubmit`,
`PreToolUse`, `PostToolUse`, `Stop`, `SubagentStart` and `SubagentStop` fire on
the harness's own seams. `SessionStart` attaches context before the first turn —
this bundle uses it (see `hooks/session-start.mjs`) to inject the
`using-superpowers` body, so the entry skill is already in context instead of
waiting to be asked for.

The patch entry must use the `insert:` form; a `name`-only entry is silently
skipped, because a non-insert patch needs an `id` to retarget an existing row.

## Windows notes

- `pwsh` runs in ConstrainedLanguage under the read-only sandbox; commands
  that need .NET APIs may require `workspace-write` or `danger-full-access`.
- `bash`-only scripts (the `start-server.sh` helpers in brainstorming) do
  not run on Windows; use `pwsh` equivalents or the `node` scripts instead.
- Paths use `C:\...` form; read env vars with `$env:NAME` in pwsh.
