import { strict as assert } from "node:assert";

const decoder = new TextDecoder();

export const scriptTestPermissions = {
  read: true,
  write: true,
  run: true,
  env: true,
} as const;

export interface CommandResult {
  code: number;
  success: boolean;
  stdout: string;
  stderr: string;
}

interface CommandOptions {
  cwd?: string;
  env?: Record<string, string>;
}

export const scriptSpecifier = (name: string): string => {
  return new URL(`../${name}`, import.meta.url).href;
};

export const runScript = async (
  name: string,
  args: string[] = [],
  options: CommandOptions = {},
): Promise<CommandResult> => {
  return await runCommand(Deno.execPath(), [
    "run",
    "-A",
    scriptSpecifier(name),
    ...args,
  ], options);
};

export const runCommand = async (
  command: string,
  args: string[] = [],
  options: CommandOptions = {},
): Promise<CommandResult> => {
  const output = await new Deno.Command(command, {
    args,
    cwd: options.cwd,
    env: options.env,
    stdout: "piped",
    stderr: "piped",
  }).output();

  return {
    code: output.code,
    success: output.success,
    stdout: decoder.decode(output.stdout),
    stderr: decoder.decode(output.stderr),
  };
};

export const assertSuccess = (result: CommandResult): void => {
  assert.equal(
    result.code,
    0,
    `Expected command to exit successfully.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
};

export const withTempDir = async <T>(
  fn: (dir: string) => Promise<T>,
): Promise<T> => {
  const dir = await Deno.makeTempDir({ prefix: "utils_test_" });

  try {
    return await fn(dir);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
};
