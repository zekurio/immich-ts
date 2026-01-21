/**
 * Immich API Client
 *
 * Auto-initialized wrapper around the official @immich/sdk.
 * Reads configuration from environment variables on module load.
 */

import {
  init,
  pingServer as sdkPingServer,
  getMyUser as sdkGetMyUser,
  searchAssets as sdkSearchAssets,
  getAlbumInfo as sdkGetAlbumInfo,
  createStack as sdkCreateStack,
  createAlbum as sdkCreateAlbum,
  getAllAlbums as sdkGetAllAlbums,
  isHttpError as sdkIsHttpError,
  AssetVisibility as SdkAssetVisibility,
  type AssetResponseDto,
  type AlbumResponseDto,
  type ApiHttpError,
} from "@immich/sdk";

import { getConfig } from "../env.ts";

// Auto-initialize client from environment config
const config = getConfig();
const baseUrl = config.url.replace(/\/+$/, "");
init({
  baseUrl: `${baseUrl}/api`,
  apiKey: config.apiKey,
});

export async function pingServer(): Promise<{ res: string }> {
  return sdkPingServer();
}

export async function getMyUser(): Promise<{ name: string; email: string }> {
  return sdkGetMyUser();
}

export async function searchAssets(params: {
  metadataSearchDto: {
    page: number;
    size: number;
    visibility: typeof SdkAssetVisibility.Timeline;
    takenAfter?: string;
    takenBefore?: string;
    city?: string;
    country?: string;
    state?: string;
    withStacked: boolean;
  };
}): Promise<{ assets: { items: AssetResponseDto[] } }> {
  return sdkSearchAssets(params);
}

export async function getAlbumInfo(params: {
  id: string;
}): Promise<{ assets?: AssetResponseDto[] }> {
  return sdkGetAlbumInfo(params);
}

export async function createStack(params: {
  stackCreateDto: { assetIds: string[] };
}): Promise<void> {
  await sdkCreateStack(params);
}

export async function createAlbum(params: {
  createAlbumDto: { albumName: string; assetIds?: string[] };
}): Promise<{ id: string; albumName: string }> {
  return sdkCreateAlbum(params);
}

export async function getAllAlbums(params: object): Promise<AlbumResponseDto[]> {
  return sdkGetAllAlbums(params);
}

export function isHttpError(error: unknown): error is ApiHttpError {
  return sdkIsHttpError(error);
}

export const AssetVisibility = SdkAssetVisibility;

export type { AssetResponseDto, AlbumResponseDto, ApiHttpError };
