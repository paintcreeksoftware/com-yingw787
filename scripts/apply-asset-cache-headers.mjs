import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable'

const FINGERPRINTED_ASSET_DIRS = [
  {
    dir: '_next/static/chunks',
    pattern:
      /^\/_next\/static\/chunks\/(?:turbopack-)?[a-z0-9_-]{13}\.(?:js|css)$/,
  },
  {
    dir: '_next/static/media',
    pattern:
      /^\/_next\/static\/media\/[^/]+\.[a-z0-9_-]{13}\.(?:avif|ico|jpeg|png|svg|webp)$/,
  },
]

export function collectFingerprintedAssets(outDir) {
  const assets = []

  for (const { dir, pattern } of FINGERPRINTED_ASSET_DIRS) {
    const fullDir = path.join(outDir, dir)
    if (!existsSync(fullDir)) {
      continue
    }
    for (const entry of readdirSync(fullDir, { withFileTypes: true })) {
      if (!entry.isFile()) {
        continue
      }
      const urlPath = `/${dir}/${entry.name}`
      if (pattern.test(urlPath)) {
        assets.push(urlPath)
      }
    }
  }

  return assets.sort()
}

export function buildFirebaseConfigWithAssetHeaders(baseConfig, outDir) {
  const assets = collectFingerprintedAssets(outDir)
  if (assets.length === 0) {
    throw new Error(
      `No fingerprinted assets found under ${outDir}/_next/static; run npm run build first.`,
    )
  }

  const existingHeaders = (baseConfig.hosting?.headers ?? []).filter((rule) => {
    const isExactAssetRule =
      typeof rule.source === 'string' &&
      FINGERPRINTED_ASSET_DIRS.some(({ pattern }) => pattern.test(rule.source))
    return !isExactAssetRule
  })

  const assetHeaderRules = assets.map((source) => ({
    source,
    headers: [
      {
        key: 'Cache-Control',
        value: IMMUTABLE_CACHE_CONTROL,
      },
    ],
  }))

  return {
    ...baseConfig,
    hosting: {
      ...baseConfig.hosting,
      headers: [...existingHeaders, ...assetHeaderRules],
    },
  }
}

function parseArgs(argv) {
  const options = {
    configPath: 'firebase.json',
    outDir: 'out',
    outputPath: null,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    const next = argv[i + 1]
    if (arg === '--config' && next) {
      options.configPath = next
      i += 1
    } else if (arg === '--out-dir' && next) {
      options.outDir = next
      i += 1
    } else if (arg === '--output' && next) {
      options.outputPath = next
      i += 1
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`)
    }
  }

  return options
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const { configPath, outDir, outputPath } = parseArgs(process.argv.slice(2))
  const baseConfig = JSON.parse(readFileSync(configPath, 'utf8'))
  const updatedConfig = buildFirebaseConfigWithAssetHeaders(baseConfig, outDir)
  writeFileSync(
    outputPath ?? configPath,
    `${JSON.stringify(updatedConfig, null, 2)}\n`,
  )
}
