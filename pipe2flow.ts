import { resolve } from "@std/path";
import { walk } from "@std/fs/walk";
import { Command } from "@cliffy/command";
import { parse } from "npm:@babel/parser";
import traverse from "npm:@babel/traverse";
import { generate } from "npm:@babel/generator";
import t from "npm:@babel/types";

interface Options {
  exts: readonly string[];
  recursive?: boolean;
  depth?: number;
  dryRun: boolean;
}

const collectPipelineChain = (path) => {
  let current = path;

  // 收集整个管道链的操作数
  const operands = collectNestedPipeline(current.node);

  // 找到整个管道链的顶部节点
  while (
    current.parentPath &&
    t.isBinaryExpression(current.parentPath.node) &&
    current.parentPath.node.operator === "|>" &&
    current.parentPath.node.left === current.node
  ) {
    current = current.parentPath;
    // 添加当前节点的右侧操作数
    operands.push(current.node.right);
  }

  return {
    operands,
    topPath: current,
  };
};

// @ts-ignore:
const collectNestedPipeline = (expr) => {
  // 基本情况：不是管道操作符
  if (!(t.isBinaryExpression(expr) && expr.operator === "|>")) {
    return [expr];
  }

  // 递归处理左侧
  const leftOperands = collectNestedPipeline(expr.left);

  // 添加右侧
  return [...leftOperands, expr.right];
};

// @ts-ignore:
const createFlowExpression = ({ operands }) => {
  // 把第一个操作数作为初始值
  const initialValue = operands[0];
  // 剩下的作为函数
  const functions = operands.slice(1);

  // 创建 flow(func1, func2, ...)(initialValue)
  return t.callExpression(t.callExpression(t.identifier("flow"), functions), [
    initialValue,
  ]);
};

const processSrc = (src: string) => {
  const ast = parse(src, {
    sourceType: "module",
    plugins: ["jsx", ["pipelineOperator", { proposal: "minimal" }]],
  });

  traverse.default(ast, {
    Program: {
      // 检查是否需要导入 flow
      exit(path) {
        if (path.scope.hasBinding("flow")) {
          // 已经有 flow 变量，检查它是否来自 lodash/fp
          const binding = path.scope.getBinding("flow");

          // 如果已经从 lodash/fp 导入了 flow，无需添加导入
          if (
            binding &&
            binding.path.parent.type === "ImportDeclaration" &&
            binding.path.parent.source.value === "lodash/fp"
          ) {
            return;
          }
        }

        // 检查是否有管道操作符被转换
        const needsFlowImport = path.scope.getData("needsFlowImport");
        if (needsFlowImport) {
          // 添加 import { flow } from 'lodash/fp'
          const importDeclaration = t.importDeclaration(
            [t.importSpecifier(t.identifier("flow"), t.identifier("flow"))],
            t.stringLiteral("lodash/fp")
          );
          path.unshiftContainer("body", importDeclaration);
        }
      },
    },

    BinaryExpression: {
      exit(path) {
        const { node } = path;

        // 跳过非管道操作符
        if (node.operator !== "|>") return;

        // 将在程序级别标记需要导入 flow
        path.scope.getProgramParent().setData("needsFlowImport", true);

        // 如果左侧是嵌套的管道操作，此时跳过
        // 我们会从链的顶部开始处理
        if (t.isBinaryExpression(node.left) && node.left.operator === "|>") {
          return;
        }

        // 收集整个管道链
        const pipelineChain = collectPipelineChain(path);

        // 创建 flow 表达式
        const flowExpression = createFlowExpression(pipelineChain);

        // 替换整个链的顶部节点
        pipelineChain.topPath.replaceWith(flowExpression);
      },
    },
  });

  const { code } = generate(ast);

  return code;
};

const run = async (
  { exts, recursive, depth, dryRun }: Options,
  dir = "examples"
) => {
  try {
    const files = walk(resolve(dir), {
      exts: [...exts],
      maxDepth: recursive ? depth : 1,
    });

    for await (const file of files) {
      const src = Deno.readTextFileSync(file.path);
      const processedSrc = processSrc(src);

      if (dryRun) {
        console.log("-".repeat(file.path.length));
        console.log(`${file.path}◀`);
        console.log("-".repeat(file.path.length));
        console.log(processedSrc);
        console.log();
      } else {
        console.log(`Processing ${file.path}`);
        await Deno.writeTextFile(file.path, processedSrc);
      }
    }
  } catch (error) {
    console.error("An error occurred:\n", error);
  }
};

if (import.meta.main) {
  await new Command()
    .name("pipe2flow")
    .description("Transform pipeline operators to lodash flow.")
    .arguments("[dir]")
    .option("-e, --exts <exts...>", "The file extensions to process.", {
      default: ["js", "jsx"],
    })
    .option("-r, --recursive", "Process files recursively.")
    .option("--depth <depth:number>", "The maximum depth to process.", {
      default: Infinity,
      depends: ["recursive"],
    })
    .option("--no-dry-run", "Write the changes to the files.")
    .action(run)
    .parse(Deno.args);
}
