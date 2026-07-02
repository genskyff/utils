import { strict as assert } from "node:assert";
import { scriptTestPermissions } from "./test_utils.ts";

Deno.test({
  name: "export_pdf_bookmark prints nested Acrobat bookmarks",
  permissions: scriptTestPermissions,
  fn: async () => {
    const source = await Deno.readTextFile(
      new URL("../export_pdf_bookmark.js", import.meta.url),
    );
    const lines: string[] = [];
    const acrobatConsole = {
      println: (value: string) => {
        lines.push(value);
      },
    };
    const bookmarkRoot = {
      children: [
        {
          name: "Chapter 1",
          children: [{ name: "Section 1.1" }],
        },
        { name: "Appendix" },
      ],
    };

    const executeAcrobatScript = new Function("console", source);
    executeAcrobatScript.call({ bookmarkRoot }, acrobatConsole);

    assert.deepEqual(lines, [
      "Chapter 1",
      "  Section 1.1",
      "Appendix",
    ]);
  },
});
