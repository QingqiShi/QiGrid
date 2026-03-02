import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { transform } from "esbuild";

const MAX_GZIPPED_KB = 30;

const source = readFileSync("dist/index.mjs", "utf8");
const rawBytes = Buffer.byteLength(source, "utf8");

const { code: minified } = await transform(source, {
  minify: true,
  format: "esm",
});
const minifiedBytes = Buffer.byteLength(minified, "utf8");

const gzipped = gzipSync(Buffer.from(minified, "utf8"));
const gzippedBytes = gzipped.length;

const fmt = (b) => {
  if (b < 1024) return `${b} B`;
  return `${(b / 1024).toFixed(2)} KB`;
};

console.log(`\n@qigrid/core bundle size`);
console.log(`  Raw:              ${fmt(rawBytes)}`);
console.log(`  Minified:         ${fmt(minifiedBytes)}`);
console.log(`  Minified + gzip:  ${fmt(gzippedBytes)}`);

if (gzippedBytes > MAX_GZIPPED_KB * 1024) {
  console.error(`\n✗ Gzipped size ${fmt(gzippedBytes)} exceeds ${MAX_GZIPPED_KB}KB limit`);
  process.exit(1);
} else {
  console.log(`\n✓ Gzipped size within ${MAX_GZIPPED_KB}KB limit`);
}
