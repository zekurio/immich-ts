import { type Config } from "../env.ts";
import type { CommandOption } from "../registry.ts";
import {
  searchAssets,
  getAlbumInfo,
  createStack,
  AssetVisibility,
  type AssetResponseDto,
} from "../api/index.ts";

export const stackCommandMeta = {
  name: "stack",
  description:
    "Stack RAW+JPG pairs created by Google Pixel phones and other cameras",
  options: [
    {
      name: "cover",
      type: "string",
      required: true,
      description: "Regex pattern for cover/primary images",
      placeholder: "regex",
    },
    {
      name: "raw",
      type: "string",
      required: true,
      description: "Regex pattern for RAW/secondary images",
      placeholder: "regex",
    },
    {
      name: "stem-pattern",
      type: "string",
      description: "Regex with capture group to extract matching stem",
      placeholder: "regex",
    },
    {
      name: "dry-run",
      type: "boolean",
      description: "Preview pairs without creating stacks",
    },
    {
      name: "after",
      type: "string",
      description: "Only process assets after this date (ISO format)",
      placeholder: "date",
    },
    {
      name: "before",
      type: "string",
      description: "Only process assets before this date (ISO format)",
      placeholder: "date",
    },
    {
      name: "album",
      type: "string",
      description: "Only process assets in this album",
      placeholder: "id",
    },
    {
      name: "verbose",
      type: "boolean",
      description: "Show detailed progress",
    },
  ] as CommandOption[],
  examples: [
    'immich-ts stack --cover "\\.(jpg|jpeg)$" --raw "\\.dng$" --dry-run',
    'immich-ts stack --cover "\\.jpg$" --raw "\\.dng$" --album abc123',
  ],
};

interface StackOptions {
  coverPattern: string;
  rawPattern: string;
  stemPattern?: string;
  dryRun: boolean;
  after?: string;
  before?: string;
  albumId?: string;
  verbose: boolean;
}

interface AssetPair {
  coverAssetId: string;
  coverFileName: string;
  rawAssetId: string;
  rawFileName: string;
  stem: string;
}

interface StackingResult {
  pairs: AssetPair[];
  skippedNoMatch: number;
  stacksCreated: number;
}

interface AssetData {
  id: string;
  originalFileName: string;
}

function parseDate(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(
      `Invalid date format: ${dateStr}. Use ISO format (YYYY-MM-DD)`,
    );
  }
  return date.toISOString();
}

async function fetchAssets(options: {
  takenAfter?: string;
  takenBefore?: string;
}): Promise<AssetData[]> {
  const result: AssetData[] = [];
  let page = 1;
  const size = 1000;
  let hasMore = true;

  while (hasMore) {
    const response = await searchAssets({
      metadataSearchDto: {
        page,
        size,
        visibility: AssetVisibility.Timeline,
        takenAfter: options.takenAfter,
        takenBefore: options.takenBefore,
        withStacked: false,
      },
    });

    const assets = response.assets.items;

    for (const asset of assets) {
      result.push({
        id: asset.id,
        originalFileName: asset.originalFileName,
      });
    }

    if (assets.length < size) {
      hasMore = false;
    } else {
      page++;
    }
  }

  return result;
}

async function fetchAlbumAssets(albumId: string): Promise<AssetData[]> {
  const album = await getAlbumInfo({ id: albumId });
  return (album.assets ?? []).map((a: AssetResponseDto) => ({
    id: a.id,
    originalFileName: a.originalFileName,
  }));
}

function getFileStem(
  fileName: string,
  stemPattern?: RegExp,
  warnOnNoMatch?: (fileName: string) => void,
): string {
  if (stemPattern) {
    const match = fileName.match(stemPattern);
    if (match && match[1]) return match[1];
    warnOnNoMatch?.(fileName);
  }
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) return fileName;
  return fileName.substring(0, lastDot);
}

