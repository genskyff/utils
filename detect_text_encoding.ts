import { detectFile } from "chardet";
import { extname, resolve } from "@std/path";
import { walk } from "@std/fs/walk";
import iconv from "iconv-lite";
import Table from "cli-table3";
import { Buffer } from "node:buffer";
import { Command } from "@cliffy/command";

interface Options {
  ext: string;
  recursive?: boolean;
  transform?: boolean;
  include?: boolean;
}

const detectFileEncoding = async (path: string) => {
  const encoding = await detectFile(path);
  return encoding;
};

const convertToGB18030 = async (path: string, encoding: string) => {
  try {
    const bytes = (await Deno.readFile(path)) as Buffer;

    if (!iconv.encodingExists(encoding)) {
      throw new Error(`Unsupported encoding: ${encoding}`);
    }

    const content = iconv.decode(bytes, encoding);
    const buffer = iconv.encode(content, "GB18030");
    const ext = extname(path);
    const newPath = path.replace(new RegExp(`${ext}$`), `_GB18030${ext}`);

    await Deno.writeFile(newPath, buffer);
  } catch (error) {
    console.error(`Error converting ${path} to GB18030:`, error);
  }
};

const run = async (
  { ext, recursive, transform, include }: Options,
  dir: string = ".",
) => {
  try {
    const files = walk(resolve(dir), {
      exts: [ext],
      maxDepth: recursive ? Infinity : 1,
    });

    const okTable = new Table({
      head: ["File", "Encoding"],
      colWidths: [60, 20],
      truncate: "...",
    });
    const errTable = new Table({
      head: ["File"],
      colWidths: [60],
      truncate: "...",
    });
    const convertedTable = new Table({
      head: ["File", "Old Encoding"],
      colWidths: [60, 20],
      truncate: "...",
    });

    for await (const file of files) {
      const encoding = await detectFileEncoding(file.path);

      if (!encoding) {
        errTable.push([file.path]);
        continue;
      }

      if (!include && encoding === "GB18030") {
        continue;
      }

      okTable.push([file.path, encoding]);
    }

    if (okTable.length === 0) {
      console.log("No files to detect.");
    } else {
      !transform && console.log("Files detected:");
      okTable.forEach((row) => {
        const [path, encoding] = row as [string, string];
        if (transform && encoding !== "GB18030") {
          convertToGB18030(path, encoding);
          convertedTable.push([path, encoding]);
        }
      });
      !transform && console.log(okTable.toString());
    }

    if (errTable.length > 0) {
      console.log("\nFiles with unknown encoding:");
      console.log(errTable.toString());
    }

    if (convertedTable.length > 0) {
      console.log("\nFiles converted to GB18030:");
      console.log(convertedTable.toString());
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
};

if (import.meta.main) {
  await new Command()
    .name("detect_text_encoding")
    .description(
      "Detect and optionally transform text file encodings to GB18030.",
    )
    .arguments("[dir]")
    .option("-e, --ext <ext>", "The file extension to process.", {
      default: "txt",
    })
    .option("-r, --recursive", "Process files recursively.")
    .option("-t, --transform", "Transform files to GB18030 encoding.")
    .option("-i, --include", "Include files that are already GB18030 encoded.")
    .action(run)
    .parse(Deno.args);
}
