import { describe, it, expect } from "bun:test";

function getFileStem(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) return fileName;
  return fileName.substring(0, lastDot);
}

describe("getFileStem", () => {
  it("should extract stem from file with extension", () => {
    expect(getFileStem("IMG_001.jpg")).toBe("IMG_001");
    expect(getFileStem("photo.DNG")).toBe("photo");
    expect(getFileStem("20240115_143022.jpeg")).toBe("20240115_143022");
  });

  it("should handle multiple dots in filename", () => {
    expect(getFileStem("IMG_001.20240115.jpg")).toBe("IMG_001.20240115");
    expect(getFileStem("photo.edit.v2.dng")).toBe("photo.edit.v2");
  });

  it("should return filename unchanged if no extension", () => {
    expect(getFileStem("README")).toBe("README");
    expect(getFileStem("photo")).toBe("photo");
  });

  it("should handle empty string", () => {
    expect(getFileStem("")).toBe("");
  });

  it("should handle files starting with dot", () => {
    expect(getFileStem(".hidden.dng")).toBe(".hidden");
  });

  it("should handle single character extension", () => {
    expect(getFileStem("file.a")).toBe("file");
    expect(getFileStem("file.x")).toBe("file");
  });
});

describe("Regex pattern matching", () => {
  const coverPattern = /\.(jpg|jpeg)$/i;
  const rawPattern = /\.dng$/i;

  function matchesCover(fileName: string): boolean {
    return coverPattern.test(fileName);
  }

  function matchesRaw(fileName: string): boolean {
    return rawPattern.test(fileName);
  }

  describe("matchesCover", () => {
    it("should match jpg files", () => {
      expect(matchesCover("IMG_001.jpg")).toBe(true);
      expect(matchesCover("photo.jpg")).toBe(true);
    });

    it("should match jpeg files", () => {
      expect(matchesCover("IMG_001.jpeg")).toBe(true);
      expect(matchesCover("photo.jpeg")).toBe(true);
    });

    it("should be case insensitive", () => {
      expect(matchesCover("IMG_001.JPG")).toBe(true);
      expect(matchesCover("IMG_001.JPEG")).toBe(true);
    });

    it("should not match non-image files", () => {
      expect(matchesCover("IMG_001.dng")).toBe(false);
      expect(matchesCover("IMG_001.mp4")).toBe(false);
      expect(matchesCover("document.pdf")).toBe(false);
    });
  });

  describe("matchesRaw", () => {
    it("should match dng files", () => {
      expect(matchesRaw("IMG_001.dng")).toBe(true);
      expect(matchesRaw("photo.dng")).toBe(true);
    });

    it("should be case insensitive", () => {
      expect(matchesRaw("IMG_001.DNG")).toBe(true);
    });

    it("should not match non-raw files", () => {
      expect(matchesRaw("IMG_001.jpg")).toBe(false);
      expect(matchesRaw("IMG_001.arw")).toBe(false);
    });
  });
});

describe("Date parsing", () => {
  function parseDateFilter(
    dateStr?: string
  ): { gte?: string; lte?: string } | undefined {
    if (!dateStr) return undefined;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${dateStr}`);
    }
    return { gte: date.toISOString() };
  }

  it("should parse valid ISO date", () => {
    const result = parseDateFilter("2024-01-15");
    expect(result?.gte).toBeDefined();
    expect(result?.gte?.startsWith("2024-01-15")).toBe(true);
  });

  it("should return undefined for empty date", () => {
    expect(parseDateFilter(undefined)).toBeUndefined();
    expect(parseDateFilter("")).toBeUndefined();
  });

  it("should throw for invalid date format", () => {
    expect(() => parseDateFilter("not-a-date")).toThrow();
    expect(() => parseDateFilter("invalid")).toThrow();
  });

  it("should parse full datetime string", () => {
    const result = parseDateFilter("2024-01-15T10:30:00Z");
    expect(result?.gte).toBeDefined();
  });
});