async function findMatchingPairs(
  assets: AssetData[],
  coverPattern: RegExp,
  rawPattern: RegExp,
  stemPattern: RegExp | undefined,
  verbose: boolean,
): Promise<StackingResult> {
  const stemToAssets = new Map<string, { cover?: string; raw: string[] }>();
  const assetDetails = new Map<string, { fileName: string }>();
  const total = assets.length;
  const verboseLog = verbose
    ? (msg: string) => console.log(`  ${msg}`)
    : () => {};

  const stemPatternMismatches = new Set<string>();
  const warnOnNoMatch = stemPattern
    ? (fileName: string) => stemPatternMismatches.add(fileName)
    : undefined;

  const replacedCovers: Array<{
    stem: string;
    oldFile: string;
    newFile: string;
  }> = [];

  console.log(`  Processing ${total} assets...`);

  for (const asset of assets) {
    const stem = getFileStem(
      asset.originalFileName,
      stemPattern,
      warnOnNoMatch,
    );
    const isCover = coverPattern.test(asset.originalFileName);
    const isRaw = rawPattern.test(asset.originalFileName);

    assetDetails.set(asset.id, {
      fileName: asset.originalFileName,
    });

    if (!stemToAssets.has(stem)) {
      stemToAssets.set(stem, { cover: undefined, raw: [] });
    }
    const entry = stemToAssets.get(stem)!;

    if (isCover) {
      if (entry.cover) {
        const oldCoverFileName = assetDetails.get(entry.cover)!.fileName;
        replacedCovers.push({
          stem,
          oldFile: oldCoverFileName,
          newFile: asset.originalFileName,
        });
      }
      entry.cover = asset.id;
    } else if (isRaw) {
      entry.raw.push(asset.id);
    }
  }

  if (stemPatternMismatches.size > 0) {
    console.warn(
      `  Warning: --stem-pattern did not match ${stemPatternMismatches.size} file(s). ` +
        `Using default stem extraction for these files.`,
    );
    if (verbose) {
      for (const fileName of Array.from(stemPatternMismatches).slice(0, 10)) {
        console.warn(`    - ${fileName}`);
      }
      if (stemPatternMismatches.size > 10) {
        console.warn(`    ... and ${stemPatternMismatches.size - 10} more`);
      }
    }
  }

  if (replacedCovers.length > 0) {
    console.warn(
      `  Warning: ${replacedCovers.length} stem(s) had multiple cover matches. ` +
        `Only the last match will be used as the cover.`,
    );
    if (verbose) {
      for (const { stem, oldFile, newFile } of replacedCovers.slice(0, 10)) {
        console.warn(`    - ${stem}: "${oldFile}" replaced by "${newFile}"`);
      }
      if (replacedCovers.length > 10) {
        console.warn(`    ... and ${replacedCovers.length - 10} more`);
      }
    }
  }

  const pairs: AssetPair[] = [];
  let skippedNoMatch = 0;

  verboseLog(`Analyzing ${stemToAssets.size} filename groups...`);

  for (const [stem, stemAssets] of stemToAssets) {
    if (stemAssets.cover && stemAssets.raw.length > 0) {
      for (const rawId of stemAssets.raw) {
        const coverDetails = assetDetails.get(stemAssets.cover)!;
        const rawDetails = assetDetails.get(rawId)!;

        pairs.push({
          coverAssetId: stemAssets.cover,
          coverFileName: coverDetails.fileName,
          rawAssetId: rawId,
          rawFileName: rawDetails.fileName,
          stem,
        });
      }
    } else if (!stemAssets.cover && stemAssets.raw.length > 0) {
      skippedNoMatch += stemAssets.raw.length;
    } else if (stemAssets.cover && stemAssets.raw.length === 0) {
      skippedNoMatch++;
    }
  }

  return {
    pairs,
    skippedNoMatch,
    stacksCreated: 0,
  };
}

