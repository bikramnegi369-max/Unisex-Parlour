import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const backendRoot = path.resolve(frontendRoot, "..", "backend");
const fixtureScript = path.join(backendRoot, "scripts", "attendance-e2e-fixtures.mjs");
const fixtureEnvironment = {
  ...process.env,
  MONGO_URI: undefined,
  MONGO_URL: undefined,
  MONGODB_URI: undefined,
  TEST_MONGO_URI: undefined,
  DATABASE_URL: undefined,
};

function runFixtureAction(action) {
  const result = spawnSync(process.execPath, [fixtureScript, action], {
    cwd: backendRoot,
    stdio: "inherit",
    env: fixtureEnvironment,
  });
  if (result.error) throw new Error(`Could not run isolated Attendance fixture action: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(`Isolated Attendance fixture action "${action}" failed with exit code ${result.status}.`);
  }
}

export default async function globalSetup() {
  runFixtureAction("prepare-indexes");
  runFixtureAction("setup");
}
