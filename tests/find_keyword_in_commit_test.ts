import { strict as assert } from "node:assert";
import { join } from "node:path";
import {
  assertSuccess,
  runCommand,
  runScript,
  scriptTestPermissions,
  withTempDir,
} from "./test_utils.ts";

Deno.test({
  name: "find_keyword_in_commit prints commits whose message matches",
  permissions: scriptTestPermissions,
  fn: async () => {
    await withTempDir(async (dir) => {
      assertSuccess(await runCommand("git", ["init"], { cwd: dir }));
      assertSuccess(
        await runCommand("git", ["config", "user.name", "Test User"], {
          cwd: dir,
        }),
      );
      assertSuccess(
        await runCommand("git", ["config", "user.email", "test@example.com"], {
          cwd: dir,
        }),
      );

      await Deno.writeTextFile(join(dir, "note.txt"), "keyword fixture\n");
      assertSuccess(await runCommand("git", ["add", "note.txt"], { cwd: dir }));
      assertSuccess(
        await runCommand("git", ["commit", "-m", "Add ticket-123 feature"], {
          cwd: dir,
          env: {
            GIT_AUTHOR_DATE: "2024-01-01T00:00:00Z",
            GIT_COMMITTER_DATE: "2024-01-01T00:00:00Z",
          },
        }),
      );

      const result = await runScript("find_keyword_in_commit.ts", [
        "ticket-123",
        dir,
      ]);

      assertSuccess(result);
      assert.match(result.stdout, /Found 1 commits:/);
      assert.match(result.stdout, /Author: Test User <test@example\.com>/);
      assert.match(result.stdout, /Message: Add /);
      assert.match(result.stdout, / feature/);
    });
  },
});
