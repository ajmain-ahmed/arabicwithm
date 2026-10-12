import { appendFileSync } from 'node:fs'
const output = 'docs/validation/website-troubleshooting/unit-progress.log'
export default class DiagnosticReporter {
  onTestModuleQueued(module) { appendFileSync(output, `Queued ${module.moduleId}\n`) }
  onTestModuleStart(module) { appendFileSync(output, `Started ${module.moduleId}\n`) }
  onTestCaseReady(test) { appendFileSync(output, `Running ${test.fullName}\n`) }
  onTestModuleEnd(module) { appendFileSync(output, `Finished ${module.moduleId}\n`) }
}
