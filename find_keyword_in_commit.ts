import { $ } from "@david/dax";
import { resolve } from "@std/path";
import { Command } from "@cliffy/command";
import { colors } from "@cliffy/ansi/colors";

const filterCommits = async (pattern: string, dir: string) => {
  try {
    await $`git -C ${dir} rev-parse --is-inside-work-tree`.quiet();

    const gitOutput =
      await $`git -C ${dir} log --all --format="%H%n%an%n%ae%n%ad%n%s%n--COMMIT--"`
        .text();
    const commits = gitOutput
      .split("--COMMIT--")
      .filter((commit) => commit.trim())
      .map((commit) => {
        const [hash, name, email, date, message] = commit.trim().split("\n");
        return { hash, name, email, date, message };
      });

    const re = new RegExp(pattern, "i");
    const filteredCommits = commits.filter(
      (commit) => re.test(commit.message),
    );

    if (filteredCommits.length > 0) {
      console.log(`Found ${filteredCommits.length} commits:`);
      console.log("-".repeat(48));
      for (const commit of filteredCommits) {
        console.log(`Commit: ${commit.hash}`);
        console.log(`Author: ${commit.name} <${commit.email}>`);
        console.log(`Date: ${commit.date}`);
        const highlightedMessage = commit.message.replace(
          re,
          (match) => colors.bold.brightGreen(match),
        );
        console.log(`Message: ${highlightedMessage}`);
        console.log("-".repeat(48));
      }
    } else {
      console.log("No commits found");
    }
  } catch (error) {
    console.error("An error occurred:\n", error);
  }
};

const run = async (_options: unknown, pattern: string, dir = ".") => {
  try {
    await filterCommits(pattern, resolve(dir));
  } catch (error) {
    console.error("An error occurred:", error);
  }
};

if (import.meta.main) {
  await new Command()
    .name("find_keyword_in_commit")
    .description("Find a keyword in commit messages.")
    .arguments("<pattern> [dir]")
    .action(run)
    .parse(Deno.args);
}
