// @ts-ignore:
import { JSDOM } from "npm:jsdom";
import { extname } from "@std/path";
import { parseArgs } from "@std/cli";
import { walk } from "@std/fs/walk";
import { checkArgs } from "@lib";

interface Options {
  type: string;
  dir: string;
  recursive: boolean;
}

function removeTag(fragment: string): string {
  const dom = new JSDOM(fragment);
  return dom.window.document.body.textContent || "";
}

function processContent(content: string) {
  const withoutTags = removeTag(content);

  return withoutTags
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => line.trim())
    .join("\n");
}

async function run({ type, dir, recursive }: Options) {
  try {
    const files = walk(dir, {
      exts: [type],
      maxDepth: recursive ? Infinity : 1,
    });

    for await (const file of files) {
      const ext = extname(file.name);
      const content = Deno.readTextFileSync(file.path);
      const processedContent = processContent(content);
      const newPath = file.path.replace(ext, `_fix.txt`);
      await Deno.writeTextFile(newPath, processedContent);

      console.log(`Processed ${file.path} -> ${newPath}`);
    }

    console.log("All files processed successfully.");
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

if (import.meta.main) {
  const args = parseArgs(Deno.args, {
    string: ["t", "d"],
    boolean: ["r", "h"],
    default: { t: "html", d: "." },
  });

  const result = checkArgs(args);
  if (result.error) {
    result.messages.forEach((message) => console.error(message));
    Deno.exit(1);
  }

  if (args.h) {
    console.log("Usage: remove_html_tag [OPTIONS]");
    console.log("Remove HTML tags from files in a directory");
    console.log("");
    console.log("Options:");
    console.log("  -t <type>  The file type to process (default: html)");
    console.log("  -d <dir>   The directory to process (default: .)");
    console.log("  -r         Process files recursively");
    console.log("  -h         Show this help message");
  } else {
    run({ type: args.t, dir: args.d, recursive: args.r });
  }
}
