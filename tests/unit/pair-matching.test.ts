import { describe, it, expect } from "bun:test";

interface MockAsset {
  id: string;
  originalFileName: string;
  stack?: { id: string } | null;
}

interface AssetPair {
  coverAssetId: string;
  coverFileName: string;
  rawAssetId: string;
  rawFileName: string;
  stem: string;
}

function getFileStem(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) return fileName;
  return fileName.substring(0, lastDot);
}

interface MatchingResult {
  pairs: AssetPair[];
  skippedNoMatch: number;
  skippedAlreadyStacked: number;
}

function findMatchingPairs(
  assets: MockAsset[],
  coverPattern: RegExp,
  rawPattern: RegExp
): MatchingResult {
  const stemToAssets = new Map<
    string,
    { cover?: string; raw: string[] }
  >();

  for (const asset of assets) {
    const stem = getFileStem(asset.originalFileName);
    const isCover = coverPattern.test(asset.originalFileName);
    const isRaw = rawPattern.test(asset.originalFileName);

    if (!stemToAssets.has(stem)) {
      stemToAssets.set(stem, { cover: undefined, raw: [] });
    }
    const entry = stemToAssets.get(stem)!;

    if (isCover) {
      entry.cover = asset.id;
    } else if (isRaw) {
      entry.raw.push(asset.id);
    }
  }

  const pairs: AssetPair[] = [];
  let skippedAlreadyStacked = 0;
  let skippedNoMatch = 0;

  for (const [stem, assetsGroup] of stemToAssets) {
    if (assetsGroup.cover && assetsGroup.raw.length > 0) {
      for (const rawId of assetsGroup.raw) {
        const coverAsset = assets.find((a) => a.id === assetsGroup.cover);
        const rawAsset = assets.find((a) => a.id === rawId);

        if (!coverAsset || !rawAsset) continue;

        if (coverAsset.stack || rawAsset.stack) {
          skippedAlreadyStacked++;
          continue;
        }

        pairs.push({
          coverAssetId: assetsGroup.cover,
          coverFileName: coverAsset.originalFileName,
          rawAssetId: rawId,
          rawFileName: rawAsset.originalFileName,
          stem,
        });
      }
    } else {
      if (!assetsGroup.cover && assetsGroup.raw.length > 0) {
        skippedNoMatch += assetsGroup.raw.length;
      }
      if (assetsGroup.cover && assetsGroup.raw.length === 0) {
        skippedNoMatch++;
      }
    }
  }

  return { pairs, skippedNoMatch, skippedAlreadyStacked };
}

