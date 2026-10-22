import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import dotenv from "dotenv";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: resolve(root, ".env"), quiet: true });
if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL to your local PostgreSQL database.");
const databaseUrl = new URL(process.env.DATABASE_URL);
if (!["localhost", "127.0.0.1", "[::1]"].includes(databaseUrl.hostname)) {
  throw new Error("Feature verification only creates databases on local PostgreSQL.");
}
const suites = [
  { name: "billing", file: "billingDatabase.integration.ts", variable: "BILLING_TEST_DATABASE_URL" },
  { name: "scheduling", file: "schedulingDatabase.integration.ts", variable: "SCHEDULING_TEST_DATABASE_URL" },
  { name: "analytics", file: "analyticsDatabase.integration.ts", variable: "ANALYTICS_TEST_DATABASE_URL" },
  { name: "cancellation", file: "orderCancellationDatabase.integration.ts", variable: "CANCELLATION_TEST_DATABASE_URL" },
  { name: "http", file: "featuresHttp.integration.ts", variable: "FEATURES_TEST_DATABASE_URL" },
];
const requested = process.argv.slice(2);
if (requested.some((name) => !suites.some((suite) => suite.name === name))) {
  throw new Error(`Choose suites from: ${suites.map((suite) => suite.name).join(", ")}`);
}
const admin = new pg.Pool({ connectionString: databaseUrl.toString(), connectionTimeoutMillis: 5000 });
let child;
let interrupted = false;
const interrupt = () => {
  interrupted = true;
  process.exitCode = 130;
  child?.kill("SIGTERM");
};
process.on("SIGINT", interrupt);
process.on("SIGTERM", interrupt);
try {
  for (const suite of suites.filter((entry) => !requested.length || requested.includes(entry.name))) {
    if (interrupted) break;
    const name = `dineflow_${suite.name}_test_${Date.now()}_${randomBytes(4).toString("hex")}`;
    let created = false;
    try {
      await admin.query(`CREATE DATABASE "${name}"`);
      created = true;
      const testUrl = new URL(databaseUrl);
      testUrl.pathname = `/${name}`;
      console.log(`Running ${suite.name} verification in a disposable database…`);
      const code = await new Promise((resolveExit, reject) => {
        child = spawn(process.execPath, [
          "--conditions=react-server", "--import", "tsx", "--test", `tests/${suite.file}`,
        ], {
          cwd: root,
          env: { ...process.env, [suite.variable]: testUrl.toString() },
          stdio: "inherit",
        });
        child.once("error", reject);
        child.once("exit", (status) => resolveExit(status ?? 1));
      });
      if (code !== 0) process.exitCode = 1;
    } catch (error) {
      console.error(`${suite.name} verification failed (${error.code ?? error.name}): ${error.message}`);
      process.exitCode = 1;
    } finally {
      child = undefined;
      if (created) {
        await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
        console.log(`Removed the ${suite.name} test database.`);
      }
    }
  }
} finally {
  process.off("SIGINT", interrupt);
  process.off("SIGTERM", interrupt);
  await admin.end();
}
