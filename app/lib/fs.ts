// app/lib/fs.ts — filesystem guards used by content parsers.

import path from "path"

export function isPathContained(targetPath: string, baseDir: string): boolean {
  const resolved = path.resolve(targetPath)
  const base = path.resolve(baseDir)
  return resolved === base || resolved.startsWith(base + path.sep)
}
