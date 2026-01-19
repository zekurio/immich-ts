# Agent Guidelines for immich-ts

This document provides coding agents with essential information about project structure, conventions, and workflows.

## Project Overview

**Runtime**: Bun (not Node.js)
**Language**: TypeScript (strict mode enabled)
**Project Type**: CLI tool for Immich API management
**API Client**: Uses `@immich/sdk` (official Immich TypeScript SDK)

## Build, Lint, and Test Commands

### Development
```bash
bun run dev                    # Run the CLI in development mode
bun run build                  # Compile to standalone executable
bun run lint                   # Run oxlint for code quality
```

### Testing
```bash
bun test                       # Run all tests
bun test tests/unit            # Run only unit tests
bun test tests/cli             # Run only CLI tests

# Run a single test file
bun test tests/unit/pair-matching.test.ts

# Run a specific test by name pattern
bun test --test-name-pattern "should validate dates"
```

### Type Checking
```bash
bunx tsc --noEmit              # Type check without emitting files
```

## Project Structure

```
src/
├── api/
│   └── index.ts              # Thin wrapper around @immich/sdk
├── commands/                  # CLI command implementations
│   ├── validate.ts
│   └── stack.ts
├── config.ts                  # Configuration loading
└── index.ts                   # CLI entrypoint

tests/
├── unit/                      # Isolated unit tests
└── cli/                       # End-to-end CLI tests
```

## Code Style Guidelines

### Comments

**TSDoc for exported functions only**. Use TSDoc (`/** */`) for exported functions that benefit from documentation. Avoid redundant or obvious comments.

```typescript
// Good: TSDoc on exported function
/**
 * Validates Immich server connectivity and API key authentication.
 * @returns Exit code (0 = success, 1 = failure)
 */
export async function validate(config: Config): Promise<number> { }

// Bad: Unnecessary comment stating the obvious
/** Validates URL format using the URL constructor. */
function isValidUrl(url: string): boolean { }
```

**No inline comments** unless explaining non-obvious logic. Code should be self-documenting.

### Import Conventions

**CRITICAL**: Always include `.ts` extension in local imports (required by Bun/tsconfig).

```typescript
// Correct
import { getConfig } from "./config.ts";
import type { Config } from "../config.ts";

// Wrong
import { getConfig } from "./config";
```

**Import Ordering**:
1. Built-in/third-party modules (e.g., "util", "@immich/sdk")
2. Type-only imports (`import type { ... }`)
3. Local modules with relative paths

**Example**:
```typescript
import { parseArgs } from "util";
import type { Config } from "../config.ts";
import { getConfig } from "./config.ts";
import { validate } from "./commands/validate.ts";
```

### TypeScript Patterns

**Strict Mode**: Project uses `"strict": true` with additional strict flags. All code must:
- Avoid `any` types
- Handle potential `undefined` values (noUncheckedIndexedAccess enabled)
- Use explicit return types for exported functions

**Type-Only Imports**:
```typescript
import type { AssetResponseDto, AlbumResponseDto } from "../api/index.ts";
```

**Utility Types**:
```typescript
Partial<Config>, Record<string, unknown>, etc.
```

**Union Types for Enums**:
```typescript
type AssetType = "IMAGE" | "VIDEO" | "AUDIO" | "OTHER";
```

**Interfaces over Types** for object shapes:
```typescript
// Preferred
interface Config {
  url: string;
  apiKey: string;
}

// Use sparingly
type Config = { url: string; apiKey: string };
```

### Naming Conventions

**Files**: lowercase with hyphens, `.ts` extension
- `stack.ts`, `config.ts`, `pair-matching.test.ts`

**Interfaces/Types/Classes**: PascalCase
- `Config`, `AssetResponseDto`, `ConfigError`

**Functions/Variables**: camelCase
- `getConfig`, `initClient`, `findMatchingPairs`

**Constants**: SCREAMING_SNAKE_CASE for module-level constants
- `HELP_TEXT`, `DEFAULT_TIMEOUT`

### Error Handling

The project uses `@immich/sdk` which provides:
- `isHttpError(error)` - Type guard for API errors
- `ApiHttpError` - Error type with `status` and `data` properties

**Error Handling Pattern**:
```typescript
import { isHttpError, type ApiHttpError } from "../api/index.ts";

try {
  const result = await someApiCall();
  return result;
} catch (error) {
  if (isHttpError(error)) {
    const httpErr = error as ApiHttpError;
    if (httpErr.status === 401) {
      console.error("Invalid API key");
    }
    return 1;
  }
  throw error;
}
```

### Functions and Methods

**Exported Functions**: Include TSDoc when non-obvious
```typescript
/**
 * Stack matching cover and raw image pairs in Immich.
 * @returns Exit code (0 = success, 1 = partial failure)
 */
export async function stack(config: Config, options: StackOptions): Promise<number> { }
```

**Return Types**: Explicit for all exported functions
```typescript
// Correct
export async function validate(config: Config): Promise<number> { }

// Wrong (implicit return type)
export async function validate(config: Config) { }
```

### Testing Conventions

**Test Framework**: Bun's built-in test runner (import from `"bun:test"`)

**Test File Naming**: `*.test.ts` suffix
- `tests/unit/` - Isolated logic tests
- `tests/cli/` - End-to-end subprocess tests

**Test Structure**:
```typescript
import { describe, it, expect, beforeEach } from "bun:test";

describe("feature name", () => {
  beforeEach(() => {
    // Setup
  });

  it("should do something specific", () => {
    const input = ...;
    const result = functionUnderTest(input);
    expect(result).toBe(expected);
  });
});
```

## Common Patterns

### CLI Commands
- Accept configuration and options parameters
- Return `Promise<number>` (exit code: 0 = success, non-zero = failure)
- Use `parseArgs()` from "util" for argument parsing
- Print user-facing output with ANSI colors (green, red, dim, reset)

### API Client Usage
```typescript
import { initClient, pingServer, getMyUser } from "../api/index.ts";

// Initialize once at command start
initClient({ url: config.url, apiKey: config.apiKey });

// Then use SDK functions directly
const user = await getMyUser();
const response = await searchAssets({ metadataSearchDto: { ... } });
```

### Configuration
- Read from `getConfig()` which prioritizes: CLI args > env vars
- Environment variables: `IMMICH_URL`, `IMMICH_API_KEY`
- Always validate required fields

## Important Notes

- **Bun-Specific**: Code uses Bun runtime APIs (`Bun.argv`, `Bun.env`)
- **No Prettier/ESLint**: Oxlint is configured but has minimal rules. Follow existing code style.
- **TSConfig**: `verbatimModuleSyntax` and `allowImportingTsExtensions` enabled
- **Exit Codes**: CLI sets `process.exitCode` from main's return value
- **Type Safety**: Leverage strict mode; avoid non-null assertions unless necessary
- **SDK Types**: Use types from `@immich/sdk` (e.g., `AssetResponseDto`, `AlbumResponseDto`)

## Making Changes

1. Read relevant source files first to understand context
2. Follow existing patterns in similar files
3. Run tests after changes: `bun test`
4. Type check: `bunx tsc --noEmit`
5. Lint: `bun run lint`
6. Ensure CLI commands return proper exit codes (0 = success)