describe("Pair Matching Algorithm", () => {
  const coverPattern = /\.(jpg|jpeg)$/i;
  const rawPattern = /\.dng$/i;

  describe("Basic matching", () => {
    it("should match a simple pair", () => {
      const assets: MockAsset[] = [
        { id: "1", originalFileName: "IMG_001.jpg" },
        { id: "2", originalFileName: "IMG_001.dng" },
      ];

      const result = findMatchingPairs(assets, coverPattern, rawPattern);

      expect(result.pairs).toHaveLength(1);
      expect(result.pairs[0]!.coverAssetId).toBe("1");
      expect(result.pairs[0]!.rawAssetId).toBe("2");
      expect(result.skippedAlreadyStacked).toBe(0);
      expect(result.skippedNoMatch).toBe(0);
    });

    it("should match multiple pairs with same stem", () => {
      const assets: MockAsset[] = [
        { id: "1", originalFileName: "IMG_001.jpg" },
        { id: "2", originalFileName: "IMG_001.dng" },
        { id: "3", originalFileName: "IMG_002.jpg" },
        { id: "4", originalFileName: "IMG_002.dng" },
      ];

      const result = findMatchingPairs(assets, coverPattern, rawPattern);

      expect(result.pairs).toHaveLength(2);
      expect(result.pairs[0]!.stem).toBe("IMG_001");
      expect(result.pairs[1]!.stem).toBe("IMG_002");
    });

    it("should handle multiple raw files for same cover", () => {
      const assets: MockAsset[] = [
        { id: "1", originalFileName: "IMG_001.jpg" },
        { id: "2", originalFileName: "IMG_001.dng" },
        { id: "3", originalFileName: "IMG_001.arw" },
      ];

      const rawPatternExtended = /\.(dng|arw)$/i;
      const result = findMatchingPairs(assets, coverPattern, rawPatternExtended);

      expect(result.pairs).toHaveLength(2);
      expect(result.pairs[0]!.rawFileName).toBe("IMG_001.dng");
      expect(result.pairs[1]!.rawFileName).toBe("IMG_001.arw");
    });
  });

  describe("Non-matching scenarios", () => {
    it("should skip when only cover exists", () => {
      const assets: MockAsset[] = [
        { id: "1", originalFileName: "IMG_001.jpg" },
      ];

      const result = findMatchingPairs(assets, coverPattern, rawPattern);

      expect(result.pairs).toHaveLength(0);
      expect(result.skippedNoMatch).toBe(1);
    });

    it("should skip when only raw exists", () => {
      const assets: MockAsset[] = [
        { id: "1", originalFileName: "IMG_001.dng" },
      ];

      const result = findMatchingPairs(assets, coverPattern, rawPattern);

      expect(result.pairs).toHaveLength(0);
      expect(result.skippedNoMatch).toBe(1);
    });

    it("should skip files that don't match either pattern", () => {
      const assets: MockAsset[] = [
        { id: "1", originalFileName: "IMG_001.mp4" },
        { id: "2", originalFileName: "IMG_001.jpg" },
        { id: "3", originalFileName: "IMG_001.dng" },
      ];

      const result = findMatchingPairs(assets, coverPattern, rawPattern);

      expect(result.pairs).toHaveLength(1);
      expect(result.skippedNoMatch).toBe(0);
    });
  });

  describe("Already stacked assets", () => {
    it("should skip already stacked cover asset", () => {
      const assets: MockAsset[] = [
        { id: "1", originalFileName: "IMG_001.jpg", stack: { id: "stack1" } },
        { id: "2", originalFileName: "IMG_001.dng" },
      ];

      const result = findMatchingPairs(assets, coverPattern, rawPattern);

      expect(result.pairs).toHaveLength(0);
      expect(result.skippedAlreadyStacked).toBe(1);
    });

    it("should skip already stacked raw asset", () => {
      const assets: MockAsset[] = [
        { id: "1", originalFileName: "IMG_001.jpg" },
        { id: "2", originalFileName: "IMG_001.dng", stack: { id: "stack1" } },
      ];

      const result = findMatchingPairs(assets, coverPattern, rawPattern);

      expect(result.pairs).toHaveLength(0);
      expect(result.skippedAlreadyStacked).toBe(1);
    });
  });

  describe("Google Pixel specific patterns", () => {
    it("should match Google Pixel photos", () => {
      const assets: MockAsset[] = [
        { id: "1", originalFileName: "IMG_20240115_143022.jpg" },
        { id: "2", originalFileName: "IMG_20240115_143022.dng" },
      ];

      const result = findMatchingPairs(assets, coverPattern, rawPattern);

      expect(result.pairs).toHaveLength(1);
      expect(result.pairs[0]!.stem).toBe("IMG_20240115_143022");
    });

    it("should match files with spaces", () => {
      const assets: MockAsset[] = [
        { id: "1", originalFileName: "My Photo 001.jpg" },
        { id: "2", originalFileName: "My Photo 001.dng" },
      ];

      const result = findMatchingPairs(assets, coverPattern, rawPattern);

      expect(result.pairs).toHaveLength(1);
      expect(result.pairs[0]!.stem).toBe("My Photo 001");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty array", () => {
      const assets: MockAsset[] = [];

      const result = findMatchingPairs(assets, coverPattern, rawPattern);

      expect(result.pairs).toHaveLength(0);
      expect(result.skippedNoMatch).toBe(0);
      expect(result.skippedAlreadyStacked).toBe(0);
    });

    it("should handle same file multiple times", () => {
      const assets: MockAsset[] = [
        { id: "1", originalFileName: "IMG_001.jpg" },
        { id: "2", originalFileName: "IMG_001.jpg" },
        { id: "3", originalFileName: "IMG_001.dng" },
      ];

      const result = findMatchingPairs(assets, coverPattern, rawPattern);

      expect(result.pairs).toHaveLength(1);
    });

    it("should handle files with similar but different stems", () => {
      const assets: MockAsset[] = [
        { id: "1", originalFileName: "IMG_001.jpg" },
        { id: "2", originalFileName: "IMG_0010.jpg" },
        { id: "3", originalFileName: "IMG_0010.dng" },
        { id: "4", originalFileName: "IMG_001.dng" },
      ];

      const result = findMatchingPairs(assets, coverPattern, rawPattern);

      expect(result.pairs).toHaveLength(2);
      const stems = result.pairs.map(p => p.stem).sort();
      expect(stems).toEqual(["IMG_001", "IMG_0010"]);
    });
  });
});
