import { type Args } from "@std/cli";

interface CheckResult {
  error: boolean;
  messages: string[];
}

export const checkFlags = (flags: Args): CheckResult => {
  const result: CheckResult = {
    error: false,
    messages: [],
  };

  for (const key in flags) {
    if (key === "_" && flags._.length > 0) {
      result.error = true;
      flags._.forEach((arg) =>
        result.messages.push(`Error: Unexpected argument '${arg}'`)
      );
    }

    if (flags[key] === "") {
      result.error = true;
      result.messages.push(`Error: Missing value for option '${key}'`);
    }
  }

  return result;
};
