import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { cacheControlFor, publishExport } from '../publish.mjs'

test('only the Firebase fingerprint patterns get immutable cache headers', () => {
  for (const key of [
    '_next/static/chunks/abcdefghijkl-.css',
    '_next/static/chunks/turbopack-abcdefghijkl-.js',
    '_next/static/media/portrait.abcdefghijkl-.jpeg',
  ]) {
    assert.equal(cacheControlFor(key), 'public, max-age=31536000, immutable')
  }
  for (const key of [
    'index.html',
    '_next/static/chunks/short.js',
    '_next/static/media/portrait.abcdefghijkl-.avif',
    '_next/static/build/_buildManifest.js',
  ]) {
    assert.equal(cacheControlFor(key), undefined)
  }
})

test('publishes the real export, preserves old fingerprints, and invalidates after cleanup', () => {
  const directory = fileURLToPath(new URL('../../../../out/', import.meta.url))
  const calls = []
  publishExport(directory, 'example-site', 'EXAMPLE', (args) => {
    calls.push(args)
    switch (args[1]) {
      case 'list-objects-v2':
        return JSON.stringify({
          Contents: [
            { Key: 'index.html' },
            { Key: 'removed.html' },
            { Key: '_next/static/chunks/abcdefghijkl-.js' },
          ],
        })
      case 'delete-objects':
        assert.deepEqual(JSON.parse(args.at(-1)).Objects, [
          { Key: 'removed.html' },
        ])
        return '{}'
      case 'create-invalidation':
        return '{"Invalidation":{"Id":"EXAMPLE-INVALIDATION"}}'
      default:
        return ''
    }
  })

  const firstMutable = calls.findIndex((args) => args.includes('max-age=3600'))
  assert.ok(firstMutable > 0)
  assert.ok(
    calls
      .slice(0, firstMutable)
      .every((args) => args.includes('public, max-age=31536000, immutable')),
  )
  assert.ok(
    calls.some(
      (args) =>
        args.includes('s3://example-site/404.html') &&
        args.includes('max-age=3600'),
    ),
  )
  assert.deepEqual(
    calls.slice(-4).map((args) => args[1]),
    ['list-objects-v2', 'delete-objects', 'create-invalidation', 'wait'],
  )
})
