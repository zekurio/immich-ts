import { parseArgs } from "util";
import { getConfig, ConfigError } from "./config.ts";
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
    const error = err as Error;
    printError(error.message);
    console.log("\nRun 'immich-ts --help' for usage information.");
    return 1;
  }

  const { values, positionals } = args;

  if (values.help || positionals.length === 0) {
    printHelp();
    return 0;
  }

  // Safe: we already verified positionals.length > 0 above
  const commandName = positionals[0]!;
  const command = registry.get(commandName);

  if (!command) {
    printError(`Unknown command: ${commandName}`);
    console.log("\nRun 'immich-ts --help' for usage information.");
    return 1;
  }

  const validation = registry.validateRequiredOptions(commandName, values);
  if (!validation.valid) {
    for (const missing of validation.missing) {
      printError(`Missing required option: --${missing}`);
    }
    console.log("\nRun 'immich-ts --help' for usage information.");
    return 1;
  }

  try {
    const config = getConfig({
      baseurl: values.baseurl as string | undefined,
      apikey: values.apikey as string | undefined,
    });
    return await command.handler(config, values as Record<string, unknown>);
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
