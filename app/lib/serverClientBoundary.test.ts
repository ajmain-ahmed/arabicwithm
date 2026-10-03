// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(path.join(dir, entry.name))
      : entry.name.endsWith(".tsx") && !entry.name.includes(".test.")
        ? [path.join(dir, entry.name)]
        : [],
  );
}
it("keeps Next Link function props behind a client boundary throughout the site", () => {
  const violations: string[] = [];
  for (const file of files("app")) {
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    if (
      source.statements.some(
        (node) =>
          ts.isExpressionStatement(node) &&
          ts.isStringLiteral(node.expression) &&
          node.expression.text === "use client",
      )
    )
      continue;
    const linkImports = source.statements
      .filter(ts.isImportDeclaration)
      .filter(
        (node) =>
          ts.isStringLiteral(node.moduleSpecifier) &&
          node.moduleSpecifier.text === "next/link",
      )
      .map((node) => node.importClause?.name?.text)
      .filter(Boolean);
    function visit(node: ts.Node) {
      if (
        ts.isJsxAttribute(node) &&
        node.name.getText(source) === "component" &&
        node.initializer &&
        ts.isJsxExpression(node.initializer) &&
        node.initializer.expression &&
        ts.isIdentifier(node.initializer.expression) &&
        linkImports.includes(node.initializer.expression.text)
      )
        violations.push(
          file + ":" + source.getLineAndCharacterOfPosition(node.pos).line,
        );
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  expect(violations).toEqual([]);
});
