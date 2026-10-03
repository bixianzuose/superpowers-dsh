// superpowers-dsh: Superpowers skills for the DeepSeek Harness.
//
// A Cordis plugin that registers one skill provider into the HOST layer of the
// `ctx.skills` registry, so every agent preset's scope chain merges these
// skills. Skill bodies live in `../skills/<name>/SKILL.md` inside this
// package; the provider locates them from `import.meta.url` (an assembly
// fact of this package, never user config) and loads bodies on demand.
//
// The provider protocol mirrors @deepseek-ai/dsh-skill-filesystem:
//   - list()  discovers directory-bundle candidates (name/description from
//     YAML frontmatter, body left on disk until requested)
//   - get()   parses the winning candidate's SKILL.md and returns the full
//     definition with a directory resource base for relative references
//
// Boot cost matters here: a profile boot calls list() once per skill
// consumer, so discovery reads at most FRONTMATTER_MAX_BYTES per skill
// instead of pulling every body into memory. list() must stay O(skills x
// frontmatter), never O(total skill bytes).
//
// @module superpowers-dsh
import { readdir, readFile } from 'node:fs/promises'
import { readSync, openSync, closeSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const name = 'superpowers-dsh'
const inject = ['skills']

/** Registry precedence for packaged skill providers: ranks below the local bundled root. */
const PACKAGED_SKILL_RANK = 550

/** The source bucket these skills advertise under (prompt-visible metadata). */
const SOURCE = 'custom'

/**
 * Upper bound on the bytes discovery reads from one SKILL.md. Frontmatter for
 * every skill in this package fits far below this; a file whose frontmatter
 * does not close inside the bound is reported as "no frontmatter" rather than
 * dragging the whole body through memory.
 */
const FRONTMATTER_MAX_BYTES = 16 * 1024

/** Frontmatter fields discovery publishes; anything else is scalar metadata. */
const DISCOVERY_FIELDS = new Set(['name', 'description', 'whenToUse'])

/**
 * Parse a YAML frontmatter block into metadata plus body.
 * Handles only the scalar fields DSH skill discovery consumes (name,
 * description, whenToUse); richer metadata passes through verbatim.
 * @param text - the raw skill file contents.
 * @returns parsed metadata object and the markdown body after the block, or
 *   null when the file has no frontmatter block at all.
 */
function parseFrontmatter(text) {
  if (!text.startsWith('---')) return null
  const end = text.indexOf('\n---', 3)
  if (end === -1) return null
  const block = text.slice(3, end)
  const body = text.slice(end + 4).replace(/^\n+/, '')
  const metadata = {}
  for (const line of block.split('\n')) {
    const match = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line.trim())
    if (!match) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    metadata[match[1]] = value
  }
  return { metadata, body }
}

/**
 * Read one SKILL.md, but never more than the frontmatter needs.
 *
 * Reads the file in FRONTMATTER_MAX_BYTES-sized chunks and stops as soon as
 * the closing `---` of the frontmatter block is in hand. A trailing chunk may
 * run past the delimiter, so the result does not depend on chunk alignment.
 *
 * @param skillFile - absolute path to the SKILL.md file.
 * @param options - `body: true` also returns the markdown body after the
 *   frontmatter (used by get()); default reads metadata only.
 * @param signal - optional cancellation; aborts between chunks.
 * @returns `{ metadata, body, bytesRead }`, or null when the file cannot be
 *   read or carries no frontmatter block.
 */
