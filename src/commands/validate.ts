import {
  pingServer,
  getMyUser,
  isHttpError,
  type ApiHttpError,
} from "@immich/sdk";
import { type Config, maskApiKey } from "../env.ts";
import type { CommandOption } from "../registry.ts";
import { client } from "../api/index.ts";

void client;

export const validateCommandMeta = {
  name: "validate",
  description: "Validate connection to Immich server",
  options: [] as CommandOption[],
  examples: ["immich-ts validate"],
};

interface ValidationResult {
  success: boolean;
  urlValid: boolean;
  serverReachable: boolean;
  authenticated: boolean;
  error?: string;
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function formatError(err: unknown): string {
  if (isHttpError(err)) {
    const httpErr = err as ApiHttpError;
    if (httpErr.status === 401) {
      return "Invalid API key";
    }
    if (httpErr.status === 403) {
      return "API key does not have permission";
    }
    return `API error: ${httpErr.data?.message ?? "Unknown error"}`;
  }

  if (err instanceof Error) {
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      return `Network error: ${err.message}`;
    }
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return "Request timed out";
    }
    return err.message;
  }

  return "Unknown error";
}

/**
 * Validates Immich server connectivity and API key authentication.
 * @returns Exit code (0 = success, 1 = failure)
 */
export async function validate(config: Config): Promise<number> {
  const green = "\x1b[32m";
  const red = "\x1b[31m";
  const dim = "\x1b[2m";
  const reset = "\x1b[0m";

  console.log("\nValidating Immich configuration...\n");
  console.log(`  URL:     ${config.url}`);
  console.log(`  API Key: ${maskApiKey(config.apiKey)} ${dim}(masked)${reset}`);
  console.log();

  const result: ValidationResult = {
    success: true,
    urlValid: false,
    serverReachable: false,
    authenticated: false,
  };

  if (isValidUrl(config.url)) {
    result.urlValid = true;
    console.log(`  ${green}[OK]${reset} URL format is valid`);
  } else {
    result.success = false;
    console.log(`  ${red}[FAIL]${reset} URL format is invalid`);
    console.log(`         Expected: http(s)://hostname`);
  }

  if (result.urlValid) {
    try {
      const pingResponse = await pingServer();
      if (pingResponse.res === "pong") {
        result.serverReachable = true;
        console.log(`  ${green}[OK]${reset} Server is reachable`);
      } else {
        result.success = false;
        result.error = "Unexpected response from server";
        console.log(
          `  ${red}[FAIL]${reset} Server returned unexpected response`,
        );
      }
    } catch (err) {
      result.success = false;
      result.error = formatError(err);
      console.log(`  ${red}[FAIL]${reset} Server is not reachable`);
      console.log(`         Error: ${result.error}`);
    }

    if (result.serverReachable) {
      try {
        const user = await getMyUser();
        result.authenticated = true;
        console.log(`  ${green}[OK]${reset} API key is valid`);
        console.log(`         Authenticated as: ${user.name} (${user.email})`);
      } catch (err) {
        result.success = false;
        result.error = formatError(err);
        console.log(`  ${red}[FAIL]${reset} API key authentication failed`);
        console.log(`         Error: ${result.error}`);
      }
    }
  }

  console.log();

  if (result.success) {
    console.log(`${green}Server is reachable!${reset}\n`);
    return 0;
  } else {
    console.log(`${red}Server is not reachable.${reset}\n`);
    return 1;
  }
}
