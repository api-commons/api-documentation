# API Documentation

**Standalone, portable documentation for any [APIs.json](https://apisjson.org).**

Live at **[documentation.apicommons.org](https://documentation.apicommons.org)** — an [API Commons](https://apicommons.org) tool.

APIs.json indexes the APIs an organization or a bundle depends on — and since version 0.19 it can carry the artifacts themselves as inline `data` properties: full OpenAPI definitions, Arazzo workflows, prompts, and rules. This tool turns any APIs.json into rich, readable HTML documentation:

- **Every API** in the index, with its link properties (documentation, signup, pricing, authentication…) as cards
- **Inline OpenAPI** rendered as a full API reference — servers, authentication, tag-grouped operations, parameters, request bodies, and response schemas
- **Inline Arazzo** rendered as step-by-step workflow timelines with inputs, payloads, success criteria, and outputs
- **Common properties, workflows, prompts, rules, includes, overlays, network, and maintainers**
- **Every specification version**, 0.11 through 0.21, with advisory notes when a document uses fields newer than the version it declares

Nothing leaves the browser — there is no backend.

## Three ways to use it

**1. Hosted.** Open [documentation.apicommons.org](https://documentation.apicommons.org) and drop in a file, or link to any APIs.json on the web:

```
https://documentation.apicommons.org/?url=https://example.com/apis.json
```

**2. Zip it up with your apis.json.** The build produces a fully self-contained `dist/apis-json-viewer.html`. Rename it `index.html`, put it next to any `apis.json`, and serve or zip the folder — the viewer finds the sibling file and documents it automatically.

```
my-apis/
├── apis.json
└── index.html   ← dist/apis-json-viewer.html
```

**3. Bundle a single file.** Inline a document into the viewer and get one HTML file that works from disk, a gist, or an email attachment — no server at all:

```bash
npm run build
npm run bundle -- path/to/apis.json my-apis.html
```

## Examples

Two example implementations ship in [`examples/`](examples/) and are published with the site — each as a `apis.json` + sibling viewer (`index.html`) and as a single bundled file (`bundled.html`):

- **[Running a Local Food Business on APIs](https://documentation.apicommons.org/examples/running-a-local-food-business-on-apis/)** — an APIs.json 0.21 bundle with 8 APIs carrying inline OpenAPI, per-API Arazzo workflows, and cross-provider workflows in `common`
- **[API Evangelist (classic 0.14)](https://documentation.apicommons.org/examples/api-evangelist-classic/)** — a classic 0.14-era index with URL-only properties, the way APIs.json looked when apis.io launched

## Development

```bash
npm install
npm run dev        # local dev server
npm run build      # dist/ + dist/apis-json-viewer.html + dist/examples/
npm run typecheck
```

## Part of API Commons

An open, browser-first tool from **[API Commons](https://apicommons.org)** — free, no backend, your data stays in your browser. Browse the full set at **[apicommons.org/tools](https://apicommons.org/tools/)**.

**Related tools**
- [API Discovery](https://discovery.apicommons.org) — browser-first registry that composes the APIs.json this tool renders
- [API Experience](https://experience.apicommons.org) — DX/AX layer + coverage scorecard
- [API Reusability](https://reusability.apicommons.org) — score API reuse across an org
- [API Validator](https://validator.apicommons.org) — lint OpenAPI/AsyncAPI/Arazzo/JSON Schema in-browser
- [Model Library](https://library.apicommons.org) — versioned model library + drift/breaking-change detection

## License

Apache-2.0
