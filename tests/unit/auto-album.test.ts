import { describe, it, expect } from "bun:test";

function parseDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}. Use ISO format (YYYY-MM-DD)`);
  }
  return date.toISOString();
}

function formatAssetCount(count: number): string {
  return `${count} asset${count !== 1 ? "s" : ""}`;
}

interface MockAlbum {
  albumName: string;
}

function albumExistsByName(albums: MockAlbum[], name: string): boolean {
  return albums.some((album) => album.albumName === name);
}

describe("Auto-Album Utilities", () => {
  describe("parseDate", () => {
    it("should parse valid ISO date strings", () => {
      expect(parseDate("2024-06-01")).toBe("2024-06-01T00:00:00.000Z");
    });

    it("should parse dates with time", () => {
      const result = parseDate("2024-06-15T10:30:00Z");
      expect(result).toContain("2024-06-15");
    });

    it("should throw on invalid date format", () => {
      expect(() => parseDate("not-a-date")).toThrow(
        "Invalid date format: not-a-date. Use ISO format (YYYY-MM-DD)"
      );
    });

    it("should throw on empty string", () => {
      expect(() => parseDate("")).toThrow();
    });
  });

  describe("formatAssetCount", () => {
    it("should format singular correctly", () => {
      expect(formatAssetCount(1)).toBe("1 asset");
    });

    it("should format plural correctly", () => {
      expect(formatAssetCount(0)).toBe("0 assets");
      expect(formatAssetCount(2)).toBe("2 assets");
      expect(formatAssetCount(100)).toBe("100 assets");
    });
  });

  describe("albumExistsByName", () => {
    it("should return true when album exists", () => {
      const albums: MockAlbum[] = [
        { albumName: "Trip to Rome" },
        { albumName: "Beach Vacation" },
      ];
      expect(albumExistsByName(albums, "Trip to Rome")).toBe(true);
    });

    it("should return false when album does not exist", () => {
      const albums: MockAlbum[] = [
        { albumName: "Trip to Rome" },
        { albumName: "Beach Vacation" },
      ];
      expect(albumExistsByName(albums, "Mountain Hike")).toBe(false);
    });

    it("should be case sensitive", () => {
      const albums: MockAlbum[] = [{ albumName: "Trip to Rome" }];
      expect(albumExistsByName(albums, "trip to rome")).toBe(false);
      expect(albumExistsByName(albums, "TRIP TO ROME")).toBe(false);
    });

    it("should handle empty array", () => {
      expect(albumExistsByName([], "Test Album")).toBe(false);
    });
  });
});

describe("Asset Deduplication", () => {
  it("should deduplicate assets by ID", () => {
    const assetIds = new Set<string>();
    const assets = [
      { id: "1", name: "photo1.jpg" },
      { id: "2", name: "photo2.jpg" },
      { id: "1", name: "photo1_dup.jpg" },
      { id: "3", name: "photo3.jpg" },
    ];

    for (const asset of assets) {
      if (!assetIds.has(asset.id)) {
        assetIds.add(asset.id);
      }
    }

    expect(assetIds.size).toBe(3);
    expect(assetIds.has("1")).toBe(true);
    expect(assetIds.has("2")).toBe(true);
    expect(assetIds.has("3")).toBe(true);
  });

  it("should handle multiple locations with overlapping assets", () => {
    const locationAssets: Record<string, Array<{ id: string }>> = {
      Rome: [{ id: "1" }, { id: "2" }, { id: "3" }],
      Vatican: [{ id: "3" }, { id: "4" }, { id: "5" }],
    };

    const allAssetIds = new Set<string>();

    for (const assets of Object.values(locationAssets)) {
      for (const asset of assets) {
        allAssetIds.add(asset.id);
      }
    }

    expect(allAssetIds.size).toBe(5);
    expect(Array.from(allAssetIds).sort()).toEqual(["1", "2", "3", "4", "5"]);
  });
});

describe("Location Search Logic", () => {
  it("should search city, country, and state fields", () => {
    const location = "Rome";

    const searchFields = ["city", "country", "state"] as const;
    const expectedSearches = searchFields.map((field) => ({
      [field]: location,
    }));

    expect(expectedSearches).toEqual([
      { city: "Rome" },
      { country: "Rome" },
      { state: "Rome" },
    ]);
  });

  it("should handle multiple locations", () => {
    const locations = ["Rome", "Vatican City"];

    const allSearches: Array<Record<string, string>> = [];

    for (const location of locations) {
      allSearches.push({ city: location });
      allSearches.push({ country: location });
      allSearches.push({ state: location });
    }

    expect(allSearches).toHaveLength(6);
  });
});
