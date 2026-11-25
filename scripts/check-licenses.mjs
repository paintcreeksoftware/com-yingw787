import { execFileSync } from 'node:child_process'
import parseSpdx from 'spdx-expression-parse'
import isSpdxAllowed from 'spdx-whitelisted'
import policy from '../license-policy.json' with { type: 'json' }

const allowedLicenses = policy.licenses.spdx.map(parseSpdx)
const installed = JSON.parse(
  execFileSync(process.execPath, [process.env.npm_execpath, 'query', '.prod'], {
    encoding: 'utf8',
  }),
)
const dependencies = installed.filter(({ location }) => location !== '')

function allowsLicense(license) {
  if (typeof license !== 'string') {
    return false
  }

  let expression
  try {
    expression = parseSpdx(license)
  } catch {
    return false
  }
  return isSpdxAllowed(expression, allowedLicenses)
}

for (const { name, version, license } of dependencies) {
  if (
    Object.hasOwn(policy.packages, name) &&
    policy.packages[name] === version
  ) {
    continue
  }
  if (allowsLicense(license)) {
    continue
  }

  process.stderr.write(
    `${name}@${version}: license not allowed (${license ?? 'missing'})\n`,
  )
  process.exitCode = 1
}

if (!process.exitCode) {
  process.stdout.write(
    `Checked licenses for ${dependencies.length} production dependencies.\n`,
  )
}
