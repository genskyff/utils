import { detectFile } from "chardet";
import { extname } from "@std/path";
import { parseArgs } from "@std/cli";
import { walk } from "@std/fs/walk";
import { checkArgs } from "@lib";
import iconv from "iconv-lite";
import Table from "cli-table3";

interface Options {
  dir: string;
  ext: string;
  recursive: boolean;
  transform: boolean;
  include: boolean;
}

async function detectFileEncoding(path: string) {
  const encoding = await detectFile(path);
  return encoding;
}

async function convertToGB18030(path: string, encoding: string) {
  try {
    const bytes = await Deno.readFile(path);

    if (!iconv.encodingExists(encoding)) {
      throw new Error(`Unsupported encoding: ${encoding}`);
    }

    const content = iconv.decode(bytes, encoding);
    const buffer = iconv.encode(content, "GB18030");
    const ext = extname(path);
    const newPath = path.replace(new RegExp(`${ext}$`), `_GB18030.${ext}`);

    await Deno.writeFile(newPath, buffer);
  } catch (error) {
    console.error(`Error converting ${path} to GB18030:`, error);
  }
}

async function run({ dir, ext, recursive, transform, include }: Options) {
  try {
    const files = walk(dir, {
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
      console.log("Files detected:");
      okTable.forEach((row) => {
        const [path, encoding] = row as [string, string];
        if (transform && encoding !== "GB18030") {
          convertToGB18030(path, encoding);
          convertedTable.push([path, encoding]);
        }
      });
      console.log(okTable.toString());
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
}

if (import.meta.main) {
  const args = parseArgs(Deno.args, {
    string: ["d", "e"],
    boolean: ["r", "t", "i", "h"],
    default: { d: ".", e: "txt" },
  });

  const result = checkArgs(args);
  if (result.error) {
    result.messages.forEach((message) => console.error(message));
    Deno.exit(1);
  }

  if (args.h) {
    console.log(
      "Detect and optionally transform text file encodings to GB18030",
    );
    console.log("");
    console.log("Usage: detect_text_encoding [OPTIONS]");
    console.log("");
    console.log("Options:");
    console.log("  -d <dir>   The directory to process (default: .)");
    console.log("  -e <ext>   The file extension to process (default: txt)");
    console.log("  -r         Process files recursively");
    console.log("  -t         Transform files to GB18030 encoding");
    console.log("  -i         Include files that are already GB18030 encoded");
    console.log("  -h         Show this help message");
  } else {
    run({
      dir: args.d,
      ext: args.e,
      recursive: args.r,
      transform: args.t,
      include: args.i,
    });
  }
}
