/**
 * Cleanup old Cloudflare Pages deployments, keeping only the 2 most recent.
 */

const PROJECT = "baked-and-shredded";

async function main() {
  const { execSync } = await import("child_process");

  const result = execSync(
    `npx wrangler pages deployment list --project-name ${PROJECT} --json`,
    { encoding: "utf-8" }
  );

  let deployments;
  try {
    deployments = JSON.parse(result);
  } catch {
    console.log("No deployments to clean up or failed to parse output.");
    return;
  }

  if (!Array.isArray(deployments) || deployments.length <= 2) {
    console.log("2 or fewer deployments, nothing to clean up.");
    return;
  }

  const toDelete = deployments.slice(2);
  console.log(`Deleting ${toDelete.length} old deployment(s)...`);

  for (const dep of toDelete) {
    const id = dep.Id || dep.id;
    if (!id) {
      console.error("  Skipping deployment with no ID:", JSON.stringify(dep));
      continue;
    }
    try {
      execSync(
        `npx wrangler pages deployment delete ${id} --project-name ${PROJECT} --force`,
        { encoding: "utf-8", stdio: "pipe" }
      );
      console.log(`  Deleted: ${id}`);
    } catch (e) {
      console.error(`  Failed to delete ${id}: ${e.message}`);
    }
  }
}

main();
