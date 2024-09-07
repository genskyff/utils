import { readdir, readFile, writeFile } from "fs/promises";
import { JSDOM } from "jsdom";

function removeTag(fragment) {
  const dom = new JSDOM(fragment);
  return dom.window.document.body.textContent || "";
}

function processContent(content) {
  // 移除HTML标签
  const withoutTags = removeTag(content);

  // 分割成行，处理每一行，然后重新组合
  return withoutTags
    .split("\n")
    .map((line) => line.trim())
    .join("\n");
}

async function processFiles() {
  try {
    // 读取当前目录中的所有文件
    const files = await readdir(".");

    // 过滤出.txt文件
    const txtFiles = files.filter((file) => file.endsWith(".txt"));

    for (const file of txtFiles) {
      // 读取文件内容
      const content = await readFile(file, "utf-8");

      // 处理内容
      const processedContent = processContent(content);

      // 创建新文件名
      const newFileName = file.replace(".txt", "_fix.txt");

      // 写入新文件
      await writeFile(newFileName, processedContent);

      console.log(`Processed ${file} -> ${newFileName}`);
    }

    console.log("All files processed successfully.");
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

processFiles();
