import { type Args } from "@std/cli";

interface CheckResult {
  hasError: boolean;
  messages: string[];
}

export const checkFlags = (flags: Args): CheckResult => {
  const result: CheckResult = {
    hasError: false,
    messages: [],
  };

  for (const key in flags) {
    if (key === "_") {
      continue;
    }
    if (flags[key] === "") {
      result.hasError = true;
      result.messages.push(`Error: Missing value for option ${key}`);
    }
  }

  return result;
};
