#!/usr/bin/env node
// superpowers-dsh SessionStart hook.
//
// Injects the full body of the using-superpowers skill as session context,
// mirroring what upstream obra/superpowers does with its bash
// hooks/session-start on Claude Code. Written in Node so it runs unchanged on
// Windows and POSIX hosts (DSH has no bash requirement).
//
// Output shape: Claude Code's hookSpecificOutput.additionalContext. The DSH
// bridge (@deepseek-ai/dsh-hooks-claude-code) speaks the Claude Code command
// -hook protocol, so that is the field it consumes.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const skillPath = join(here, '..', 'skills', 'using-superpowers', 'SKILL.md')

let body
try {
  body = readFileSync(skillPath, 'utf8')
} catch (error) {
  // A missing skill must never break session boot: warn and inject nothing.
  process.stderr.write(`superpowers-dsh session-start: cannot read ${skillPath}: ${error.message}\n`)
  process.exit(0)
}

const context = [
  '<EXTREMELY-IMPORTANT>',
  'You have superpowers.',
  '',
  "**Below is the full content of your 'using-superpowers' skill - your introduction to using skills. For all other skills, use the 'skill' tool:**",
  '',
  body,
  '</EXTREMELY-IMPORTANT>'
].join('\n')

process.stdout.write(`${JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context } })}\n`)