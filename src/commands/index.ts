import type { Config } from "../env.ts";
import { registry } from "../registry.ts";
import { autoAlbum, autoAlbumCommandMeta } from "./auto-album.ts";
import { stack, stackCommandMeta } from "./stack.ts";
import { validate, validateCommandMeta } from "./validate.ts";

function getRequiredStringOption(options: Record<string, unknown>, name: string): string {
  const value = options[name];
  if (typeof value !== "string") {
    throw new Error(`Missing required option: --${name}`);
  }

  return value;
}

function getOptionalStringOption(
  options: Record<string, unknown>,
  name: string,
): string | undefined {
  const value = options[name];
  return typeof value === "string" ? value : undefined;
}

function getBooleanOption(options: Record<string, unknown>, name: string): boolean {
  return options[name] === true;
}

function getStringArrayOption(options: Record<string, unknown>, name: string): string[] {
  const value = options[name];

  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    const strings = value.filter((item): item is string => typeof item === "string");
    return strings;
  }

  return [];
}

registry.setGlobalOptions({
  options: [
    {
      name: "help",
      short: "h",
      type: "boolean",
      description: "Show this help message",
    },
  ],
  envVars: [
    { name: "IMMICH_URL", description: "Server URL (e.g., https://immich.example.com)" },
    { name: "IMMICH_API_KEY", description: "Your API key" },
  ],
});

registry.register({
  ...validateCommandMeta,
  handler: (config: Config) => validate(config),
});

registry.register({
  ...stackCommandMeta,
  handler: (_config: Config, opts: Record<string, unknown>) =>
    stack({
      coverPattern: getRequiredStringOption(opts, "cover"),
      rawPattern: getRequiredStringOption(opts, "raw"),
      stemPattern: getOptionalStringOption(opts, "stem-pattern"),
      dryRun: getBooleanOption(opts, "dry-run"),
      after: getOptionalStringOption(opts, "after"),
      before: getOptionalStringOption(opts, "before"),
      albumId: getOptionalStringOption(opts, "album"),
      verbose: getBooleanOption(opts, "verbose"),
    }),
});

registry.register({
  ...autoAlbumCommandMeta,
  handler: (_config: Config, opts: Record<string, unknown>) =>
    autoAlbum({
      name: getRequiredStringOption(opts, "name"),
      after: getRequiredStringOption(opts, "after"),
      before: getRequiredStringOption(opts, "before"),
      locations: getStringArrayOption(opts, "location"),
      dryRun: getBooleanOption(opts, "dry-run"),
      verbose: getBooleanOption(opts, "verbose"),
    }),
});
