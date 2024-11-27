import { type Args } from "@std/cli";

interface Result {
  error: boolean;
  messages: string[];
}

interface Options {
  position?: number;
}

export const checkArgs = (args: Args, options?: Options): Result => {
  const result: Result = {
    error: false,
    messages: [],
  };

  for (const key in args) {
    if (key === "_" && args._.length > (options?.position || 0)) {
      result.error = true;
      args._.forEach((arg) =>
        result.messages.push(`Error: Unexpected argument '${arg}'`)
      );
    }

    if (args[key] === "") {
      result.error = true;
      result.messages.push(`Error: Missing value for option '${key}'`);
    }
  }

  return result;
};
