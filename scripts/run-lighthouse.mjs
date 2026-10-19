import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const url = process.argv[2] ?? "http://localhost:3000";
const mode = process.argv[3] ?? "mobile";
const label = process.argv[4];

if (!["mobile", "desktop"].includes(mode) || (label && !/^[a-z0-9-]+$/.test(label))) {
  console.error("Usage: node scripts/run-lighthouse.mjs <url> [mobile|desktop] [report-label]");
  process.exit(1);
}

try {
  const target = new URL(url);
  if (!["http:", "https:"].includes(target.protocol)) throw new Error("Use an HTTP(S) URL.");
  const response = await fetch(target, { signal: AbortSignal.timeout(15000) });
  await response.body?.cancel();
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
} catch (error) {
  console.error(`Lighthouse target unavailable: ${error.message}`);
  process.exit(1);
}

mkdirSync(".lighthouse", { recursive: true });

const outputBase = label ? `.lighthouse/${label}-${mode}` : mode === "desktop" ? ".lighthouse/audit-desktop" : ".lighthouse/audit";
const jsonReport = `${outputBase}.report.json`;
const htmlReport = `${outputBase}.report.html`;
// A failed run must never reuse reports from a previous audit.
for (const reportPath of [jsonReport, htmlReport]) rmSync(reportPath, { force: true });

const require = createRequire(import.meta.url);
const args = [
  require.resolve("lighthouse/cli/index.js"),
  url,
  "--output=json",
  "--output=html",
  `--output-path=${outputBase}`,
  "--chrome-flags=--headless --no-sandbox"
];

if (mode === "desktop") {
  args.push("--preset=desktop");
}

const result = spawnSync(process.execPath, args, {
  stdio: "inherit"
});

let reportComplete = false;
try {
  if (existsSync(jsonReport) && existsSync(htmlReport)) {
    const report = JSON.parse(readFileSync(jsonReport, "utf8"));
    reportComplete = !report.runtimeError && ["performance", "accessibility", "best-practices", "seo"].every(category => Number.isFinite(report.categories?.[category]?.score));
    if (report.runtimeError) console.error(`Lighthouse audit failed: ${report.runtimeError.message}`);
  }
} catch (error) {
  console.error(`Invalid Lighthouse report: ${error.message}`);
}

if (!reportComplete) console.error("Lighthouse did not produce complete JSON and HTML reports for this run.");
if (result.error) console.error(result.error.message);
if (result.status !== 0 && reportComplete) console.error("Reports were written, but the Lighthouse process failed. Inspect its output before using the results.");

process.exit(reportComplete && result.status === 0 ? 0 : result.status || 1);
