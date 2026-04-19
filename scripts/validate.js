#!/usr/bin/env node
// Validate every <Name>/index.json:
//   1. against the meta-schema (registry conventions)
//   2. as a valid JSON Schema 2020-12 in its own right
//
// Exit non-zero on the first failure so CI catches it.

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");

const RESERVED = new Set([
  "schema", "scripts", "node_modules", ".github", ".git", ".claude",
  "assets", "vendor", "spec", "shapes", "types"
]);

const isTypeDir = (name) => {
  if (RESERVED.has(name)) return false;
  if (name.startsWith(".")) return false;
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(name)) return false;
  return fs.existsSync(path.join(ROOT, name, "index.json"));
};

const META_SCHEMA = JSON.parse(
  fs.readFileSync(path.join(ROOT, "schema", "meta.schema.json"), "utf8")
);

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
const validateMeta = ajv.compile(META_SCHEMA);

const names = fs.readdirSync(ROOT, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .filter(isTypeDir)
  .sort();

// Load + parse every schema first so cross-references between schemas
// (e.g. Note's attributedTo references Person) resolve when ajv compiles.
const loaded = [];
let failed = 0;
for (const name of names) {
  const filePath = path.join(ROOT, name, "index.json");
  const text = fs.readFileSync(filePath, "utf8");
  let schema;
  try { schema = JSON.parse(text); }
  catch (e) {
    console.error(`[validate] ${name}: malformed JSON — ${e.message}`);
    failed++;
    continue;
  }
  const expectedId = `https://solid-schema.github.io/${name}/index.json`;
  if (schema.$id !== expectedId) {
    console.error(`[validate] ${name}: $id "${schema.$id}" must match directory: "${expectedId}"`);
    failed++;
    continue;
  }
  ajv.addSchema(schema, schema.$id);
  loaded.push({ name, schema });
}

let ok = 0;
for (const { name, schema } of loaded) {
  if (!validateMeta(schema)) {
    console.error(`[validate] ${name}: failed meta-schema:`, validateMeta.errors);
    failed++;
    continue;
  }
  try {
    ajv.getSchema(schema.$id) || ajv.compile(schema);
  } catch (e) {
    console.error(`[validate] ${name}: not a valid JSON Schema 2020-12 — ${e.message}`);
    failed++;
    continue;
  }
  ok++;
}

console.log(`[validate] ${ok} ok, ${failed} failed`);
if (failed > 0) process.exit(1);
