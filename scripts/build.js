#!/usr/bin/env node
// Build step: walk <Name>/index.json files, emit:
//   - <Name>/index.html       (HTML wrapper with inlined schema as data island)
//   - index.json              (term → schema URL lookup)
//   - reverse-index.json      (urn:solid:Term → schema URL — mirrors urn-solid's pattern)
//   - corpus.jsonl            (every schema, one per line)
//
// Idempotent (compares before writing).

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

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

const writeIfChanged = (file, content) => {
  if (fs.existsSync(file) && fs.readFileSync(file, "utf8") === content) return false;
  fs.writeFileSync(file, content);
  return true;
};

const escapeForScriptTag = (json) => json.replace(/<\/script/gi, "<\\/script");

const htmlShell = (schema, jsonText, name) => {
  const title = schema.title || name;
  const description = (schema.description || "").replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title} — solid-schema</title>
<meta name="description" content="${description}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="canonical" href="/${name}/">
<link rel="alternate" type="application/schema+json" href="/${name}/index.json">
<script type="application/schema+json">
${escapeForScriptTag(jsonText)}
</script>
<style>
body { font-family: Georgia, serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; color: #2c2c2c; background: #fafaf8; }
header a { color: #888; text-decoration: none; margin-right: 1.2rem; }
h1 { margin-bottom: 0.25rem; }
.subtitle { color: #888; margin-top: 0; }
.urn { font-family: monospace; background: #f0efeb; padding: 0.1em 0.4em; border-radius: 3px; }
pre { background: #f0efeb; padding: 1rem; overflow-x: auto; border-radius: 4px; }
</style>
</head>
<body>
<header>
  <a href="/">solid-schema</a>
  <a href="/index.json">index</a>
  <a href="/reverse-index.json">reverse</a>
  <a href="/corpus.jsonl">corpus</a>
</header>
<main>
  <h1>${title}</h1>
  <p class="subtitle">${description}</p>
  <p>Term: <a class="urn" href="${schema["x-urn-solid"]?.termRegistry || "#"}">${schema["x-urn-solid"]?.term || ""}</a></p>
  <h2>Schema</h2>
  <pre><code>${jsonText.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</code></pre>
</main>
</body>
</html>
`;
};

const assertNoCaseCollisions = (names) => {
  const lower = new Map();
  for (const n of names) {
    const key = n.toLowerCase();
    if (lower.has(key) && lower.get(key) !== n) {
      throw new Error(`Case collision: "${lower.get(key)}" and "${n}" differ only in case.`);
    }
    lower.set(key, n);
  }
};

const main = () => {
  const names = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .filter(isTypeDir)
    .sort();

  assertNoCaseCollisions(names);

  const index = {};
  const reverseIndex = {};
  const corpusLines = [];
  let htmlChanged = 0;

  for (const name of names) {
    const srcPath = path.join(ROOT, name, "index.json");
    const jsonText = fs.readFileSync(srcPath, "utf8");
    let schema;
    try { schema = JSON.parse(jsonText); }
    catch (e) {
      console.error(`[build] ${srcPath}: malformed JSON — ${e.message}`);
      process.exit(1);
    }

    if (writeIfChanged(path.join(ROOT, name, "index.html"), htmlShell(schema, jsonText, name))) htmlChanged++;

    const schemaUrl = `/${name}/index.json`;
    const term = schema["x-urn-solid"]?.term;

    index[name] = {
      title: schema.title,
      description: schema.description,
      term,
      status: schema["x-urn-solid"]?.status,
      schema: schemaUrl
    };

    if (term) reverseIndex[term] = schemaUrl;

    corpusLines.push(JSON.stringify(schema));
  }

  const indexChanged = writeIfChanged(path.join(ROOT, "index.json"), JSON.stringify(index, null, 2) + "\n");
  const reverseChanged = writeIfChanged(path.join(ROOT, "reverse-index.json"), JSON.stringify(reverseIndex, null, 2) + "\n");
  const corpusChanged = writeIfChanged(path.join(ROOT, "corpus.jsonl"), corpusLines.join("\n") + "\n");

  console.log(`[build] ${names.length} schemas — ${htmlChanged} html updated, index.json ${indexChanged ? "updated" : "unchanged"}, reverse-index.json ${reverseChanged ? "updated" : "unchanged"}, corpus.jsonl ${corpusChanged ? "updated" : "unchanged"}`);
};

main();
