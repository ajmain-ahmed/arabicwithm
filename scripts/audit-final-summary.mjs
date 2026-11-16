import fs from 'node:fs'
import cp from 'node:child_process'

// Snapshot of the completed audit, not a replacement for running validation.
const root = 'docs/validation/full-reliability/'
const collect = args => cp.execFileSync('git', args, { encoding: 'utf8' }).trim().split('\n').filter(Boolean)
const previousManifest = fs.existsSync(root + 'changed-files.txt')
  ? fs.readFileSync(root + 'changed-files.txt', 'utf8').split(/\r?\n/).filter(path => /^(app|docs|e2e|scripts)\/|^playwright\./.test(path))
  : []
const files = [...new Set([
  ...previousManifest,
  ...collect(['diff', '--name-only']),
  ...collect(['ls-files', '--others', '--exclude-standard']),
  root + 'changed-files.txt', root + 'verification-summary.json',
])].sort()
fs.writeFileSync(root + 'changed-files.txt',
  'ArabicWithM reliability audit: working-tree file manifest\n\nApplication, test, runner and report files\n' +
  files.filter(path => !path.startsWith(root)).join('\n') + '\n\nGenerated audit evidence\n' +
  files.filter(path => path.startsWith(root)).join('\n') + '\n')
const outcomes = JSON.parse(fs.readFileSync(root + 'browser-results.json', 'utf8'))
fs.writeFileSync(root + 'verification-summary.json', JSON.stringify({
  auditDate: '2026-11-16',
  browserFinalOutcomes: outcomes.stats,
  browserScope: outcomes.audit?.scope ?? 'Single complete Chrome/Firefox production-build browser run; see browser-results.json.',
  unitTests: { passed: 1558, skipped: 6, filesPassed: 228, filesSkipped: 4 },
  finalAllowancePlaybackTests: { passed: 14, files: 2 },
  typescript: 'PASS', changedTypeScriptLint: 'PASS', cloudflareProductionBuild: 'PASS',
  applicationDeployed: false, migrationRequired: false, migrationApplied: false,
  productionDatabaseWrites: false,
  limitations: [
    'No existing canonical Grammar Notes or examples in production',
    'No supplied live authenticated free/premium/Admin sessions',
    'WebKit unavailable', 'Local vinext development parity blocked',
    'Two extended production discovery checks remain BLOCKED; raw evidence retained',
    'Unexercised route/control combinations marked BLOCKED',
  ],
}, null, 2) + '\n')
console.log(JSON.stringify({ manifestFiles: files.length, browser: outcomes.stats.expected }))
