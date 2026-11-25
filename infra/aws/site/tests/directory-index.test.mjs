import { accessSync, existsSync, readFileSync, readdirSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'

const out = new URL('../../../../out/', import.meta.url)
const code = readFileSync(
  new URL('../directory-index.js.tftpl', import.meta.url),
  'utf8',
)
const handler = runInNewContext(`${code}\nhandler`)
const rewrite = (uri) => handler({ request: { uri } }).uri

test('serves exported directory indexes without enabling clean URLs', () => {
  assert.equal(rewrite('/'), '/index.html')
  assert.equal(rewrite('/nested/'), '/nested/index.html')

  for (const route of ['/index', '/404', '/index.html/']) {
    const path = new URL(`.${rewrite(route)}`, out)
    assert.equal(existsSync(path), false)
  }
})

test('preserves paths to real HTML, RSC and asset files in the Next export', () => {
  for (const file of ['index.html', '404.html', 'index.txt', 'favicon.ico']) {
    assert.equal(rewrite(`/${file}`), `/${file}`)
    accessSync(new URL(file, out))
  }

  const chunks = new URL('_next/static/chunks/', out)
  const asset = readdirSync(chunks).find((file) => file.endsWith('.js'))
  assert.ok(asset)
  const path = `/_next/static/chunks/${asset}`
  assert.equal(rewrite(path), path)
  accessSync(new URL(`.${path}`, out))
})
