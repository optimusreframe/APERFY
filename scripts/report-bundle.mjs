import { gzipSync } from "node:zlib";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CHUNK_THRESHOLD_BYTES = 500_000;

async function listFiles(directory, prefix = "") {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = [];
  for (const entry of entries) {
    const relativePath = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path.join(directory, entry.name), relativePath)));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }
  return files;
}

async function precacheSize(distDirectory) {
  let serviceWorker;
  try {
    serviceWorker = await readFile(path.join(distDirectory, "sw.js"), "utf8");
  } catch {
    return { bytes: 0, files: 0 };
  }

  const urls = [...serviceWorker.matchAll(/url:\"([^\"]+)\",revision:/g)].map((match) => match[1]);
  let bytes = 0;
  let files = 0;
  for (const url of urls) {
    const relativePath = decodeURIComponent(url).replace(/^\/+/, "");
    const absolutePath = path.resolve(distDirectory, relativePath);
    if (!absolutePath.startsWith(`${path.resolve(distDirectory)}${path.sep}`)) continue;
    try {
      const fileStat = await stat(absolutePath);
      if (fileStat.isFile()) {
        bytes += fileStat.size;
        files += 1;
      }
    } catch {
      // Workbox may include remote or generated entries that are not files in dist.
    }
  }
  return { bytes, files };
}

export async function createBundleReport(distDirectory = "dist") {
  const resolvedDist = path.resolve(distDirectory);
  let buildStat;
  try {
    buildStat = await stat(resolvedDist);
  } catch {
    throw new Error(`Build directory not found: ${resolvedDist}`);
  }
  if (!buildStat.isDirectory()) throw new Error(`Build directory not found: ${resolvedDist}`);

  const assetDirectory = path.join(resolvedDist, "assets");
  const assetPaths = await listFiles(assetDirectory);
  const assets = await Promise.all(assetPaths.map(async (assetPath) => {
    const contents = await readFile(path.join(assetDirectory, assetPath));
    const bytes = contents.byteLength;
    return {
      path: path.posix.join("assets", assetPath),
      bytes,
      gzipBytes: gzipSync(contents).byteLength,
      overThreshold: /\.(?:m?js)$/i.test(assetPath) && bytes > CHUNK_THRESHOLD_BYTES,
    };
  }));
  assets.sort((left, right) => right.bytes - left.bytes || left.path.localeCompare(right.path));

  return {
    assets,
    precache: await precacheSize(resolvedDist),
    chunkThresholdBytes: CHUNK_THRESHOLD_BYTES,
  };
}

function formatKiB(bytes) {
  return `${(bytes / 1024).toFixed(2)} KiB`;
}

export function printBundleReport(report) {
  console.log("Bundle sizes (sorted by raw bytes)");
  console.log("| Asset | Raw | Gzip | Over 500 kB |\n|---|---:|---:|:---:|");
  for (const asset of report.assets) {
    console.log(`| ${asset.path} | ${formatKiB(asset.bytes)} | ${formatKiB(asset.gzipBytes)} | ${asset.overThreshold ? "yes" : ""} |`);
  }
  console.log(`\nPrecache: ${formatKiB(report.precache.bytes)} across ${report.precache.files} files`);
  const overThreshold = report.assets.filter((asset) => asset.overThreshold);
  console.log(`Chunks over ${report.chunkThresholdBytes.toLocaleString("en-US")} bytes: ${overThreshold.length ? overThreshold.map(({ path: assetPath }) => assetPath).join(", ") : "none"}`);
  return overThreshold;
}

const invokedPath = process.argv[1] && path.resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const report = await createBundleReport(process.argv[2] ?? "dist");
    const overThreshold = printBundleReport(report);
    if (overThreshold.length > 0) {
      console.error(`Bundle regression: ${overThreshold.length} asset(s) exceed the ${report.chunkThresholdBytes.toLocaleString("en-US")}-byte limit.`);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