async function createStacks(pairs: AssetPair[]): Promise<number> {
  let created = 0;

  for (const pair of pairs) {
    try {
      await createStack({
        stackCreateDto: {
          assetIds: [pair.coverAssetId, pair.rawAssetId],
        },
      });
      created++;
      console.log(
        `  Created stack: ${pair.coverFileName} + ${pair.rawFileName}`,
      );
    } catch (err) {
      console.error(
        `  Failed to create stack for ${pair.stem}: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      );
    }
  }

  return created;
}

function compileRegex(pattern: string, name: string): RegExp {
  try {
    return new RegExp(pattern);
  } catch (err) {
    throw new Error(
      `Invalid regex for --${name}: ${err instanceof SyntaxError ? err.message : "Unknown error"}`,
    );
  }
}

/**
 * Stack matching cover and raw image pairs in Immich.
 * @returns Exit code (0 = success, 1 = partial failure)
 */
export async function stack(
  config: Config,
  options: StackOptions,
): Promise<number> {
  const coverRegex = compileRegex(options.coverPattern, "cover");
  const rawRegex = compileRegex(options.rawPattern, "raw");
  const stemRegex = options.stemPattern
    ? compileRegex(options.stemPattern, "stem-pattern")
    : undefined;

  console.log("\nImmich Stack Tool\n");
  console.log(`  Cover pattern:  ${options.coverPattern}`);
  console.log(`  Raw pattern:    ${options.rawPattern}`);
  if (options.stemPattern)
    console.log(`  Stem pattern:   ${options.stemPattern}`);
  console.log(`  Dry run:        ${options.dryRun ? "Yes" : "No"}`);
  if (options.albumId) console.log(`  Album ID:       ${options.albumId}`);
  if (options.after) console.log(`  After:          ${options.after}`);
  if (options.before) console.log(`  Before:         ${options.before}`);
  console.log();

  let assets: AssetData[];

  if (options.albumId) {
    if (options.after || options.before) {
      console.warn(
        "Warning: --after and --before filters are ignored when using --album\n",
      );
    }
    console.log("Fetching album assets...");
    assets = await fetchAlbumAssets(options.albumId);
    console.log(`  Found ${assets.length} assets in album\n`);
  } else {
    console.log("Fetching assets...");
    const afterDate = parseDate(options.after);
    const beforeDate = parseDate(options.before);
    assets = await fetchAssets({
      takenAfter: afterDate,
      takenBefore: beforeDate,
    });
    console.log(`  Found ${assets.length} assets\n`);
  }

  if (assets.length === 0) {
    console.log("No assets found matching the criteria.\n");
    return 0;
  }

  console.log("Analyzing assets for matching pairs...\n");
  const result = await findMatchingPairs(
    assets,
    coverRegex,
    rawRegex,
    stemRegex,
    options.verbose,
  );

  console.log("\nResults:");
  console.log(`  Total pairs found:  ${result.pairs.length}`);
  console.log(`  Skipped (no match): ${result.skippedNoMatch}`);
  console.log();

  if (result.pairs.length === 0) {
    console.log("No pairs to stack.\n");
    return 0;
  }

  if (options.verbose || result.pairs.length <= 20) {
    console.log("Pairs to stack:");
    for (const pair of result.pairs) {
      console.log(`  ${pair.coverFileName} + ${pair.rawFileName}`);
    }
    console.log();
  } else {
    console.log("First 20 pairs:");
    for (const pair of result.pairs.slice(0, 20)) {
      console.log(`  ${pair.coverFileName} + ${pair.rawFileName}`);
    }
    console.log(`  ... and ${result.pairs.length - 20} more\n`);
  }

  if (options.dryRun) {
    console.log(
      `Dry run complete. ${result.pairs.length} stacks would be created.\n`,
    );
    return 0;
  }

  console.log(`Creating ${result.pairs.length} stacks...\n`);
  result.stacksCreated = await createStacks(result.pairs);

  console.log("\nSummary:");
  console.log(`  Stacks created:  ${result.stacksCreated}`);
  console.log(
    `  Failed:          ${result.pairs.length - result.stacksCreated}\n`,
  );

  return result.stacksCreated === result.pairs.length ? 0 : 1;
}
