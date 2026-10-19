import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const tsx = require.resolve("tsx/cli");
const checks = ["estimates", "estimator-flow", "detailed-pricing", "bootstrap", "quotations", "admin", "admin-auth", "admin-session", "admin-exports", "contact", "notifications", "analytics-consent", "lead-analytics", "dashboard-kpis", "gallery", "demo-projects", "crm", "reviews", "uploads", "pdf-layout"];
for (const check of checks) {
  const result = spawnSync(process.execPath, [tsx, `scripts/verify-${check}.ts`], { stdio: "inherit", env: process.env });
  if (result.error || result.status !== 0) {
    console.error(`FAIL: ${check}. ${result.error?.message ?? "See diagnostics above."}`);
    process.exit(result.status || 1);
  }
}
console.log(`PASS: ${checks.length} functional checks. Real HTTP/database and visual checks remain separate.`);
