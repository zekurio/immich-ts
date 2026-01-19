export interface Config {
  url: string;
  apiKey: string;
}

export interface ConfigOverrides {
  baseurl?: string;
  apikey?: string;
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
 * Load configuration from environment variables and CLI overrides.
 * CLI args take precedence over environment variables.
 */
export function getConfig(overrides: ConfigOverrides = {}): Config {
  const url = overrides.baseurl ?? process.env.IMMICH_URL;
  const apiKey = overrides.apikey ?? process.env.IMMICH_API_KEY;

  const missing: string[] = [];

  if (!url) {
    missing.push("IMMICH_URL (or --baseurl)");
  }

  if (!apiKey) {
    missing.push("IMMICH_API_KEY (or --apikey)");
  }

  if (missing.length > 0) {
    throw new ConfigError(
      `Missing required configuration:\n  - ${missing.join("\n  - ")}\n\n` +
        "Set these in a .env file or pass them as command-line arguments.",
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
