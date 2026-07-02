import { strict as assert } from "node:assert";
import { join } from "node:path";
import {
  assertSuccess,
  runScript,
  scriptTestPermissions,
  withTempDir,
} from "./test_utils.ts";

Deno.test({
  name: "remove_html_tag removes tags and writes a sibling output file",
  permissions: scriptTestPermissions,
  fn: async () => {
    await withTempDir(async (dir) => {
      const inputPath = join(dir, "sample.html");
      const outputPath = join(dir, "sample_no_tags.html");

      await Deno.writeTextFile(
        inputPath,
        "<p>Alpha</p>\n<p>Beta &amp; Gamma</p>\n",
      );

      const result = await runScript("remove_html_tag.ts", [
        "--ext",
        "html",
        dir,
      ]);

      assertSuccess(result);
      assert.match(result.stdout, /Files processed:/);
      assert.equal(
        await Deno.readTextFile(outputPath),
        "Alpha\nBeta & Gamma",
      );
    });
  },
});
