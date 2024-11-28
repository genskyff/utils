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
  const pos_args = options?.position || 0;

  for (const key in args) {
    if (key === "_" && args._.length > pos_args) {
      result.error = true;
      args._.forEach(
        (arg, index) =>
          index >= pos_args &&
          result.messages.push(`Error: Unexpected argument '${arg}'`),
      );
    }

    if (args[key] === "") {
      result.error = true;
      result.messages.push(`Error: Missing value for option '${key}'`);
    }
  }

  return result;
};
