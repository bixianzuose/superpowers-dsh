<div align="center">

**English** | [简体中文](README.md)

</div>

<div align="center">

![superpowers-dsh](static/home.png)

</div>

# superpowers-dsh

Superpowers for the **DeepSeek Harness**: a plugin bundle that ports the core
skills of [obra/superpowers](https://github.com/obra/superpowers) (the
Claude-Code skills library: TDD, debugging, planning, collaboration patterns)
to DSH's Cordis plugin architecture.

This repo is a fork of [LayneChai/superpowers-dsh](https://github.com/LayneChai/superpowers-dsh): the skills are synced to upstream **obra/superpowers v6.4.2** (which added `diagnosing-superpowers`), with every DSH adaptation preserved.

The plugin registers a skill provider into the **host layer** of the
`ctx.skills` registry, so every agent preset's scope chain merges these
skills. Skill bodies ship inside the package (`skills/<name>/SKILL.md`) and
are located from `import.meta.url` — an assembly fact of the package, never
user configuration.

## Install & use in your DeepSeek Harness

A **plugin bundle** for DeepSeek Harness (DSH). Installing it registers the
15 skills below into the host skill registry, so every agent session in your
profile sees them in its skill catalog and can load them with the `skill`
tool.

### Prerequisites

- DeepSeek Harness, plus **pnpm** — the `dsh plugin` command forwards to pnpm
  (`pnpm --version` to check; install from https://pnpm.io if missing)
- The `dsh` CLI. It ships with the Harness and is normally started as
  `npx @deepseek-ai/dsh web`, so it is only on `PATH` inside that process
  tree. Either make it permanent, or use the `npx` form of every command
  below:

  ```sh
  # make `dsh` permanently available (recommended):
  npm install -g @deepseek-ai/dsh
  dsh --version

  # or skip the install and run everything through npx:
  npx @deepseek-ai/dsh --version
  ```

  Every `dsh ...` example below works identically as
  `npx @deepseek-ai/dsh ...`.

### Simplest: one command

No global `dsh` install required. Run this from any directory:

```sh
npx @deepseek-ai/dsh plugin --profile web add github:bixianzuose/superpowers-dsh
```

Then restart `npx @deepseek-ai/dsh web` (or `dsh web`) and refresh the browser.

### Easiest: let the DeepSeek Harness agent install it

Open the DeepSeek Harness web UI, start a new conversation, and send this
message:

```
Please install the plugin from this link: https://github.com/bixianzuose/superpowers-dsh
```

The agent will run the install for you (`dsh plugin --profile web add` →
restart the profile → verify the skills registered), so you never have to
type a command. Afterwards you can ask it to run
`dsh --profile web --dump-config` and confirm a `superpowers-dsh` row is
present.

### About the npm `superpowers-dsh` package

The `superpowers-dsh` package on npm is **LayneChai's upstream port** (0.1.0,
skills baseline v6.3.0). This fork is not published to npm, so the two are not
in sync:

```sh
# this installs LayneChai's 0.1.0, not this repo's 0.2.0
dsh plugin --profile web add superpowers-dsh
```

To install this fork, use the GitHub form above, or the tarball / local folder
form below.

> Use the `dsh plugin` form — a plain `npm install superpowers-dsh` installs
> the package as a library in the current directory but does **not** register
> it into any DeepSeek Harness profile, so the skills would never load.

### Install from GitHub

```sh
# from anywhere
dsh plugin --profile web add https://github.com/bixianzuose/superpowers-dsh.git
```

### Install from a tarball or a local folder

```sh
# tarball (e.g. the repo-root asset superpowers-dsh-0.2.0.tgz)
dsh plugin --profile web add C:\path\to\superpowers-dsh-0.2.0.tgz

# or the unpacked package folder (pnpm links it, so edits take effect on restart)
dsh plugin --profile web add C:\path\to\superpowers-dsh
```

### Restart and verify

The bundle layer mounts at profile startup, so **restart the profile** (stop
and re-run `dsh web` / `npx @deepseek-ai/dsh web`, then refresh the browser).
To confirm the layer is composed:

```sh
dsh --profile web --dump-config     # a `superpowers-dsh` row must be present
```

The skills then appear in the agent skill catalog (`using-superpowers` is the
entry-point skill) and are loadable with the `skill` tool.

A successful install looks like this:

![Installation success screenshot](static/install-success.png)

### Using another profile (headless / tui / custom)

Point `--profile` at whichever profile you run:

```sh
dsh plugin --profile headless add superpowers-dsh
dsh --profile headless --dump-config
```

### Uninstall

```sh
dsh plugin --profile web remove superpowers-dsh
# then restart the profile again
```

### Notes

- Installers in mainland China can set the npm mirror first — it makes `dsh
  plugin add superpowers-dsh` fast:
  `npm config set registry https://registry.npmmirror.com`
- A plugin installed from a folder or `file:` spec is linked, not copied:
  changes to that folder take effect after the next profile restart.
- Consumers need **no npm account and no 2FA** — installing is a plain
  package download.

## Versions and compatibility

| This plugin | Skills baseline (upstream obra/superpowers) | DSH it targets | Notes |
| --- | --- | --- | --- |
| **0.2.0** (this repo, GitHub install) | v6.4.2 | DSH ≥ 0.2.0-rc.2 (desktop builds included) | 15 skills + a `SessionStart` hook for auto-invocation via `dsh-hooks-claude-code` |
| 0.1.0 (npm `superpowers-dsh`, published by LayneChai) | v6.3.0 | early DSH | no hook, fewer skills; the npm package is **not** in sync with this fork |

Known limits, as reported (see the repo issues):

- **An already-open session does not pick up the new skills**: the skill
  provider registers at **profile boot**. If you install the plugin mid-session,
  that session's skill catalog is already fixed — restart the profile and open
  a new session (reported as issue #5).
- **DSH Desktop boot timeout (issue #3)**: the reporter was on 0.1.0, and the
  30 s timeout is the renderer failing to report boot health. This repo cannot
  reproduce that multi-plugin composition locally. Two local checks:
  1. `dsh --profile web --dump-config` to confirm only the plugins you expect
     are composed;
  2. run this repo's `scripts/check.mjs` and `test/provider.test.mjs` to prove
     the provider itself is healthy.
  Measured boot cost: `list()` reads only each skill's frontmatter region
  (≤16 KB per skill) and never pulls skill bodies into memory.
- **Version support statement**: this repo tracks the upstream skills baseline;
  on the DSH side it depends only on the `ctx.skills` provider protocol
  (`registerProvider` / `list` / `get`) and pins no specific DSH version. If
  `dsh --profile <p> --dump-config` lists a `superpowers-dsh` row, the layer is
  composed.

Self-check (zero dependencies — run it after any change):

```sh
node scripts/check.mjs        # skills tree + porting invariants + hook + manifest + provider contract
node test/provider.test.mjs   # the provider contract regression test on its own
```

## Skills

| Skill | Purpose |
| --- | --- |
| `using-superpowers` | How to find and use skills; the entry-point skill |
| `diagnosing-superpowers` | Diagnose why a session went wrong (repeated work, ignored plans, time/time-cost surprises) and build a report for the maintainers |
| `brainstorming` | Turn ideas into designs through collaborative dialogue |
| `writing-plans` | Write comprehensive implementation plans from specs |
| `executing-plans` | Execute the plan yourself in this session (native execution: task ledger + one whole-branch review at the end) |
| `subagent-driven-development` | Dispatch fresh subagents per task with reviews |
| `dispatching-parallel-agents` | Fan independent work out across parallel agents |
| `systematic-debugging` | Root-cause-first debugging discipline |
| `test-driven-development` | RED-GREEN-REFACTOR implementation loop |
| `verification-before-completion` | Evidence before success claims |
| `requesting-code-review` | Get rigorous review before merging |
| `receiving-code-review` | Verify feedback instead of blindly implementing it |
| `finishing-a-development-branch` | Integrate completed work safely |
| `using-git-worktrees` | Isolated workspaces for feature work |
| `writing-skills` | Author and validate new skills TDD-style |

## How it works

- **Bundle layer** — `cordis.patch.yml` inserts one row
  (`- id: superpowers-dsh, name: superpowers-dsh`) over the dsh-base layer.
  Later layers (the profile's `cordis.patch.yml`, `--patch` overlays) can
  still address that row by id.
- **Provider** — `lib/index.js` calls `ctx.skills.registerProvider(...)`
  with a provider that:
  - `list()` scans the package's `skills/` directory for
    `<name>/SKILL.md` bundles and returns candidates parsed from YAML
    frontmatter (`name`, `description`, `whenToUse`).
  - `get()` reads the winning candidate's body on demand and returns a
    full skill definition with `resourceBase` pointing at the skill's
    directory, so relative references (scripts, prompt templates) resolve.
- **Zero runtime dependencies** — the plugin imports only Node built-ins and
  consumes the injected `ctx.skills` service interface.

## Auto-invocation (optional)

Upstream uses a `SessionStart` hook on Claude Code to inject the full
`using-superpowers` body into session context. This plugin only registers the
skill catalog, so by default a session starts **without** that injection — the
model has to see the catalog and choose to call `skill` itself. DSH ships a
Claude Code hooks bridge, so adding this to your profile's `cordis.patch.yml`
restores upstream behavior:

```yaml
- insert:
    - id: hooks-claude-code
      name: '@deepseek-ai/dsh-hooks-claude-code'
      config:
        configPath: <package path>/hooks/hooks.json
        pluginRoot: <package path>
```

```sh
dsh plugin --profile <your-profile> add @deepseek-ai/dsh-hooks-claude-code@0.2.0-rc.2
```

Two gotchas: the patch entry must use the `insert:` form (a non-insert entry
needs an `id` to retarget an existing row, and a `name`-only entry is skipped);
and `hooks/session-start.mjs` is a Node implementation (runs everywhere, no
bash needed) emitting `hookSpecificOutput.additionalContext`.

## Porting notes (vs. upstream obra/superpowers)

- Namespace prefixes removed: `superpowers:brainstorming` → `brainstorming`
  (DSH skills are addressed by bare name).
- `using-superpowers` now documents the DSH `skill` tool and points at
  `skills/using-superpowers/references/dsh-tools.md`, a full Claude-Code →
  DSH tool mapping (`pwsh`, `subagent`, `workflow`, `goal`, ...).
- Subagent references map to DSH's `subagent` / `subagent_fork` tools.
- `brainstorming`'s visual companion adds a Windows note: the Node server
  (`scripts/server.cjs`) runs everywhere; the `.sh` helpers are bash-only.
- **Skills baseline: obra/superpowers v6.4.2.** Upstream rewrote
  `executing-plans` as native execution (task ledger, `task-start` /
  `task-done` scripts, one whole-branch review at the end) and added
  `diagnosing-superpowers`; this package re-applied every DSH adaptation on
  top (bare skill names, `subagent` / `subagent_fork` wording, pointers to
  `dsh-tools.md`).
- Upstream's per-harness tool references (Claude Code, Codex, Pi, Antigravity,
  Hermes, Muse) are not shipped here; this bundle carries only the DSH
  mapping, `references/dsh-tools.md`.

## Weekly self-maintenance

The repo carries its own maintenance loop, triggered weekly by a local scheduled
task (or run by hand):

- `scripts/check.mjs` — dependency-free self-check: skill tree integrity,
  leftover namespace prefixes, merge markers, hook executability, package
  manifest, provider contract regression test. Run it before and after any
  change; exit code 0 is the bar, and the maintenance task uses it as its TDD
  entry point.
- `test/provider.test.mjs` — provider contract regression test (`node:test`, no
  dependencies): `list()` must cost frontmatter bytes rather than skill-body
  bytes, and `get()` must return the full body plus a directory resource base.
- `.maintenance/weekly-task.md` — the maintenance handbook, the executing
  agent's only source of truth: check → handle PRs/issues → fix bugs → align
  with upstream → write a report.
- `.maintenance/state.md` — the upstream alignment baseline (currently v6.4.2);
  the task reads it to decide whether there is anything new.
- `scripts/weekly-maintenance.ps1` — driver script: runs the handbook through
  headless dsh; logs land in `.maintenance/logs/` (gitignored), reports in
  `.maintenance/reports/`.
- Scheduled task name: `superpowers-dsh-weekly-maintenance` (Sundays 03:00).

Run it by hand:

```powershell
pwsh -File scripts/weekly-maintenance.ps1
```

Boundaries: the task works on branches and opens PRs only — it never pushes to
main, never tags or publishes a release, and never adds a runtime dependency.
Version bumps and releases stay a human decision; after merging a new upstream
tag, update the baseline in `.maintenance/state.md`.

## Staying in sync with upstream

This repo has three remotes: `origin` (this fork), `source` (LayneChai's port)
and `upstream` (obra/superpowers). To move to a newer upstream release:

```sh
git fetch upstream --tags
git diff --stat v6.4.2 <new-tag> -- skills    # see the change surface first
```

Then take the new upstream tag as the base and re-apply the DSH adaptations:
strip the `superpowers:` namespace prefixes, add the `**Note:** On the DeepSeek
Harness ...` note, and drop the non-DSH references. The `vendor` branch keeps
the last merge (v6.3.0 base → 0.1.0 port → v6.4.2 merge) as a template.

## Adding your own skills

Drop a new `skills/<kebab-name>/SKILL.md` into this package — it must start
with a YAML frontmatter block (`name` + `description`, optionally
`whenToUse`). No code change needed: `list()` discovers it automatically.

## License

MIT. Skill content adapted from
[obra/superpowers](https://github.com/obra/superpowers) (MIT), © Jesse Vincent
and contributors.
