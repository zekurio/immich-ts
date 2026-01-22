/**
 * Immich API Client
 *
 * Auto-initialized client using the official @immich/sdk.
 * Reads configuration from environment variables on module load.
 */

import { init } from "@immich/sdk";
import { getConfig } from "../env.ts";

const config = getConfig();
const baseUrl = config.url.replace(/\/+$/, "");

init({
  baseUrl: `${baseUrl}/api`,
  apiKey: config.apiKey,
});

export const client = { initialized: true } as const;
