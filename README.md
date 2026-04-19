# solid-schema

JSON Schemas for [urn:solid](https://urn-solid.github.io/) types.

One JSON Schema per type, published at a stable URL. Drives validation, form generation, type-safe codegen, and pane rendering across the LION + LOSOS stack.

```
Person/index.json   →  https://solid-schema.github.io/Person/index.json
Note/index.json     →  https://solid-schema.github.io/Note/index.json
Event/index.json    →  https://solid-schema.github.io/Event/index.json
...
```

## What you get from one schema

| Use | Tool | Notes |
|---|---|---|
| Validate JSON | ajv, Zod | Drop in any JSON Schema validator |
| Generate forms | [react-jsonschema-form](https://github.com/rjsf-team/react-jsonschema-form), JSON Forms | Production-grade, instant |
| Generate TypeScript | json-schema-to-typescript, Zod | Compile-time safety |
| Generate Python | datamodel-code-generator | Pydantic / dataclass output |
| Drive LOSOS panes | LOSOS pane registry | Pane fetches schema, auto-renders |
| Validate RDF graphs | auto-derived SHACL | RDF-side validation for free |
| LLM data generation | model API with `response_format` | Reliable, well-formed output |

## Repo layout

```
<Name>/index.json    Source of truth — a real JSON Schema + x-urn-solid metadata
<Name>/index.html    Generated wrapper page with inlined schema
schema/meta.schema.json   Meta-schema enforcing registry conventions
scripts/validate.js  Validate every schema against the meta-schema + JSON Schema 2020-12
scripts/build.js     Generate HTML wrappers, index.json, reverse-index.json, corpus.jsonl
index.json           Generated: title/description/term lookup
reverse-index.json   Generated: urn:solid:Term → schema URL
corpus.jsonl         Generated: every schema, one per line
```

## Anatomy of a schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://solid-schema.github.io/Person/index.json",
  "title": "Person",
  "description": "A human person — schema for data typed as urn:solid:Person.",
  "type": "object",
  "x-urn-solid": {
    "term": "urn:solid:Person",
    "termRegistry": "https://urn-solid.github.io/Person/",
    "status": "stable",
    "added": "2026-04-19"
  },
  "properties": {
    "@id":  { "type": "string", "format": "uri" },
    "@type": { "enum": ["Person", "urn:solid:Person"] },
    "name": { "type": "string", "minLength": 1, "maxLength": 200 },
    "knows": { "type": "array", "items": { "anyOf": [
      { "type": "string", "format": "uri" },
      { "$ref": "https://solid-schema.github.io/Person/index.json" }
    ]}}
  },
  "required": ["@type"]
}
```

The body is a real JSON Schema 2020-12 — any standard validator consumes it directly. The `x-urn-solid` extension is non-normative metadata for registry conventions (term identifier, status, lineage).

## Stack position

```
┌──────────────────────────────────┐
│  LION                            │  wire format (just JSON)
├──────────────────────────────────┤
│  urn-solid                       │  vocabulary (names + owl:sameAs)
├──────────────────────────────────┤
│  solid-schema (this repo)        │  contracts (per-type JSON Schema)
├──────────────────────────────────┤
│  LOSOS                           │  runtime (panes consume schemas)
└──────────────────────────────────┘
```

Each layer is independent and small. Apps that don't need contracts skip this layer; apps that do get validation, forms, and codegen for free.

## Contributing

Source files at `<Name>/index.json` (e.g. `Person/index.json`). Do not hand-edit the HTML wrappers, `index.json`, `reverse-index.json`, or `corpus.jsonl` — they are regenerated.

```bash
npm install
npm run validate
npm run build
```

## License

[AGPL-3.0](LICENSE)
