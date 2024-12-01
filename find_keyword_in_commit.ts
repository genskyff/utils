import { $ } from "@david/dax";
import { parseArgs } from "@std/cli";
import { checkArgs } from "@lib";

interface Options {
  pattern: string;
  dir: string;
}

async function filterCommits({ pattern, dir }: Options) {
  try {
    await $`git -C ${dir} rev-parse --is-inside-work-tree`.quiet();

    const gitOutput =
      await $`git log --all --format="%H%n%an%n%ae%n%ad%n%s%n--COMMIT--"`
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
      (commit) =>
        re.test(commit.name) || re.test(commit.email) ||
        re.test(commit.message),
    );

    if (filteredCommits.length > 0) {
      console.log(`Found ${filteredCommits.length} commits:`);
      console.log("-".repeat(40));
      for (const commit of filteredCommits) {
        console.log(`Commit: ${commit.hash}`);
        console.log(`Author: ${commit.name} <${commit.email}>`);
        console.log(`Date: ${commit.date}`);
        console.log(`Message: ${commit.message}`);
        console.log("-".repeat(40));
      }
    } else {
      console.log("No commits found");
    }
  } catch (_error) {
    console.error(`Error: ${dir} is not a Git repository`);
  }
}

async function run({ pattern, dir }: Options) {
  try {
    if (pattern) {
      await filterCommits({ pattern, dir });
    } else {
      console.error("Error: Please provide a pattern to search for");
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

if (import.meta.main) {
  const args = parseArgs(Deno.args, {
    string: ["d"],
    boolean: ["h"],
    default: { d: "." },
  });

  const result = checkArgs(args, { position: 1 });
  if (result.error) {
    result.messages.forEach((message) => console.error(message));
    Deno.exit(1);
  }

  if (args.h) {
    console.log("Usage: find_keyword_in_commit <PATTERN> [OPTIONS]");
    console.log("Find a keyword in commit messages");
    console.log("");
    console.log("Options:");
    console.log("  -d <dir>   The directory to process (default: .)");
    console.log("  -h         Show this help message");
  } else {
    run({ pattern: args._[0] as string, dir: args.d });
  }
}
