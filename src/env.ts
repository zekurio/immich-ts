export interface Config {
  url: string;
  apiKey: string;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

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

  if (missing.length > 0 || !url || !apiKey) {
    throw new ConfigError(
      `Missing required configuration:\n  - ${missing.join("\n  - ")}\n\n` +
        "Set these environment variables or use a .env file.",
    );
  }

  return { url, apiKey };
}

export function maskApiKey(apiKey: string): string {
  const len = apiKey.length;

  if (len <= 4) {
    return "***";
  }

  const showCount = Math.max(1, Math.min(4, Math.floor(len * 0.2)));
  return `${apiKey.slice(0, showCount)}***${apiKey.slice(-showCount)}`;
}
