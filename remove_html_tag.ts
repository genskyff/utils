// @ts-ignore:
import { JSDOM } from "jsdom";
import { extname, resolve } from "@std/path";
import { walk } from "@std/fs/walk";
import { Command } from "@cliffy/command";
import Table from "cli-table3";

interface Options {
  ext: string;
  recursive?: boolean;
  depth?: number;
}

const removeTag = (fragment: string): string => {
  const dom = new JSDOM(fragment);
  return dom.window.document.body.textContent || "";
};

const processContent = (content: string) => {
  const withoutTags = removeTag(content);

  return withoutTags
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => line.trim())
    .join("\n");
};

const run = async ({ ext, recursive, depth }: Options, dir = ".") => {
  try {
    const files = walk(resolve(dir), {
      exts: [ext],
      maxDepth: recursive ? depth : 1,
    });

    const processedTable = new Table({
      head: ["File", "New File"],
      colWidths: [40, 40],
      truncate: "...",
    });

    for await (const file of files) {
      const content = Deno.readTextFileSync(file.path);
      const processedContent = processContent(content);
      const ext = extname(file.name);
      const newPath = file.path.replace(
        new RegExp(`${ext}$`),
        `_no_tags${ext}`,
      );
      await Deno.writeTextFile(newPath, processedContent);
      processedTable.push([file.path, newPath]);
    }

    if (processedTable.length > 0) {
      console.log("Files processed:");
      console.log(processedTable.toString());
    }
  } catch (error) {
    console.error("An error occurred:\n", error);
  }
};

if (import.meta.main) {
  await new Command()
    .name("remove_html_tag")
    .description("Remove HTML tags from files in a directory.")
    .arguments("[dir]")
    .option("-e, --ext <ext>", "The file extension to process.", {
      default: "html",
    })
    .option("-r, --recursive", "Process files recursively.")
    .option("--depth <depth:number>", "The maximum depth to process.", {
      default: Infinity,
      depends: ["recursive"],
    })
    .action(run)
    .parse(Deno.args);
}
