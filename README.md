# immich-ts

A TypeScript CLI tool and API client for [Immich](https://immich.app) - the self-hosted photo and video management solution.

## Setup

### Prerequisites

- [Bun](https://bun.sh) runtime (v1.0+)

### 

```bash
git clone https://codeberg.org/zekurio/immich-ts.git && cd immich-ts && bun install && bun run build
```

The compiled binary can be found in the newly created `dist` folder.

## Configuration

The CLI requires two configuration values:

| Variable | Description |
|----------|-------------|
| `IMMICH_URL` | Your Immich server URL (e.g., `https://immich.example.com`) |
| `IMMICH_API_KEY` | Your Immich API key |

You can set these via environment variables or a `.env` file in the project root:

### Example `.env` file

```bash
IMMICH_URL=https://immich.example.com
IMMICH_API_KEY=your-api-key-here
```

## Usage

### Building

Compile to a single executable:

```bash
bun run build
```

This creates `dist/immich-ts` which can be run directly.

### Development

```bash
bun run dev
```

## Commands

### validate

Test the connection to your Immich server.

```bash
immich-ts validate
```

### stack

Stack RAW+JPG pairs from Google Pixel and other cameras. This is useful when your camera saves both a RAW file and a processed JPEG, and you want them grouped together in Immich.

```bash
immich-ts stack --cover <regex> --raw <regex> [options]
```

#### Required Options

| Option | Description |
|--------|-------------|
| `--cover <regex>` | Regex pattern matching cover/primary images (e.g., `\.(jpg\|jpeg)$`) |
| `--raw <regex>` | Regex pattern matching RAW/secondary images (e.g., `\.dng$`) |

#### Optional Options

| Option | Description |
|--------|-------------|
| `--stem-pattern <regex>` | Regex with capture group to extract the matching identifier from filenames |
| `--dry-run` | Preview which pairs would be stacked without making changes |
| `--after <date>` | Only process assets taken after this date (ISO format: YYYY-MM-DD) |
| `--before <date>` | Only process assets taken before this date |
| `--album <id>` | Only process assets in a specific album |
| `--verbose` | Show detailed progress and matching information |

#### How Matching Works

By default, files are matched by their **stem** (filename without extension). For example:
- `photo.jpg` and `photo.dng` match because both have stem `photo`

However, some cameras (like Google Pixel) use different naming conventions where the stem differs:
- `PXL_20260118_132254844.RAW-01.COVER.jpg`
- `PXL_20260118_132254844.RAW-02.ORIGINAL.dng`

For these cases, use `--stem-pattern` with a capture group to extract the common identifier:

```bash
immich-ts stack \
  --cover "\.(jpg|jpeg)$" \
  --raw "\.dng$" \
  --stem-pattern "^(PXL_\d+_\d+)" \
  --dry-run
```

This extracts `PXL_20260118_132254844` from both filenames, allowing them to match.

#### Examples

```bash
# Basic usage - match JPEGs with DNG files
immich-ts stack --cover "\.jpg$" --raw "\.dng$" --dry-run

# Google Pixel RAW+JPEG stacking
immich-ts stack \
  --cover "\.(jpg|jpeg)$" \
  --raw "\.dng$" \
  --stem-pattern "^(PXL_\d+_\d+)" \
  --dry-run

# Stack only recent photos
immich-ts stack \
  --cover "\.jpg$" \
  --raw "\.arw$" \
  --after 2025-01-01 \
  --dry-run

# Stack photos in a specific album
immich-ts stack \
  --cover "\.jpg$" \
  --raw "\.dng$" \
  --album abc123-def456 \
  --dry-run
```

### auto-album

Automatically create albums from assets matching date range and location criteria. This is useful for organizing vacation photos or events by searching across city, state, and country metadata.

```bash
immich-ts auto-album --name <name> --after <date> --before <date> --location <loc> [options]
```

#### Required Options

| Option | Description |
|--------|-------------|
| `--name <name>` | Name for the album to create |
| `--after <date>` | Start date for asset filter (ISO format: YYYY-MM-DD) |
| `--before <date>` | End date for asset filter (ISO format: YYYY-MM-DD) |
| `--location <loc>` | Location to filter by (can be specified multiple times) |

#### Optional Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Preview which assets would be added without creating the album |
| `--verbose` | Show detailed progress |

#### How Location Matching Works

The command searches across multiple location fields in parallel:
- **City** (e.g., "Rome", "Paris")
- **State** (e.g., "California", "Lazio")
- **Country** (e.g., "Italy", "France")

Results are deduplicated, so an asset won't be added twice if it matches multiple criteria.

#### Examples

```bash
# Create a vacation album for Rome trip
immich-ts auto-album \
  --name "Rome Vacation 2024" \
  --after 2024-06-01 \
  --before 2024-06-15 \
  --location Rome \
  --location "Vatican City" \
  --dry-run

# Create an album for a California road trip
immich-ts auto-album \
  --name "California Road Trip" \
  --after 2024-07-01 \
  --before 2024-07-14 \
  --location California \
  --dry-run
```

## Global Options

| Option | Description |
|--------|-------------|
| `--help` | Show help message |
