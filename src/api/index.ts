import { init } from "@immich/sdk";
import type { Config } from "../env.ts";

let activeConfigKey: string | undefined;

export function initClient(config: Config): void {
  const normalizedUrl = config.url.replace(/\/+$/, "");
  const configKey = `${normalizedUrl}|${config.apiKey}`;

  if (activeConfigKey === configKey) {
    return;
  }

  init({
    baseUrl: `${normalizedUrl}/api`,
    apiKey: config.apiKey,
  });

  activeConfigKey = configKey;
}
