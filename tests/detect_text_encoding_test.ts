import { strict as assert } from "node:assert";
import { join } from "node:path";
import iconv from "iconv-lite";
import {
  assertSuccess,
  runScript,
  scriptTestPermissions,
  withTempDir,
} from "./test_utils.ts";

Deno.test({
  name: "detect_text_encoding reports detected text files",
  permissions: scriptTestPermissions,
  fn: async () => {
    await withTempDir(async (dir) => {
      const inputPath = join(dir, "utf8.txt");
      await Deno.writeTextFile(inputPath, "hello, encoding\n");

      const result = await runScript("detect_text_encoding.ts", [dir]);

      assertSuccess(result);
      assert.match(result.stdout, /Files detected:/);
      assert.match(result.stdout, /Encoding/);
    });
  },
});

Deno.test({
  name: "detect_text_encoding reports GBK encoded files",
  permissions: scriptTestPermissions,
  fn: async () => {
    await withTempDir(async (dir) => {
      const inputPath = join(dir, "gbk.txt");
      const content =
        "这是一段用于编码识别的 GBK 文本，包含多组中文字符和标点。";

      await Deno.writeFile(inputPath, iconv.encode(content, "gbk"));

      const result = await runScript("detect_text_encoding.ts", [
        "--include",
        dir,
      ]);

      assertSuccess(result);
      assert.match(result.stdout, /Files detected:/);
      assert.match(result.stdout, /GB(?:18030|K|2312)/i);
    });
  },
});
