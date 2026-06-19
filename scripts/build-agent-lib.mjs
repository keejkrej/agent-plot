import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const srcDir = path.join(root, "agent", "lib");
const outDir = path.join(root, "dist", "agent-lib");

function collectFiles(dir, ext) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFiles(full, ext));
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      out.push(full);
    }
  }
  return out;
}

const entryPoints = collectFiles(srcDir, ".ts");
if (entryPoints.length === 0) {
  console.warn("No agent/lib TypeScript files found.");
  process.exit(0);
}

// Clean previous output so stale files don't accumulate.
fs.rmSync(outDir, { recursive: true, force: true });

await build({
  entryPoints,
  outdir: outDir,
  bundle: false,
  format: "esm",
  platform: "node",
  tsconfig: path.join(root, "tsconfig.json"),
  logLevel: "info",
});

// Rewrite internal `#lib/*` specifiers to relative `.js` imports so the
// compiled runtime modules can load each other without relying on package
// subpath imports (the Eve runtime snapshot does not preserve them).
const libImportRe = /(from\s+['"]|import\s+['"])#lib\/([^'"]+)(['"])/g;
const relativeImportRe = /(from\s+['"]|import\s+['"])(\.\.?\/[^'"]+)(['"])/g;

function resolveLibImport(fromDir, specifier) {
  const asFile = path.join(outDir, `${specifier}.js`);
  if (fs.existsSync(asFile)) {
    return relativeImport(fromDir, asFile);
  }
  const asIndex = path.join(outDir, specifier, "index.js");
  if (fs.existsSync(asIndex)) {
    return relativeImport(fromDir, asIndex);
  }
  // Fallback to the file path; Node will produce a clearer runtime error if
  // this is wrong.
  return relativeImport(fromDir, asFile);
}

function resolveRelativeImport(fromDir, specifier) {
  if (specifier.endsWith(".js") || specifier.endsWith(".json") || specifier.endsWith(".node")) {
    return specifier;
  }
  const targetBase = path.resolve(fromDir, specifier);
  const asFile = `${targetBase}.js`;
  if (fs.existsSync(asFile)) {
    return `${specifier}.js`;
  }
  const asIndex = path.join(targetBase, "index.js");
  if (fs.existsSync(asIndex)) {
    return `${specifier}/index.js`;
  }
  return specifier;
}

function relativeImport(fromDir, targetFile) {
  let rel = path.relative(fromDir, targetFile).replaceAll("\\", "/");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel;
}

function rewriteImports(filePath) {
  const dir = path.dirname(filePath);
  let content = fs.readFileSync(filePath, "utf8");
  let changed = false;
  content = content.replace(libImportRe, (match, prefix, specifier, suffix) => {
    changed = true;
    const resolved = resolveLibImport(dir, specifier);
    return `${prefix}${resolved}${suffix}`;
  });
  content = content.replace(relativeImportRe, (match, prefix, specifier, suffix) => {
    const resolved = resolveRelativeImport(dir, specifier);
    if (resolved !== specifier) {
      changed = true;
    }
    return `${prefix}${resolved}${suffix}`;
  });
  if (changed) {
    fs.writeFileSync(filePath, content);
  }
}

for (const outFile of collectFiles(outDir, ".js")) {
  rewriteImports(outFile);
}
