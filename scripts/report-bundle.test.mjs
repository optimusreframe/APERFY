import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createBundleReport } from "./report-bundle.mjs";

test("reports raw and gzip sizes, sorted assets, threshold markers, and precache bytes", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "bundle-report-"));
  const dist = path.join(root, "dist");
  await mkdir(path.join(dist, "assets"), { recursive: true });
  await writeFile(path.join(dist, "assets", "small.js"), "small");
  await writeFile(path.join(dist, "assets", "large.js"), "x".repeat(500_001));
  await writeFile(path.join(dist, "index.html"), "shell");
  await writeFile(
    path.join(dist, "sw.js"),
    'precacheAndRoute([{url:"index.html",revision:"abc"},{url:"assets/small.js",revision:null}])',
  );

  try {
    const report = await createBundleReport(dist);
    assert.deepEqual(report.assets.map(({ path: assetPath }) => assetPath), [
      "assets/large.js",
      "assets/small.js",
    ]);
    assert.equal(report.assets[0].bytes, 500_001);
    assert.equal(report.assets[0].overThreshold, true);
    assert.equal(report.assets[1].bytes, 5);
    assert.equal(report.assets[1].overThreshold, false);
    assert.equal(report.precache.bytes, 10);
    assert.ok(report.assets.every(({ gzipBytes }) => gzipBytes > 0));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("fails when the build directory is missing", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "bundle-report-missing-"));
  try {
    await assert.rejects(createBundleReport(path.join(root, "dist")), /Build directory not found/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
