#!/usr/bin/env node
// 仓库自检：技能树完整性 + DSH 移植不变量 + hook 可用性。
// 退出码 0 = 全部通过；非 0 = 有失败项（失败项打印在 FAIL 行）。
// 这是维护任务与人工改动的共同验收入口，不依赖任何第三方包。
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const failures = []
const passes = []
const bad = (m) => failures.push(m)
const ok = (m) => passes.push(m)

const TEXT_EXT = new Set(['.md', '.mjs', '.cjs', '.js', '.json', '.yml', '.yaml', '.sh', '.ts', '.html', '.dot', '.txt'])
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = join(dir, e.name)
  if (e.isDirectory()) return e.name === '.git' || e.name === 'node_modules' ? [] : walk(p)
  return [p]
})

// ---- 1. 技能树 ----
const EXPECTED_SKILLS = 15
const skillsDir = join(root, 'skills')
const dirs = readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
if (dirs.length !== EXPECTED_SKILLS) bad(`skills/ 下目录数 ${dirs.length}，期望 ${EXPECTED_SKILLS}`)
for (const d of dirs) {
  const file = join(skillsDir, d, 'SKILL.md')
  if (!existsSync(file)) { bad(`${d}: 缺 SKILL.md`); continue }
  const text = readFileSync(file, 'utf8')
  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  if (!front) { bad(`${d}: 缺 YAML frontmatter`); continue }
  const name = /(?:^|\n)name:[ \t]*(.+)/.exec(front[1])?.[1]?.trim()
  const desc = /(?:^|\n)description:[ \t]*(.+)/.exec(front[1])?.[1]?.trim()
  if (!name) bad(`${d}: frontmatter 缺 name`)
  else if (name !== d) bad(`${d}: frontmatter name="${name}" 与目录名不符`)
  if (!desc || desc.length < 20) bad(`${d}: description 缺失或过短`)
}
ok(`技能树：${dirs.length} 个技能，frontmatter 齐备`)

// ---- 2. 不变量：无命名空间前缀 / 无冲突标记 ----
const scoped = ['skills', 'hooks']
let prefixHits = 0
let conflictHits = 0
for (const sub of scoped) {
  for (const f of walk(join(root, sub))) {
    if (!TEXT_EXT.has(extname(f))) continue
    const t = readFileSync(f, 'utf8')
    if (/superpowers:[a-z]/.test(t)) { bad(`${f.replace(root + '\\', '')}: 残留命名空间前缀 superpowers:`); prefixHits++ }
    if (/^(<<<<<<<|>>>>>>>)/m.test(t)) { bad(`${f.replace(root + '\\', '')}: 残留合并冲突标记`); conflictHits++ }
  }
}
if (!prefixHits) ok('不变量：无 superpowers: 命名空间前缀残留')
if (!conflictHits) ok('不变量：无合并冲突标记')

// ---- 3. hook ----
const hooksJson = join(root, 'hooks', 'hooks.json')
if (!existsSync(hooksJson)) bad('hooks/hooks.json 缺失')
else {
  try {
    const cfg = JSON.parse(readFileSync(hooksJson, 'utf8'))
    if (!cfg.hooks?.SessionStart?.length) bad('hooks.json 未声明 SessionStart')
    else ok('hook 配置：SessionStart 已声明')
  } catch (e) { bad(`hooks.json 不是合法 JSON: ${e.message}`) }
}
const hookScript = join(root, 'hooks', 'session-start.mjs')
if (!existsSync(hookScript)) bad('hooks/session-start.mjs 缺失')
else {
  try {
    const out = execFileSync(process.execPath, [hookScript], { encoding: 'utf8', timeout: 20000 })
    const payload = JSON.parse(out)
    const ctx = payload?.hookSpecificOutput?.additionalContext
    if (typeof ctx !== 'string' || ctx.length < 1000) bad(`hook 输出异常：additionalContext 长度 ${ctx?.length ?? 'null'}`)
    else if (!ctx.includes('<EXTREMELY-IMPORTANT>')) bad('hook 输出缺少 <EXTREMELY-IMPORTANT> 包装')
    else ok(`hook 可执行：注入 ${ctx.length} 字符`)
  } catch (e) { bad(`hook 执行失败: ${e.message}`) }
}

// ---- 4. 包清单 ----
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
for (const need of ['lib', 'skills', 'hooks']) {
  if (!pkg.files?.includes(need)) bad(`package.json files 缺 "${need}"（打包会漏）`)
}
if (!/^\d+\.\d+\.\d+$/.test(pkg.version ?? '')) bad(`package.json version 不是语义化版本: ${pkg.version}`)
if (!pkg.dsh?.bundle?.patch) bad('package.json 缺 dsh.bundle.patch（不会成为 profile 层）')
ok(`包清单：${pkg.name}@${pkg.version}`)

// ---- 4b. 版本一致性 ----
// state.md 记录的"本仓库发布版本"是人手维护的；它与 package.json 一旦脱钩就会静默漂移
// （2026-10-04 实测：发布 v0.2.1 后 state.md 仍停在 0.2.0）。纯文本比对，不依赖 git/网络。
const stateFile = join(root, '.maintenance', 'state.md')
if (!existsSync(stateFile)) bad('.maintenance/state.md 缺失')
else {
  const released = /本仓库发布版本：\*\*v?([\d.]+)\*\*/.exec(readFileSync(stateFile, 'utf8'))?.[1]
  if (!released) bad('state.md 缺「本仓库发布版本」记录')
  else if (released !== pkg.version) bad(`state.md 发布版本 v${released} 与 package.json ${pkg.version} 不一致（发布后未同步基线）`)
  else ok(`版本一致：state.md 与 package.json 均为 ${pkg.version}`)
}

// ---- 5. 提供者契约（回归测试）----
// list() 的发现过程必须按 frontmatter 大小计费，而不是按技能正文大小；
// 这是 profile 启动成本与 issue #3（renderer 启动超时）直接相关的回归面。
const testFile = join(root, 'test', 'provider.test.mjs')
if (!existsSync(testFile)) bad('test/provider.test.mjs 缺失（提供者契约回归测试）')
else {
  try {
    const out = execFileSync(process.execPath, [testFile], {
      encoding: 'utf8',
      timeout: 120000,
      env: { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --no-warnings`.trim() }
    })
    const passLine = /^# pass (\d+)$/m.exec(out)?.[1]
    const failLine = /^# fail (\d+)$/m.exec(out)?.[1]
    if (failLine !== undefined && failLine !== '0') bad(`提供者契约测试失败 ${failLine} 项（见 node ${testFile} 输出）`)
    else ok(`提供者契约：list() 有界读取 + get() 正文完整${passLine ? `（${passLine} 项断言）` : ''}`)
  } catch (e) {
    const detail = `${e.stdout ?? ''}${e.stderr ?? ''}`
      .split('\n')
      .map((line) => (line.length > 160 ? `${line.slice(0, 160)}…` : line))
      .slice(-6)
      .join(' | ')
    bad(`提供者契约测试未通过: ${detail || e.message}`)
  }
}

// ---- 输出 ----
for (const p of passes) console.log(`PASS  ${p}`)
for (const f of failures) console.log(`FAIL  ${f}`)
console.log(`\n${passes.length} passed, ${failures.length} failed`)
process.exit(failures.length ? 1 : 0)