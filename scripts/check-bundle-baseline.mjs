import { readFileSync } from 'node:fs'
import analyze from 'bundlewatch/lib/app/analyze/index.js'
import getConfig from 'bundlewatch/lib/app/config/getConfig.js'
import getLocalFileDetails from 'bundlewatch/lib/app/getLocalFileDetails/index.js'
import BundleWatchService from 'bundlewatch/lib/app/reporting/BundleWatchService/index.js'

const { bundlewatch } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
)
const config = getConfig.default(bundlewatch)
const { ci, bundlewatchServiceHost } = config
const service = new BundleWatchService.default({
  ...ci,
  bundlewatchServiceHost,
})
const baseBranchFileDetails = await service.getFileDetailsForBaseBranch()
const currentBranchFileDetails = getLocalFileDetails.default(config)
const baselineFiles = Object.values(baseBranchFileDetails ?? {})
const hasBaseline =
  baselineFiles.length > 0 &&
  baselineFiles.every((file) => Number.isFinite(file?.size) && file.size > 0)

const results = analyze.default({
  currentBranchFileDetails,
  baseBranchFileDetails: hasBaseline ? baseBranchFileDetails : {},
  baseBranchName: ci.repoBranchBase,
})

if (
  results.status !== 'fail' &&
  process.env.GITHUB_EVENT_NAME === 'push' &&
  process.env.GITHUB_REF === `refs/heads/${ci.repoBranchBase}`
) {
  await service.saveFileDetailsForCurrentBranch({
    fileDetailsByPath: currentBranchFileDetails,
    trackBranches: bundlewatch.ci.trackBranches,
  })
}

if (!hasBaseline) {
  process.stderr.write(
    `Bundlewatch FAIL: no usable baseline for ${ci.repoBranchBase}\n`,
  )
  process.exitCode = 1
} else {
  for (const result of results.fullResults) {
    const message =
      result.status === 'removed'
        ? result.message
        : `${result.filePath}: ${result.error ?? result.message}`
    process.stdout.write(`${message}\n`)
  }
  process.stdout.write(
    `Bundlewatch ${results.status.toUpperCase()} (baseline: ${ci.repoBranchBase}): ${results.summary}\n`,
  )
  process.exitCode = Number(results.status === 'fail')
}
