# immich-ts

A TypeScript CLI for [Immich](https://immich.app) focused on validation and media organization workflows.

## What it does

- Validate your Immich URL and API key
- Stack RAW and cover image pairs automatically
- Create albums from date and location filters

## Setup

### Prerequisites

- [Bun](https://bun.sh) runtime (v1.3+)

### Install and build

```bash
git clone https://github.com/zekurio/immich-ts.git
cd immich-ts
bun install
bun run build
```

The compiled binary is created at `dist/immich-ts`.

You can also download pre-built binaries from the [releases page](https://github.com/zekurio/immich-ts/releases).

## Configuration

Set these environment variables (or put them in a `.env` file at the project root):

| Variable | Description |
| --- | --- |
| `IMMICH_URL` | Your Immich server URL (for example, `https://immich.example.com`) |
| `IMMICH_API_KEY` | Your Immich API key |

Example `.env`:

```bash
IMMICH_URL=https://immich.example.com
IMMICH_API_KEY=your-api-key-here
```

## Usage

Show all commands and options:

```bash
immich-ts --help
```

Run directly from source during development:

```bash
bun run dev -- <command> [options]
```

Run the compiled binary:

```bash
./dist/immich-ts <command> [options]
```

## Commands

### `validate`

Checks that your Immich URL is valid, the server is reachable, and your API key can authenticate.

```bash
immich-ts validate
```

### `stack`

Finds matching cover/RAW files and stacks them in Immich.

```bash
immich-ts stack --cover <regex> --raw <regex> [options]
```

Required options:

| Option | Description |
| --- | --- |
| `--cover <regex>` | Regex for cover/primary images (for example, `\.(jpg|jpeg)$`) |
| `--raw <regex>` | Regex for RAW/secondary images (for example, `\.dng$`) |

Optional options:

| Option | Description |
| --- | --- |
| `--stem-pattern <regex>` | Regex with a capture group used as the matching stem |
| `--dry-run` | Preview matches without creating stacks |
| `--after <date>` | Only include assets taken after a date (`YYYY-MM-DD`) |
| `--before <date>` | Only include assets taken before a date (`YYYY-MM-DD`) |
| `--album <id>` | Only include assets from one album |
| `--verbose` | Show detailed output |

How matching works:

- Default behavior matches by filename stem (filename without extension)
- Example default match: `photo.jpg` with `photo.dng`
- Some cameras (for example Pixel) use different suffixes, so use `--stem-pattern` to extract the common prefix

Example:

```bash
immich-ts stack \
  --cover "\.(jpg|jpeg)$" \
  --raw "\.dng$" \
  --stem-pattern "^(PXL_\d+_\d+)" \
  --dry-run
```

### `auto-album`

Creates an album from assets in a date range that match one or more locations.

```bash
immich-ts auto-album --name <name> --after <date> --before <date> --location <loc> [options]
```

Required options:

| Option | Description |
| --- | --- |
| `--name <name>` | Album name |
| `--after <date>` | Start date (`YYYY-MM-DD`) |
| `--before <date>` | End date (`YYYY-MM-DD`) |
| `--location <loc>` | Location filter (repeat this flag for multiple locations) |

Optional options:

| Option | Description |
| --- | --- |
| `--dry-run` | Preview results without creating an album |
| `--verbose` | Show detailed output |

How location matching works:

- Each location is searched against city, state, and country fields
- Results are deduplicated so assets are only added once

Example:

```bash
immich-ts auto-album \
  --name "Rome Vacation 2024" \
  --after 2024-06-01 \
  --before 2024-06-15 \
  --location Rome \
  --location "Vatican City" \
  --dry-run
```

## Global options

| Option | Description |
| --- | --- |
| `--help` | Show help output |
