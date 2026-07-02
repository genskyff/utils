import { strict as assert } from "node:assert";
import { join } from "node:path";
import {
  assertSuccess,
  runScript,
  scriptTestPermissions,
  withTempDir,
} from "./test_utils.ts";

Deno.test({
  name: "pipe2flow prints a dry-run lodash flow transform",
  permissions: scriptTestPermissions,
  fn: async () => {
    await withTempDir(async (dir) => {
      const targetDir = join(dir, "target");
      const inputPath = join(targetDir, "example.js");
      const source = "const result = value |> first |> second;\n";

      await Deno.mkdir(targetDir);
      await Deno.writeTextFile(inputPath, source);

      const result = await runScript("pipe2flow.ts", [], { cwd: dir });

      assertSuccess(result);
      assert.match(result.stdout, /import\{flow\}from"lodash\/fp";/);
      assert.match(result.stdout, /flow\(first,second\)\(value\)/);
      assert.match(result.stdout, /Dry run, no files were modified\./);
      assert.equal(await Deno.readTextFile(inputPath), source);
    });
  },
});
