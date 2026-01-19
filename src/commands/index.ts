import type { Config } from "../config.ts";
import { registry } from "../registry.ts";
import { validate, validateCommandMeta } from "./validate.ts";
import { stack, stackCommandMeta } from "./stack.ts";
import { autoAlbum, autoAlbumCommandMeta } from "./auto-album.ts";

registry.setGlobalOptions({
  options: [
    {
      name: "baseurl",
      type: "string",
      description: "Immich server URL (overrides IMMICH_URL)",
      placeholder: "url",
    },
    {
      name: "apikey",
      type: "string",
      description: "API key (overrides IMMICH_API_KEY)",
      placeholder: "key",
    },
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
  handler: (config: Config, opts: Record<string, unknown>) =>
    stack(config, {
      coverPattern: opts["cover"] as string,
      rawPattern: opts["raw"] as string,
      stemPattern: opts["stem-pattern"] as string | undefined,
      dryRun: (opts["dry-run"] as boolean) ?? false,
      after: opts["after"] as string | undefined,
      before: opts["before"] as string | undefined,
      albumId: opts["album"] as string | undefined,
      verbose: (opts["verbose"] as boolean) ?? false,
    }),
});

registry.register({
  ...autoAlbumCommandMeta,
  handler: (config: Config, opts: Record<string, unknown>) =>
    autoAlbum(config, {
      name: opts["name"] as string,
      after: opts["after"] as string,
      before: opts["before"] as string,
      locations: opts["location"] as string[],
      dryRun: (opts["dry-run"] as boolean) ?? false,
      verbose: (opts["verbose"] as boolean) ?? false,
    }),
});
