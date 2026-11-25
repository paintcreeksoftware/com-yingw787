import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const firebase = JSON.parse(
  readFileSync(new URL('../../../firebase.json', import.meta.url), 'utf8'),
)
const assetRules = firebase.hosting.headers.flatMap(({ regex, headers }) => {
  const cacheControl = headers.find(({ key }) => key === 'Cache-Control')
  return regex && cacheControl
    ? [{ pattern: new RegExp(regex), value: cacheControl.value }]
    : []
})

export function cacheControlFor(key) {
  return assetRules.find(({ pattern }) => pattern.test(`/${key}`))?.value
}

function keysIn(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') {
      return []
    }
    const key = `${prefix}${entry.name}`
    if (entry.isDirectory()) {
      return keysIn(resolve(directory, entry.name), `${key}/`)
    }
    return entry.isFile() ? [key] : []
  })
}

function callAws(args) {
  return execFileSync('aws', args, { encoding: 'utf8' })
}

export function publishExport(
  directory,
  bucket,
  distributionId,
  aws = callAws,
) {
  const keys = new Set(keysIn(directory))
  if (!keys.has('index.html') || !keys.has('404.html')) {
    throw new Error('The Next.js export must contain index.html and 404.html.')
  }

  const origin = `s3://${bucket}`
  const upload = (key, cacheControl) =>
    aws([
      's3',
      'cp',
      resolve(directory, key),
      `${origin}/${key}`,
      '--cache-control',
      cacheControl,
      '--only-show-errors',
    ])

  for (const key of keys) {
    const cacheControl = cacheControlFor(key)
    if (cacheControl) {
      upload(key, cacheControl)
    }
  }
  for (const key of keys) {
    if (!cacheControlFor(key)) {
      upload(key, 'max-age=3600')
    }
  }

  const { Contents = [] } = JSON.parse(
    aws(['s3api', 'list-objects-v2', '--bucket', bucket, '--output', 'json']),
  )
  const staleKeys = Contents.filter(
    ({ Key }) => !keys.has(Key) && !cacheControlFor(Key),
  )
  for (let start = 0; start < staleKeys.length; start += 1000) {
    const { Errors = [] } = JSON.parse(
      aws([
        's3api',
        'delete-objects',
        '--bucket',
        bucket,
        '--output',
        'json',
        '--delete',
        JSON.stringify({
          Objects: staleKeys
            .slice(start, start + 1000)
            .map(({ Key }) => ({ Key })),
          Quiet: true,
        }),
      ]),
    )
    if (Errors.length > 0) {
      throw new Error(
        `Could not delete stale S3 objects: ${JSON.stringify(Errors)}`,
      )
    }
  }

  const { Invalidation } = JSON.parse(
    aws([
      'cloudfront',
      'create-invalidation',
      '--distribution-id',
      distributionId,
      '--paths',
      '/*',
      '--output',
      'json',
    ]),
  )
  aws([
    'cloudfront',
    'wait',
    'invalidation-completed',
    '--distribution-id',
    distributionId,
    '--id',
    Invalidation.Id,
  ])
}

if (import.meta.main) {
  const { SITE_BUCKET, DISTRIBUTION_ID } = process.env
  if (!SITE_BUCKET || !DISTRIBUTION_ID) {
    throw new Error('Set SITE_BUCKET and DISTRIBUTION_ID before publishing.')
  }
  publishExport(
    resolve(import.meta.dirname, '../../../out'),
    SITE_BUCKET,
    DISTRIBUTION_ID,
  )
}
