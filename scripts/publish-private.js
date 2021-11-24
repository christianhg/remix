const path = require("path");
const { execSync } = require("child_process");
const semver = require("semver");
const jsonfile = require("jsonfile");

const buildDir = path.resolve(__dirname, "../build/node_modules");

function getTaggedVersion() {
  //   let output = execSync("git tag --list --points-at HEAD").toString().trim();
  //   return output.replace(/^v/g, "");
  return "1.0.5";
}

function publish(dir, tag) {
  execSync(`npm publish --tag ${tag} ${dir}`, { stdio: "inherit" });
}

async function run() {
  // Make sure there's a current tag
  let taggedVersion = getTaggedVersion();
  if (taggedVersion === "") {
    console.error("Missing release version. Run the version script first.");
    process.exit(1);
  }

  let prerelease = semver.prerelease(taggedVersion);
  let tag = prerelease ? prerelease[0] : "latest";

  // Publish all @remix-run/* packages
  for (let name of [
    "dev",
    "server-runtime", // publish before platforms
    "cloudflare-workers",
    "node", // publish node before node servers
    "architect",
    "express", // publish express before serve
    "vercel",
    "netlify",
    "react",
    "serve"
  ]) {
    // fix for https://github.com/remix-run/remix/actions/runs/1500713248
    updatePackageConfig(name, config => {
      config.repository = "https://github.com/remix-run/packages";
    });
    publish(path.join(buildDir, "@remix-run", name), tag);
  }
}

run().then(
  () => {
    process.exit(0);
  },
  error => {
    console.error(error);
    process.exit(1);
  }
);

let rootDir = path.resolve(__dirname, "..");

/**
 * @param {string} packageName
 * @param {string} [directory]
 * @returns {string}
 */
function packageJson(packageName, directory) {
  return path.join(rootDir, directory, packageName, "package.json");
}

async function updatePackageConfig(packageName, transform) {
  let file = packageJson(packageName, "packages");
  let json = await jsonfile.readFile(file);
  transform(json);
  await jsonfile.writeFile(file, json, { spaces: 2 });
}
