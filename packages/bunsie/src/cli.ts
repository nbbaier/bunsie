#!/usr/bin/env bun
import { build } from "./build";
import { loadConfig } from "./config";
import { dev } from "./dev";

const args = process.argv.slice(2);
const command = args[0];

let root = process.cwd();
const rootIdx = args.indexOf("--root");
if (rootIdx !== -1 && args[rootIdx + 1]) {
  root = args[rootIdx + 1];
}

async function main() {
  const config = await loadConfig(root);

  switch (command) {
    case "build":
      await build(config);
      break;
    case "dev":
      await dev(config);
      break;
    default:
      console.log("Usage: bunsie <build|dev> [--root <path>]");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
