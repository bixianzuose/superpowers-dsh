// Regression test for the skill provider's discovery pass.
//
// Why this exists: a profile boot calls list() once per skill consumer, and
// discovery only needs the YAML frontmatter fields (name / description /
// whenToUse). Reading whole SKILL.md bodies made boot cost scale with the
// largest skill body (33 KB today, unbounded tomorrow) and read every file
// into memory for nothing. This test pins the bounded-read contract.
//
// Run directly:            node test/provider.test.mjs
// Run under the runner:    node --test test/
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, mkdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { readFrontmatter, createProvider, FRONTMATTER_MAX_BYTES } from '../lib/index.js'

const repoRoot = join(fileURLToPath(import.meta.url), '..', '..')

async function withSkillDir(files, run) {
  const root = await mkdtemp(join(tmpdir(), 'spdsh-provider-'))
  try {
    for (const [name, content] of Object.entries(files)) {
      await mkdir(join(root, name), { recursive: true })
      await writeFile(join(root, name, 'SKILL.md'), content, 'utf8')
    }
    return await run(root)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

const meta = (name, extra = '') =>
  `---\nname: ${name}\ndescription: description for ${name}\nwhenToUse: use when testing ${name}\n${extra}---\n\n## Body\n\ntext\n`

test('readFrontmatter reads a bounded prefix and never the whole body', async () => {
  const bodyBytes = 64 * 1024 * 1024
  await withSkillDir(
    { huge: `---\nname: huge\ndescription: a skill with an enormous body\n---\n\n${'x'.repeat(bodyBytes)}\n` },
    async (root) => {
      const file = join(root, 'huge', 'SKILL.md')
      const size = (await stat(file)).size
      assert.ok(size > bodyBytes, 'fixture must be larger than the read bound')
      const parsed = await readFrontmatter(file)
      assert.equal(parsed.metadata.name, 'huge')
      assert.equal(parsed.metadata.description, 'a skill with an enormous body')
      assert.equal(parsed.body, '', 'discovery must not carry the body')
      assert.ok(
        parsed.bytesRead <= FRONTMATTER_MAX_BYTES,
        `read ${parsed.bytesRead} bytes, expected at most ${FRONTMATTER_MAX_BYTES}`
      )
    }
  )
})

test('readFrontmatter still parses a body when asked for one', async () => {
  await withSkillDir({ full: meta('full') }, async (root) => {
    const parsed = await readFrontmatter(join(root, 'full', 'SKILL.md'), { body: true })
    assert.equal(parsed.metadata.name, 'full')
    assert.match(parsed.body, /## Body/)
  })
})

test('readFrontmatter returns null without frontmatter and on a missing file', async () => {
  await withSkillDir({ bare: '# no frontmatter here\n' }, async (root) => {
    assert.equal(await readFrontmatter(join(root, 'bare', 'SKILL.md')), null)
    assert.equal(await readFrontmatter(join(root, 'nope', 'SKILL.md')), null)
  })
})

test('discovery lists frontmatter fields only — no body, no full metadata', async () => {
  await withSkillDir({ one: meta('one', 'license: MIT\n'), two: meta('two') }, async (root) => {
    const provider = createProvider(root)
    const candidates = await provider.list({})
    const names = candidates.map((c) => c.name).sort()
    assert.deepEqual(names, ['one', 'two'])

    const one = candidates.find((c) => c.name === 'one')
    assert.equal(one.description, 'description for one')
    assert.equal(one.whenToUse, 'use when testing one')
    assert.equal(one.content, undefined, 'list() must not return bodies')
    assert.equal(one.metadata, undefined, 'list() must stay frontmatter-scalar only')
    assert.equal(one.locator, join(root, 'one'))
    assert.equal(one.provider, 'superpowers-dsh')
  })
})

test('get() returns the full body with a directory resource base', async () => {
  const provider = createProvider(join(repoRoot, 'skills'))
  const candidates = await provider.list({})
  assert.equal(candidates.length, 15)
  const candidate = candidates.find((c) => c.name === 'using-superpowers')
  const full = await provider.get(candidate, {})

  assert.equal(full.name, 'using-superpowers')
  assert.match(full.content, /using-superpowers/)
  assert.equal(full.content.startsWith('---'), false, 'body must not carry frontmatter')
  assert.deepEqual(full.resourceBase, { kind: 'directory', path: candidate.locator })
  assert.equal(typeof full.metadata, 'object')
})

test('discovery tolerates a non-directory, a SKILL.md-less dir and a broken file', async () => {
  await withSkillDir({ stray: '# not a skill directory\n' }, async (root) => {
    await writeFile(join(root, 'stray.txt'), 'ignored', 'utf8')
    await mkdir(join(root, 'empty-dir'), { recursive: true })
    const provider = createProvider(root)
    const candidates = await provider.list({})
    assert.deepEqual(candidates, [], 'no directory bundle => no candidates')
  })
})

test('a missing skills root yields an empty list instead of throwing', async () => {
  const provider = createProvider(join(tmpdir(), 'spdsh-does-not-exist-0000'))
  assert.deepEqual(await provider.list({}), [])
})
