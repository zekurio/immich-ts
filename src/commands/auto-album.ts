import {
  searchAssets,
  createAlbum,
  getAllAlbums,
  AssetVisibility,
  type AlbumResponseDto,
} from "@immich/sdk";
import type { CommandOption } from "../registry.ts";

export const autoAlbumCommandMeta = {
  name: "auto-album",
  description: "Create albums from assets matching date and location criteria",
  options: [
    {
      name: "name",
      type: "string",
      required: true,
      description: "Name for the album to create",
      placeholder: "name",
    },
    {
      name: "after",
      type: "string",
      required: true,
      description: "Start date for asset filter (ISO format)",
      placeholder: "date",
    },
    {
      name: "before",
      type: "string",
      required: true,
      description: "End date for asset filter (ISO format)",
      placeholder: "date",
    },
    {
      name: "location",
      type: "string",
      required: true,
      multiple: true,
      description: "Location to filter by (repeatable)",
      placeholder: "loc",
    },
    {
      name: "dry-run",
      type: "boolean",
      description: "Preview without creating the album",
    },
    {
      name: "verbose",
      type: "boolean",
      description: "Show detailed progress",
    },
  ] as CommandOption[],
  examples: [
    'immich-ts auto-album --name "Rome Vacation" --after 2024-06-01 --before 2024-06-15 --location Rome --location "Vatican City"',
  ],
};

interface AutoAlbumOptions {
  name: string;
  after: string;
  before: string;
  locations: string[];
  dryRun: boolean;
  verbose: boolean;
}

interface AssetData {
  id: string;
  originalFileName: string;
}

type LocationField = "city" | "country" | "state";

interface LocationSearchParams {
  location: string;
  takenAfter?: string;
  takenBefore?: string;
}

interface LocationSearchResult {
  assets: AssetData[];
  countsByField: Record<LocationField, number>;
}

const LOCATION_FIELDS: LocationField[] = ["city", "country", "state"];

function parseDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}. Use ISO format (YYYY-MM-DD)`);
  }
  return date.toISOString();
}

async function searchAssetsByField(
  params: LocationSearchParams,
  field: LocationField,
): Promise<AssetData[]> {
  const result: AssetData[] = [];
  let page = 1;
  const size = 1000;
  let hasMore = true;

  while (hasMore) {
    const metadataSearchDto: {
      page: number;
      size: number;
      visibility: AssetVisibility;
      takenAfter?: string;
      takenBefore?: string;
      withStacked: boolean;
      city?: string;
      country?: string;
      state?: string;
    } = {
      page,
      size,
      visibility: AssetVisibility.Timeline,
      takenAfter: params.takenAfter,
      takenBefore: params.takenBefore,
      withStacked: false,
    };

    if (field === "city") {
      metadataSearchDto.city = params.location;
    } else if (field === "country") {
      metadataSearchDto.country = params.location;
    } else {
      metadataSearchDto.state = params.location;
    }

    const response = await searchAssets({
      metadataSearchDto,
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

async function findAssetsForLocation(
  params: LocationSearchParams,
): Promise<LocationSearchResult> {
  const searchResults = await Promise.all(
    LOCATION_FIELDS.map(async (field) => {
      const assets = await searchAssetsByField(params, field);
      return { field, assets };
    }),
  );

  const countsByField: Record<LocationField, number> = {
    city: 0,
    country: 0,
    state: 0,
  };
  const allResults: AssetData[] = [];

  for (const { field, assets } of searchResults) {
    countsByField[field] = assets.length;
    allResults.push(...assets);
  }

  const seenIds = new Set<string>();
  const uniqueResults: AssetData[] = [];

  for (const asset of allResults) {
    if (!seenIds.has(asset.id)) {
      seenIds.add(asset.id);
      uniqueResults.push(asset);
    }
  }

  return {
    assets: uniqueResults,
    countsByField,
  };
}

function albumExistsByName(albums: AlbumResponseDto[], name: string): boolean {
  return albums.some((album) => album.albumName === name);
}

function formatAssetCount(count: number): string {
  return `${count} asset${count !== 1 ? "s" : ""}`;
}

export async function autoAlbum(options: AutoAlbumOptions): Promise<number> {
  const afterDate = parseDate(options.after);
  const beforeDate = parseDate(options.before);
  const verboseLog = options.verbose
    ? (message: string) => console.log(`    ${message}`)
    : () => {};

  console.log("\nImmich Auto-Album Tool\n");
  console.log(`  Album name:     ${options.name}`);
  console.log(`  Date range:     ${options.after} to ${options.before}`);
  console.log(`  Locations:      ${options.locations.join(", ")}`);
  console.log(`  Dry run:        ${options.dryRun ? "Yes" : "No"}`);
  console.log();

  console.log("Checking for existing album...");
  const allAlbums = await getAllAlbums({});
  if (albumExistsByName(allAlbums, options.name)) {
    console.error(`\nError: Album "${options.name}" already exists.\n`);
    return 1;
  }
  console.log("  No duplicate found.\n");

  console.log("Searching for matching assets...");
  const locationResults: Array<{ location: string; count: number }> = [];
  const allAssetIds = new Set<string>();

  for (const location of options.locations) {
    console.log(`  Location "${location}"...`);
    const locationSearch = await findAssetsForLocation({
      location,
      takenAfter: afterDate,
      takenBefore: beforeDate,
    });

    if (options.verbose) {
      console.log(
        `    by field: city=${locationSearch.countsByField.city}, country=${locationSearch.countsByField.country}, state=${locationSearch.countsByField.state}`,
      );
    }

    const newAssets = locationSearch.assets.filter((asset) => !allAssetIds.has(asset.id));
    for (const asset of newAssets) {
      allAssetIds.add(asset.id);
    }

    if (options.verbose && newAssets.length > 0) {
      for (const asset of newAssets.slice(0, 5)) {
        verboseLog(`+ ${asset.originalFileName}`);
      }
      if (newAssets.length > 5) {
        verboseLog(`... and ${newAssets.length - 5} more`);
      }
    }

    locationResults.push({ location, count: newAssets.length });
    console.log(`    ${formatAssetCount(newAssets.length)}\n`);
  }

  const uniqueAssetCount = allAssetIds.size;

  console.log("Summary:");
  console.log(`  Total unique assets: ${formatAssetCount(uniqueAssetCount)}\n`);

  if (locationResults.length > 0) {
    console.log("Assets per location:");
    for (const { location, count } of locationResults) {
      console.log(`  - ${location}: ${formatAssetCount(count)}`);
    }
    console.log();
  }

  if (uniqueAssetCount === 0) {
    console.warn("Warning: No assets found matching the criteria.\n");
  }

  if (options.dryRun) {
    console.log("[dry-run] Would create album");
    console.log(`  Name: "${options.name}"`);
    console.log(`  Assets: ${formatAssetCount(uniqueAssetCount)}\n`);
    return 0;
  }

  if (uniqueAssetCount === 0) {
    console.log("Creating empty album...\n");
  } else {
    console.log(`Creating album with ${formatAssetCount(uniqueAssetCount)}...\n`);
  }

  try {
    const album = await createAlbum({
      createAlbumDto: {
        albumName: options.name,
        assetIds: Array.from(allAssetIds),
      },
    });

    console.log(`Created album "${album.albumName}"`);
    console.log(`  Album ID: ${album.id}`);
    console.log(`  Assets: ${formatAssetCount(uniqueAssetCount)}\n`);

    return 0;
  } catch (err) {
    console.error(
      `\nFailed to create album: ${err instanceof Error ? err.message : "Unknown error"}\n`
    );
    return 1;
  }
}
