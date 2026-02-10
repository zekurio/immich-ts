import { parseArgs } from "util";
import { initClient } from "./api/index.ts";
import { ConfigError, getConfig } from "./env.ts";
import { registry } from "./registry.ts";
import "./commands/index.ts";

function printHelp(): void {
  console.log(registry.generateHelp());
}

function printError(message: string): void {
  console.error(`\x1b[31mError:\x1b[0m ${message}`);
}

async function main(): Promise<number> {
  let args;

  try {
    args = parseArgs({
      args: Bun.argv.slice(2),
      ...registry.buildParseArgsConfig(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    printError(message);
    console.log("\nRun 'immich-ts --help' for usage information.");
    return 1;
  }

  const { values, positionals } = args;
  const optionValues = values as Record<string, unknown>;

  if (values.help || positionals.length === 0) {
    printHelp();
    return 0;
  }

  const commandName = positionals[0]!;
  const command = registry.get(commandName);

  if (!command) {
    printError(`Unknown command: ${commandName}`);
    console.log("\nRun 'immich-ts --help' for usage information.");
    return 1;
  }

  const unsupportedOptions = registry.findUnsupportedOptions(
    commandName,
    optionValues,
  );
  if (unsupportedOptions.length > 0) {
    for (const optionName of unsupportedOptions) {
      printError(`Option --${optionName} is not valid for command "${commandName}"`);
    }
    console.log("\nRun 'immich-ts --help' for usage information.");
    return 1;
  }

  const validation = registry.validateRequiredOptions(commandName, optionValues);
  if (!validation.valid) {
    for (const missing of validation.missing) {
      printError(`Missing required option: --${missing}`);
    }
    console.log("\nRun 'immich-ts --help' for usage information.");
    return 1;
  }

  try {
    const config = getConfig();
    initClient(config);
    return await command.handler(config, optionValues);
  } catch (err) {
    if (err instanceof ConfigError) {
      printError(err.message);
      return 1;
    }
    if (err instanceof Error && err.message.includes("Invalid date")) {
      printError(err.message);
      return 1;
    }
    if (err instanceof Error && err.message.includes("Invalid regex")) {
      printError(err.message);
      return 1;
    }
    throw err;
  }
}

process.exitCode = await main();
