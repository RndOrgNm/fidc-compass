#!/usr/bin/env node
/**
 * Vercel build helper: downloads generated JSON artifacts from the private S3
 * artifacts prefix into fidc-compass/public before vite build.
 *
 * Required env vars (set in Vercel project settings):
 *   ARTIFACT_S3_BUCKET   — S3 bucket that holds the artifacts
 *   ARTIFACT_S3_PREFIX   — key prefix, e.g. idsf/artifacts/latest
 *   AWS_ACCESS_KEY_ID    — IAM key with s3:GetObject + s3:ListBucket on the prefix
 *   AWS_SECRET_ACCESS_KEY
 *   AWS_REGION           — e.g. us-east-1
 *
 * Set SKIP_ARTIFACT_DOWNLOAD=1 to skip (useful in local dev when files already
 * exist under public/ from a manual refresh.py run).
 */

import { createWriteStream, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(__dirname, "../public");

/** Prefixes under ARTIFACT_S3_PREFIX that map to public subdirectories. */
const ARTIFACT_SUBDIRS = ["dashboard", "plotly"];

/** Files that must exist after download or the build is aborted. */
const REQUIRED_FILES = [
  "dashboard/home-metrics.json",
  "dashboard/manifest.json",
];

function requireEnv(name) {
  const val = process.env[name];
  if (!val) {
    console.error(`[download-artifacts] Missing required env var: ${name}`);
    process.exit(1);
  }
  return val;
}

async function downloadObject(client, bucket, key, destPath) {
  mkdirSync(dirname(destPath), { recursive: true });
  const { Body } = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  await pipeline(Body, createWriteStream(destPath));
}

async function listKeys(client, bucket, prefix) {
  const keys = [];
  let continuationToken;
  do {
    const resp = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix.endsWith("/") ? prefix : `${prefix}/`,
        ContinuationToken: continuationToken,
      }),
    );
    for (const obj of resp.Contents ?? []) {
      if (!obj.Key.endsWith("/")) keys.push(obj.Key);
    }
    continuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys;
}

async function main() {
  if (process.env.SKIP_ARTIFACT_DOWNLOAD === "1") {
    console.log("[download-artifacts] SKIP_ARTIFACT_DOWNLOAD=1 — skipping.");
    return;
  }

  const bucket = requireEnv("ARTIFACT_S3_BUCKET");
  const prefix = requireEnv("ARTIFACT_S3_PREFIX").replace(/\/$/, "");
  const region = process.env.AWS_REGION ?? "us-east-1";

  const client = new S3Client({ region });

  let totalFiles = 0;
  for (const subdir of ARTIFACT_SUBDIRS) {
    const s3Prefix = `${prefix}/${subdir}`;
    const keys = await listKeys(client, bucket, s3Prefix);

    if (keys.length === 0) {
      console.warn(`[download-artifacts] No objects found under s3://${bucket}/${s3Prefix}`);
      continue;
    }

    for (const key of keys) {
      // key: idsf/artifacts/latest/dashboard/home-metrics.json
      // relative: dashboard/home-metrics.json
      const relative = key.slice(`${prefix}/`.length);
      const destPath = join(PUBLIC_DIR, relative);
      await downloadObject(client, bucket, key, destPath);
      console.log(`[download-artifacts] ✓ ${key} → public/${relative}`);
      totalFiles++;
    }
  }

  // Smoke-check required files
  let missingCount = 0;
  for (const required of REQUIRED_FILES) {
    const { existsSync } = await import("node:fs");
    const p = join(PUBLIC_DIR, required);
    if (!existsSync(p)) {
      console.error(`[download-artifacts] ✗ Required file missing: public/${required}`);
      missingCount++;
    }
  }

  if (missingCount > 0) {
    console.error(
      `[download-artifacts] Build aborted: ${missingCount} required file(s) missing.`,
    );
    process.exit(1);
  }

  console.log(
    `[download-artifacts] Done — downloaded ${totalFiles} artifact(s) from s3://${bucket}/${prefix}`,
  );
}

main().catch((err) => {
  console.error("[download-artifacts] Fatal error:", err);
  process.exit(1);
});
