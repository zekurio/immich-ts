export interface Config {
  url: string;
  apiKey: string;
}

/**
 * Error thrown when required configuration is missing or invalid.
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/**
 * Load configuration from environment variables.
 */
export function getConfig(): Config {
  const url = process.env.IMMICH_URL;
  const apiKey = process.env.IMMICH_API_KEY;

  const missing: string[] = [];

  if (!url) {
    missing.push("IMMICH_URL");
  }

  if (!apiKey) {
    missing.push("IMMICH_API_KEY");
  }

  if (missing.length > 0) {
    throw new ConfigError(
      `Missing required configuration:\n  - ${missing.join("\n  - ")}\n\n` +
        "Set these environment variables or use a .env file.",
    );
  }

  return { url: url!, apiKey: apiKey! };
}

/**
 * Mask an API key for safe display, showing only the first and last few characters.
 * @param apiKey The API key to mask
 * @returns Masked string (e.g., "abc1***xyz9")
 */
export function maskApiKey(apiKey: string): string {
  const len = apiKey.length;

  if (len <= 4) {
    return "***";
  }

  const showCount = Math.max(1, Math.min(4, Math.floor(len * 0.2)));
  return `${apiKey.slice(0, showCount)}***${apiKey.slice(-showCount)}`;
}
