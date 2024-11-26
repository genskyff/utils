import { detectFile } from "chardet";
import { parseArgs } from "@std/cli";
import { walk } from "@std/fs/walk";
import { checkFlags } from "@lib";

interface Options {
  dir: string;
  recursive: boolean;
  transform: boolean;
  include: boolean;
}

interface OkFile {
  path: string;
  encoding: string;
}

interface ErrFile {
  path: string;
}

async function detectFileEncoding(path: string) {
  const encoding = await detectFile(path);
  return encoding;
}

async function convertToGB18030(filePath: string, fileEncoding: string) {
  try {
    const content = await Deno.readTextFile(filePath);
    const encoder = new TextEncoder();
    const decoder = new TextDecoder(fileEncoding);

    await Deno.writeTextFile(filePath, content);
  } catch (error) {
    console.error(`Error converting ${filePath} to GB18030:`, error);
  }
}

async function run({ dir, recursive, transform, include }: Options) {
  try {
    const files = walk(dir, {
      exts: ["txt"],
      maxDepth: recursive ? Infinity : 1,
    });

    const okList: OkFile[] = [];
    const errList: ErrFile[] = [];

    for await (const file of files) {
      const encoding = await detectFileEncoding(file.path);

      if (!encoding) {
        errList.push({ path: file.path });
        continue;
      }

      if (!include && encoding === "GB18030") {
        continue;
      }

      okList.push({ path: file.path, encoding });
    }

    if (okList.length === 0) {
      console.log("No files to process.");
    } else {
      console.log("Files to process:");
      okList.forEach((file) => {
        if (transform) {
          convertToGB18030(file.path, file.encoding);
        }
        console.log(`- ${file.path} (${file.encoding})`);
      });
    }

    if (errList.length > 0) {
      console.log("Files with errors:");
      errList.forEach((file) => console.log(`- ${file.path}`));
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

if (import.meta.main) {
  const flags = parseArgs(Deno.args, {
    string: ["d"],
    boolean: ["r", "t", "i", "h"],
    default: { d: "." },
  });

  const result = checkFlags(flags);
  if (result.error) {
    result.messages.forEach((message) => console.error(message));
    Deno.exit(1);
  }

  if (flags.h) {
    console.log("Usage: detect_text_encoding [OPTIONS]");
    console.log(
      "Detect and optionally transform text file encodings to GB18030"
    );
    console.log("");
    console.log("Options:");
    console.log("  -d <dir>   The directory to process (default: .)");
    console.log("  -r         Process files recursively");
    console.log("  -t         Transform files to GB18030 encoding");
    console.log("  -i         Include files that are already GB18030 encoded");
    console.log("  -h         Show this help message");
  } else {
    run({
      dir: flags.d,
      recursive: flags.r,
      transform: flags.t,
      include: flags.i,
    });
  }
}