async function readFrontmatter(skillFile, options = {}, signal) {
  const { body = false } = options

  // get() path: the caller asked for the body, so one whole-file read is the
  // cheapest correct answer — no chunk stitching involved.
  if (body) {
    let whole
    try {
      whole = await readFile(skillFile, 'utf8')
    } catch {
      return null
    }
    if (signal?.aborted) return null
    const parsed = parseFrontmatter(whole)
    if (parsed === null) return null
    return { metadata: parsed.metadata, body: parsed.body, bytesRead: Buffer.byteLength(whole) }
  }

  // list() path: read a bounded prefix and stop at the closing delimiter.
  let fd
  try {
    fd = openSync(skillFile, 'r')
  } catch {
    return null
  }
  try {
    const buffer = Buffer.allocUnsafe(FRONTMATTER_MAX_BYTES)
    let bytesRead = 0
    let text = ''
    for (;;) {
      if (signal?.aborted) return null
      const chunk = readSync(fd, buffer, 0, buffer.length, null)
      if (chunk <= 0) break
      text += buffer.toString('utf8', 0, chunk)
      bytesRead += chunk
      if (!text.startsWith('---')) return null
      const at = text.indexOf('\n---', 3)
      if (at !== -1) {
        const metadata = parseFrontmatter(text.slice(0, at + 4))?.metadata ?? {}
        return { metadata, body: '', bytesRead }
      }
      // A chunk edge can split a multi-byte character, leaving a replacement
      // character in `text`. Frontmatter here is plain ASCII, so a stray
      // U+FFFD only means the delimiter itself was split: drop it and let the
      // next chunk (which re-reads those bytes) finish the match.
      if (text.endsWith('\ufffd')) {
        text = text.slice(0, -1)
        bytesRead -= 3
      }
      if (bytesRead >= FRONTMATTER_MAX_BYTES * 4) return null // runaway guard
    }
    return null
  } catch {
    return null
  } finally {
    closeSync(fd)
  }
}

/**
 * Discover packaged skill candidates by scanning a `skills/` directory: one
 * subdirectory per skill, each carrying a SKILL.md.
 * @param skillsRoot - absolute path to the skills directory.
 * @param signal - optional cancellation.
 * @returns the candidate list.
 */
async function discoverCandidates(skillsRoot, signal) {
  let entries
  try {
    entries = await readdir(skillsRoot, { withFileTypes: true })
  } catch {
    return []
  }
  const candidates = []
  for (const entry of entries) {
    if (signal?.aborted) break
    if (!entry.isDirectory()) continue
    const skillDir = join(skillsRoot, entry.name)
    const skillFile = join(skillDir, 'SKILL.md')
    const parsed = await readFrontmatter(skillFile, {}, signal)
    if (parsed === null) continue
    const { metadata } = parsed
    if (!metadata.name) continue
    candidates.push({
      name: metadata.name,
      description: metadata.description ?? '',
      ...(metadata.whenToUse !== undefined ? { whenToUse: metadata.whenToUse } : {}),
      invocation: { modelInvocable: true, userInvocable: true },
      source: SOURCE,
      provider: name,
      rank: PACKAGED_SKILL_RANK,
      locator: skillDir,
      path: skillFile
    })
  }
  return candidates
}

/**
 * Build the provider object for one skills root. Exported so the contract can
 * be tested against a fixture tree without touching the packaged skills.
 * @param skillsRoot - absolute path to a skills directory.
 * @returns the ctx.skills provider definition.
 */
function createProvider(skillsRoot) {
  return {
    name,
    async list(options = {}) {
      return discoverCandidates(skillsRoot, options.signal)
    },
    async get(candidate, options = {}) {
      const parsed = await readFrontmatter(candidate.path, { body: true }, options.signal)
      if (parsed === null) return undefined
      const { metadata } = parsed
      return {
        name: metadata.name ?? '',
        description: metadata.description ?? '',
        ...(metadata.whenToUse !== undefined ? { whenToUse: metadata.whenToUse } : {}),
        invocation: { modelInvocable: true, userInvocable: true },
        source: SOURCE,
        provider: name,
        resourceBase: { kind: 'directory', path: candidate.locator },
        path: candidate.path,
        ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
        content: parsed.body
      }
    }
  }
}

/** Register the packaged superpowers provider on `ctx.skills`. */
function apply(ctx) {
  const skillsRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills')
  ctx.skills.registerProvider(() => createProvider(skillsRoot))
}

export { apply, name, inject, createProvider, readFrontmatter, parseFrontmatter, FRONTMATTER_MAX_BYTES }
export default { apply, name, inject }
