---
name: solid-schema
description: Look up, write, or extend JSON Schemas for urn:solid types. Use when validating data, auto-generating forms, deriving TypeScript/Python types, or asking an LLM to produce well-formed data conforming to a urn:solid type contract.
---

# solid-schema

JSON Schemas for `urn:solid` types. One JSON Schema per type, hosted at a stable URL. Drives validation, form generation, type-safe codegen, LLM data generation, and pane rendering across the LION + LOSOS stack.

```
LION (wire)  →  urn-solid (vocab)  →  solid-schema (this)  →  solid-panes (pointers)  →  LOSOS (runtime)
```

## When to use this skill

- The user has data tagged with a `urn:solid:` type and wants to validate it.
- The user wants a TypeScript / Python / Pydantic type for `urn:solid:X`.
- The user wants to drive LLM data generation with a schema (`response_format` style).
- The user wants to add a new type-contract to the registry.
- A LOSOS app's `schema-pane` or `schema-view` needs to know what shape `urn:solid:X` data has.

## Quick-start: validate one document

```js
import Ajv from 'https://esm.sh/ajv@8/dist/2020.js'
import addFormats from 'https://esm.sh/ajv-formats@3'

const ajv = new Ajv({ strict: false })
addFormats(ajv)

const schema = await fetch('https://solid-schema.github.io/Person/index.json').then(r => r.json())
const validate = ajv.compile(schema)

const ok = validate({ '@type': 'Person', name: 'Alice', email: 'alice@example.org' })
if (!ok) console.log(validate.errors)
```

## Resolving a schema

URL pattern: `https://solid-schema.github.io/<Name>/index.json`. Each file IS a real JSON Schema 2020-12 — drop into ajv, Zod, RJSF, json-schema-to-typescript, or any other JSON Schema tool with no unwrapping.

Index: `https://solid-schema.github.io/index.json` (Name → schema URL).
Reverse: `https://solid-schema.github.io/reverse-index.json` (`urn:solid:Type` → schema URL).

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
    "knows": {
      "type": "array",
      "items": { "anyOf": [
        { "type": "string", "format": "uri" },
        { "$ref": "https://solid-schema.github.io/Person/index.json" }
      ]}
    }
  },
  "required": ["@type"]
}
```

The body is standard JSON Schema. The `x-urn-solid` extension uses JSON Schema's reserved `x-` namespace for registry metadata (term identifier, link back to urn-solid, lifecycle status).

## Adding a new schema

1. **Make sure the term exists in urn-solid** (or propose it first at https://github.com/urn-solid/urn-solid.github.io/issues).
2. Create `<Name>/index.json` matching the anatomy above. Required fields: `$schema`, `$id`, `title`, `type`, `x-urn-solid` (with `term`, `status`, `added`).
3. Constrain conservatively. `additionalProperties: true` is the default — be permissive at the edges; require only the truly load-bearing fields.
4. `npm run validate` checks both the meta-schema constraints and that each file is itself a valid JSON Schema 2020-12. Cross-references between schemas (e.g. `Note` referencing `Person` via `$ref`) resolve.
5. `npm run build` regenerates index/reverse-index/corpus and HTML wrappers.
6. Commit + push.
7. **Optional**: add a manifest entry in [solid-panes](https://solid-panes.github.io/) so LOSOS apps can auto-render the new type.

## Conventions worth knowing

- **`@type`**: always include both bare and urn:solid forms in the enum (`["Person", "urn:solid:Person"]`).
- **`@id`**: typed as `string` with `format: uri`.
- **Cross-references**: use absolute `$ref` to other schemas in the registry. Keeps the schemas self-contained and tool-friendly.
- **Date-times**: `format: date-time` (ISO 8601). Parsers and form libraries handle this universally.
- **xsd:duration**: regex pattern `^-?P(?:[0-9]+Y)?(?:[0-9]+M)?(?:[0-9]+D)?(?:T(?:[0-9]+H)?(?:[0-9]+M)?(?:[0-9]+(?:\.[0-9]+)?S)?)?$`.
- **Polymorphism**: `oneOf` / `anyOf` for fields that accept multiple shapes (e.g. an issuer that's either a string IRI or an object).

## Codegen patterns

- **TypeScript**: `npx json-schema-to-typescript https://solid-schema.github.io/Person/index.json > Person.ts`
- **Python (Pydantic)**: `datamodel-codegen --url https://solid-schema.github.io/Person/index.json --output Person.py`
- **Form (React)**: drop the schema URL into [react-jsonschema-form](https://github.com/rjsf-team/react-jsonschema-form).
- **LLM**: pass the schema as `response_format` (OpenAI) or as a tool input schema (Anthropic) — the model produces well-formed data without further prompting.

## Don't

- Don't add a schema for a type that has no urn-solid term — the registry chain breaks.
- Don't put bespoke business rules that break round-tripping in `additionalProperties: false` unless you really mean it (most data on the fediverse carries extra fields you don't know about).
- Don't use `$ref` to schemas outside the solid-schema registry — keeps the chain self-contained and avoids dangling references.
- Don't hand-edit the generated `index.json`, `reverse-index.json`, or `corpus.jsonl` — they're built from the source files.

## Reference URLs

- Index: https://solid-schema.github.io/index.json
- Reverse index (`urn:solid:Type` → schema URL): https://solid-schema.github.io/reverse-index.json
- Corpus (every schema, JSONL): https://solid-schema.github.io/corpus.jsonl
- Meta-schema (registry conventions): https://solid-schema.github.io/schema/meta.schema.json
- Site: https://solid-schema.github.io/

## Related skills

- `urn-solid` — vocabulary registry. Use to find the term identifier this schema describes.
- `solid-panes` — pane registry that points apps at the right schema + UI for each type.
- `losos` — the runtime. See https://losos.org/SKILL.md.
