#!/usr/bin/env bun
import { build } from "./build";
import { loadConfig } from "./config";
import { dev } from "./dev";

const args = process.argv.slice(2);

const DEFAULT_PORT = 3000;
const HELP_FLAGS = new Set(["--help", "-h"]);
const USAGE_MESSAGE =
  "Usage: bunsie <build|dev> [--root <path>] [--port <number>]";

interface ParsedArgs {
  command: string | null;
  help: boolean;
  port: number;
  root: string;
}

function readOptionValue(input: string[], index: number, flag: string): string {
  const value = input[index + 1];
  if (!value) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function parsePort(value: string): number {
  const parsedPort = Number.parseInt(value, 10);
  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65_535) {
    throw new Error(`Invalid port: ${value}`);
  }
  return parsedPort;
}

function parseArgs(input: string[]): ParsedArgs {
  let command: string | null = null;
  let root = process.cwd();
  let port = DEFAULT_PORT;
  let help = false;

  for (let index = 0; index < input.length; index++) {
    const arg = input[index];

    if (HELP_FLAGS.has(arg)) {
      help = true;
      continue;
    }

    if (arg === "--root") {
      root = readOptionValue(input, index, "--root");
      index++;
      continue;
    }

    if (arg === "--port") {
      port = parsePort(readOptionValue(input, index, "--port"));
      index++;
      continue;
    }

    if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (command) {
      throw new Error(`Unexpected argument: ${arg}`);
    }
    command = arg;
  }

  return { command, root, port, help };
}

async function main() {
  const parsed = parseArgs(args);

  if (parsed.help || !parsed.command) {
    console.log(USAGE_MESSAGE);
    process.exit(parsed.help ? 0 : 1);
  }

  if (parsed.command !== "dev" && parsed.port !== DEFAULT_PORT) {
    throw new Error("--port can only be used with the dev command");
  }

  const config = await loadConfig(parsed.root);

  switch (parsed.command) {
    case "build":
      await build(config);
      break;
    case "dev":
      await dev(config, parsed.port);
      break;
    default:
      throw new Error(`Unknown command: ${parsed.command}`);
  }
}

main().catch((err) => {
  if (err instanceof Error) {
    console.error(err.message);
  } else {
    console.error(err);
  }
  console.log(USAGE_MESSAGE);
  process.exit(1);
});
