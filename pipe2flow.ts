import { resolve } from "jsr:@std/path";
import { walk } from "jsr:@std/fs/walk";
import { parse } from "npm:@babel/parser";
import { generate } from "npm:@babel/generator";
import traverse from "npm:@babel/traverse";
import t from "npm:@babel/types";

const CONFIG = {
  dir: "./target",
  exts: [".js", ".jsx"],
  dryRun: true,
};

// @ts-ignore:
const collectPipelineChain = (path) => {
  let current = path;

  const operands = collectNestedPipeline(current.node);

  while (
    current.parentPath &&
    t.isBinaryExpression(current.parentPath.node) &&
    current.parentPath.node.operator === "|>" &&
    current.parentPath.node.left === current.node
  ) {
    current = current.parentPath;
    operands.push(current.node.right);
  }

  return {
    operands,
    topPath: current,
  };
};

// @ts-ignore:
const collectNestedPipeline = (expr) => {
  if (!(t.isBinaryExpression(expr) && expr.operator === "|>")) {
    return [expr];
  }

  // @ts-ignore:
  const leftOperands = collectNestedPipeline(expr.left);

  return [...leftOperands, expr.right];
};

// @ts-ignore:
const createFlowExpression = ({ operands }) => {
  const initialValue = operands[0];
  const functions = operands.slice(1);

  // create flow(func1, func2, ...)(initialValue)
  return t.callExpression(t.callExpression(t.identifier("flow"), functions), [
    initialValue,
  ]);
};

const processSrc = (src: string) => {
  const ast = parse(src, {
    sourceType: "module",
    plugins: [
      "jsx",
      ["pipelineOperator", { proposal: "minimal" }],
      "exportDefaultFrom",
    ],
    tokens: true,
    createParenthesizedExpressions: true,
  });
  let shouldTransform = false;

  traverse.default(ast, {
    Program: {
      // @ts-ignore:
      exit(path) {
        if (path.scope.hasBinding("flow")) {
          const binding = path.scope.getBinding("flow");
          if (
            binding &&
            binding.path.parent.type === "ImportDeclaration" &&
            (binding.path.parent.source.value === "lodash" ||
              binding.path.parent.source.value === "lodash/fp")
          ) {
            return;
          }
        }

        const needsFlowImport = path.scope.getData("needsFlowImport");
        if (needsFlowImport) {
          const importDeclaration = t.importDeclaration(
            [t.importSpecifier(t.identifier("flow"), t.identifier("flow"))],
            t.stringLiteral("lodash/fp"),
          );
          const bodyStatements = path.get("body");
          let lastImportIndex = -1;

          for (let i = 0; i < bodyStatements.length; i++) {
            if (bodyStatements[i].isImportDeclaration()) {
              lastImportIndex = i;
            }
          }

          if (lastImportIndex >= 0) {
            path.get("body")[lastImportIndex].insertAfter(importDeclaration);
          } else {
            path.unshiftContainer("body", importDeclaration);
          }
        }
      },
    },

    BinaryExpression: {
      // @ts-ignore:
      exit(path) {
        const { node } = path;
        if (node.operator !== "|>") {
          return;
        }

        shouldTransform = true;
        path.scope.getProgramParent().setData("needsFlowImport", true);

        if (t.isBinaryExpression(node.left) && node.left.operator === "|>") {
          return;
        }

        const pipelineChain = collectPipelineChain(path);
        const flowExpression = createFlowExpression(pipelineChain);
        pipelineChain.topPath.replaceWith(flowExpression);
      },
    },
  });

  const { code } = generate(
    ast,
    { retainLines: true, experimental_preserveFormat: true },
    src,
  );
  return [shouldTransform, code];
};

const run = async () => {
  const files = walk(resolve(CONFIG.dir), {
    exts: CONFIG.exts,
    maxDepth: Infinity,
  });
  let count = 0;

  try {
    for await (const file of files) {
      const src = Deno.readTextFileSync(file.path);
      const [shouldTransform, code] = processSrc(src);

      if (shouldTransform && CONFIG.dryRun) {
        count++;
        console.log("-".repeat(file.path.length));
        console.log(file.path);
        console.log("-".repeat(file.path.length));
        console.log(code);
        console.log();
      } else if (shouldTransform) {
        count++;
        console.log(`Processing ${file.path}`);
        await Deno.writeTextFile(file.path, code);
      }
    }
    console.log("-".repeat(40));
    console.log(`Processed ${count} files.`);
    if (CONFIG.dryRun && count > 0) {
      console.log("Dry run, no files were modified.");
      console.log("set CONFIG.dryRun = false to apply changes.");
    }
  } catch (error) {
    console.error("An error occurred:\n", error);
  }
};

if (import.meta.main) {
  await run();
}
