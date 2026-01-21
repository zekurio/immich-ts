import type { Config } from "./env.ts";

export interface CommandOption {
  name: string;
  short?: string;
  description: string;
  type: "string" | "boolean";
  required?: boolean;
  multiple?: boolean;
  placeholder?: string;
}

export interface CommandDefinition {
  name: string;
  description: string;
  options: CommandOption[];
  examples?: string[];
  handler: (config: Config, options: Record<string, unknown>) => Promise<number>;
}

export interface GlobalOptions {
  options: CommandOption[];
  envVars: { name: string; description: string }[];
}

interface ParseArgsOptionConfig {
  type: "string" | "boolean";
  short?: string;
  multiple?: boolean;
}

class CommandRegistry {
  private commands = new Map<string, CommandDefinition>();
  private globalOptions: GlobalOptions = { options: [], envVars: [] };

  register(command: CommandDefinition): void {
    this.commands.set(command.name, command);
  }

  get(name: string): CommandDefinition | undefined {
    return this.commands.get(name);
  }

  getAll(): CommandDefinition[] {
    return Array.from(this.commands.values());
  }

  setGlobalOptions(globals: GlobalOptions): void {
    this.globalOptions = globals;
  }

  getGlobalOptions(): GlobalOptions {
    return this.globalOptions;
  }

  buildParseArgsConfig(): {
    options: Record<string, ParseArgsOptionConfig>;
    allowPositionals: boolean;
    strict: boolean;
  } {
    const options: Record<string, ParseArgsOptionConfig> = {};

    for (const opt of this.globalOptions.options) {
      options[opt.name] = {
        type: opt.type,
        ...(opt.short && { short: opt.short }),
        ...(opt.multiple && { multiple: true }),
      };
    }

    for (const command of this.commands.values()) {
      for (const opt of command.options) {
        const existing = options[opt.name];
        if (!existing) {
          options[opt.name] = {
            type: opt.type,
            ...(opt.short && { short: opt.short }),
            ...(opt.multiple && { multiple: true }),
          };
        } else if (existing.type !== opt.type) {
          console.warn(
            `Warning: Option --${opt.name} in command "${command.name}" has type "${opt.type}" ` +
              `but was already registered with type "${existing.type}". Using "${existing.type}".`
          );
        }
      }
    }

    return {
      options,
      allowPositionals: true,
      strict: true,
    };
  }

  validateRequiredOptions(
    commandName: string,
    values: Record<string, unknown>
  ): { valid: boolean; missing: string[] } {
    const command = this.commands.get(commandName);
    if (!command) {
      throw new Error(`validateRequiredOptions called with unknown command: ${commandName}`);
    }

    const missing: string[] = [];

    for (const opt of command.options) {
      if (opt.required) {
        const value = values[opt.name];
        if (value === undefined || value === null) {
          missing.push(opt.name);
        } else if (opt.multiple && Array.isArray(value) && value.length === 0) {
          missing.push(opt.name);
        }
      }
    }

    return { valid: missing.length === 0, missing };
  }

  generateHelp(): string {
    const lines: string[] = [];
    const flagWidth = 28;

    lines.push("immich-ts - Immich CLI tool");
    lines.push("");
    lines.push("USAGE:");
    lines.push("  immich-ts <command> [options]");
    lines.push("");

    lines.push("COMMANDS:");
    const commandList = this.getAll();
    const maxCmdLen = Math.max(...commandList.map((c) => c.name.length));
    for (const cmd of commandList) {
      lines.push(`  ${cmd.name.padEnd(maxCmdLen + 2)}${cmd.description}`);
    }
    lines.push("");

    lines.push("GLOBAL OPTIONS:");
    for (const opt of this.globalOptions.options) {
      const flag = this.formatOptionFlag(opt);
      lines.push(`  ${flag.padEnd(flagWidth)}${opt.description}`);
    }
    lines.push("");

    for (const cmd of commandList) {
      if (cmd.options.length > 0) {
        lines.push(`${cmd.name.toUpperCase()} OPTIONS:`);
        for (const opt of cmd.options) {
          const flag = this.formatOptionFlag(opt);
          const reqMarker = opt.required ? " (required)" : "";
          lines.push(`  ${flag.padEnd(flagWidth)}${opt.description}${reqMarker}`);
        }
        lines.push("");
      }
    }

    lines.push("ENVIRONMENT:");
    for (const env of this.globalOptions.envVars) {
      lines.push(`  ${env.name.padEnd(20)}${env.description}`);
    }
    lines.push("");

    const allExamples = commandList.flatMap((cmd) => cmd.examples ?? []);
    if (allExamples.length > 0) {
      lines.push("EXAMPLES:");
      for (const example of allExamples) {
        lines.push(`  ${example}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  private formatOptionFlag(opt: CommandOption): string {
    const shortPart = opt.short ? `-${opt.short}, ` : "    ";
    const namePart = `--${opt.name}`;
    const placeholder = opt.type === "string" ? ` <${opt.placeholder ?? opt.name}>` : "";
    return `${shortPart}${namePart}${placeholder}`;
  }
}

export const registry = new CommandRegistry();
