import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const url = process.argv[2] ?? "http://localhost:3000";
const mode = process.argv[3] ?? "mobile";

mkdirSync(".lighthouse/tmp", { recursive: true });

const outputBase = mode === "desktop" ? ".lighthouse/audit-desktop" : ".lighthouse/audit";
const args = [
  "exec",
  "lighthouse",
  url,
  "--output=json",
  "--output=html",
  `--output-path=${outputBase}`,
  "--chrome-flags=--headless --no-sandbox"
];

if (mode === "desktop") {
  args.splice(3, 0, "--preset=desktop");
}

const env = {
  ...process.env,
  TEMP: resolve(".lighthouse/tmp"),
  TMP: resolve(".lighthouse/tmp")
};

const result = spawnSync("pnpm", args, {
  env,
  shell: true,
  stdio: "inherit"
});

const jsonReport = `${outputBase}.report.json`;
const htmlReport = `${outputBase}.report.html`;

if (existsSync(jsonReport) && existsSync(htmlReport)) {
  if (result.status) {
    console.warn("Lighthouse reports were written; ignoring Chrome temp cleanup error.");
  }
  process.exit(0);
}

process.exit(result.status ?? 1);
