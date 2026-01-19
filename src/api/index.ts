/**
 * Immich API Client
 *
 * Thin wrapper around the official @immich/sdk.
 * Re-exports SDK functions and types needed by this CLI.
 *
 * @example
 * ```typescript
 * import { initClient, pingServer, getMyUser } from "./api/index.ts";
 *
 * initClient({ url: "https://immich.example.com", apiKey: "your-api-key" });
 *
 * const pong = await pingServer();
 * const user = await getMyUser();
 * console.log(`Logged in as: ${user.name}`);
 * ```
 */

import { init } from "@immich/sdk";

// Re-export SDK functions we use
export {
  pingServer,
  getMyUser,
  searchAssets,
  getAlbumInfo,
  createStack,
  createAlbum,
  getAllAlbums,
} from "@immich/sdk";

// Re-export SDK types we need
export type {
  AssetResponseDto,
  AlbumResponseDto,
  StackResponseDto,
  StackCreateDto,
  UserAdminResponseDto,
  MetadataSearchDto,
  SearchResponseDto,
  CreateAlbumDto,
} from "@immich/sdk";

// Re-export SDK enums
export { AssetVisibility } from "@immich/sdk";

// Re-export error handling
export { isHttpError } from "@immich/sdk";
export type { ApiHttpError } from "@immich/sdk";

// ============================================================================
// Client Configuration
// ============================================================================

export interface ClientConfig {
  /** Base URL of the Immich server (e.g., https://immich.example.com) */
  url: string;
  /** API key for authentication */
  apiKey: string;
}

/**
 * Initialize the Immich SDK client.
 * Must be called before using any SDK functions.
 *
 * @param config Client configuration with URL and API key
 */
export function initClient(config: ClientConfig): void {
  const baseUrl = config.url.replace(/\/+$/, "");
  init({
    baseUrl: `${baseUrl}/api`,
    apiKey: config.apiKey,
  });
}
