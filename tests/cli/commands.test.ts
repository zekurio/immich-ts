import { describe, it, expect } from "bun:test";
import { spawn } from "child_process";
import { dirname, resolve } from "path";

const projectRoot = resolve(dirname(import.meta.path), "../..");

async function runCommand(args: string[], env?: Record<string, string>): Promise<{ output: string; exitCode: number }> {
  return new Promise((resolve) => {
    const envVars = env || {};
    const child = spawn(process.execPath, ["run", "src/index.ts", ...args], {
      cwd: projectRoot,
      env: {
        PATH: envVars.PATH || Bun.env.PATH || "",
        ...envVars,
      },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("close", (code) => {
      resolve({ output: stdout + stderr, exitCode: code ?? 1 });
    });
  });
}

describe("CLI Command Parsing", () => {
  describe("help flag", () => {
    it("should show help with --help", async () => {
      const { output, exitCode } = await runCommand(["--help"]);

      expect(output).toContain("immich-ts - Immich CLI tool");
      expect(output).toContain("COMMANDS:");
      expect(output).toContain("validate");
      expect(output).toContain("stack");
      expect(output).toContain("STACK OPTIONS:");
      expect(exitCode).toBe(0);
    });

    it("should show help with -h", async () => {
      const { output, exitCode } = await runCommand(["-h"]);

      expect(output).toContain("immich-ts - Immich CLI tool");
      expect(exitCode).toBe(0);
    });
  });

  describe("unknown command", () => {
    it("should error on unknown command", async () => {
      const { output, exitCode } = await runCommand(["unknown"]);

      expect(output).toContain("Unknown command: unknown");
      expect(exitCode).toBe(1);
    });
  });

  describe("validate command", () => {
    it("should accept baseurl and apikey options", async () => {
      const { output, exitCode } = await runCommand([
        "validate",
        "--baseurl",
        "https://immich.example.com",
        "--apikey",
        "test-key",
      ]);

      expect(output).toContain("Validating Immich configuration");
      expect(exitCode).toBe(1);
    });
  });

  describe("stack command validation", () => {
    it("should require --cover option", async () => {
      const { output, exitCode } = await runCommand(["stack", "--raw", "\\.dng$"]);

      expect(output).toContain("Missing required option: --cover");
      expect(exitCode).toBe(1);
    });

    it("should require --raw option", async () => {
      const { output, exitCode } = await runCommand(["stack", "--cover", "\\.jpg$"]);

      expect(output).toContain("Missing required option: --raw");
      expect(exitCode).toBe(1);
    });

    it("should run when both --cover and --raw are provided", async () => {
      const { output } = await runCommand([
        "stack",
        "--cover",
        "\\.jpg$",
        "--raw",
        "\\.dng$",
        "--dry-run",
        "--baseurl",
        "https://immich.example.com",
        "--apikey",
        "test-key",
      ]);

      expect(output).not.toContain("Missing required option");
      expect(output).toContain("Immich Stack Tool");
    });
  });

  describe("stack command options", () => {
    it("should accept --dry-run flag", async () => {
      const { output } = await runCommand([
        "stack",
        "--cover",
        "\\.jpg$",
        "--raw",
        "\\.dng$",
        "--dry-run",
        "--baseurl",
        "https://immich.example.com",
        "--apikey",
        "test",
      ]);

      expect(output).toContain("Dry run");
      expect(output).toContain("Cover pattern");
      expect(output).toContain("Raw pattern");
    });

    it("should accept --after date filter", async () => {
      const { output } = await runCommand([
        "stack",
        "--cover",
        "\\.jpg$",
        "--raw",
        "\\.dng$",
        "--after",
        "2024-01-01",
        "--baseurl",
        "https://immich.example.com",
        "--apikey",
        "test",
      ]);

      expect(output).toContain("After:");
      expect(output).toContain("2024-01-01");
    });

    it("should accept --before date filter", async () => {
      const { output } = await runCommand([
        "stack",
        "--cover",
        "\\.jpg$",
        "--raw",
        "\\.dng$",
        "--before",
        "2024-12-31",
        "--baseurl",
        "https://immich.example.com",
        "--apikey",
        "test",
      ]);

      expect(output).toContain("Before:");
      expect(output).toContain("2024-12-31");
    });

    it("should accept --album filter", async () => {
      const { output } = await runCommand([
        "stack",
        "--cover",
        "\\.jpg$",
        "--raw",
        "\\.dng$",
        "--album",
        "abc123",
        "--baseurl",
        "https://immich.example.com",
        "--apikey",
        "test",
      ]);

      expect(output).toContain("Album ID:");
      expect(output).toContain("abc123");
    });

    it("should accept --verbose flag", async () => {
      const { output } = await runCommand([
        "stack",
        "--cover",
        "\\.jpg$",
        "--raw",
        "\\.dng$",
        "--verbose",
        "--baseurl",
        "https://immich.example.com",
        "--apikey",
        "test",
      ]);

      expect(output).toContain("Cover pattern:");
      expect(output).toContain("Raw pattern:");
      expect(output).toContain("Dry run:");
    });

    it("should reject invalid --after date format", async () => {
      const { output, exitCode } = await runCommand([
        "stack",
        "--cover",
        "\\.jpg$",
        "--raw",
        "\\.dng$",
        "--after",
        "invalid-date",
        "--baseurl",
        "https://immich.example.com",
        "--apikey",
        "test",
      ]);

      expect(output).toContain("Invalid date format");
      expect(exitCode).toBe(1);
    });

    it("should reject invalid --before date format", async () => {
      const { output, exitCode } = await runCommand([
        "stack",
        "--cover",
        "\\.jpg$",
        "--raw",
        "\\.dng$",
        "--before",
        "not-a-date",
        "--baseurl",
        "https://immich.example.com",
        "--apikey",
        "test",
      ]);

      expect(output).toContain("Invalid date format");
      expect(exitCode).toBe(1);
    });
  });
});

describe("Configuration Precedence", () => {
  it("should use CLI overrides over environment variables", async () => {
    const { output } = await runCommand(
      [
        "validate",
        "--baseurl",
        "https://cli-override.example.com",
        "--apikey",
        "cli-key",
      ],
      {
        IMMICH_URL: "https://env.example.com",
        IMMICH_API_KEY: "env-key",
      }
    );

    expect(output).toContain("cli-override.example.com");
    expect(output).toContain("(masked)");
  });
});
