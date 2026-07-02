// API Documentation — standalone documentation for any APIs.json.
//
// Data acquisition, in priority order:
//   1. Inline <script id="apis-json-data"> — a self-contained bundle produced
//      by `npm run bundle` (works over file://, email, a zip, anywhere).
//   2. ?url=… query parameter — document any APIs.json on the web.
//   3. ./apis.json next to this HTML — the "zip the viewer up with your
//      apis.json" mode; drop the built index.html beside any apis.json.
//   4. A landing screen with drag-and-drop, file picker, URL, and examples.

import './style.css';
import { parse as parseYAML } from 'yaml';
import { normalize, type ApisDoc } from './model';
import { renderDocument, activateDocument } from './render';
import { getPayload } from './properties';
import { initEngage } from './engage';
import { esc, escAttr, downloadBlob } from './ui';

const EXAMPLES = [
  {
    slug: 'running-a-local-food-business-on-apis',
    name: 'Running a Local Food Business on APIs',
    blurb: 'An APIs.json 0.21 bundle — 8 APIs with inline OpenAPI, plus single- and cross-provider Arazzo workflows.',
  },
  {
    slug: 'api-evangelist-classic',
    name: 'API Evangelist (classic 0.14)',
    blurb: 'A classic 0.14-era index with URL properties only — how APIs.json looked when apis.io launched.',
  },
];

let current: ApisDoc | null = null;
let sourceLabel = '';

const app = document.getElementById('app')!;

function shell(): void {
  app.innerHTML = `
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">{&hairsp;}</span>
        <strong>API Documentation</strong>
        <span class="tag">standalone docs for any APIs.json</span>
      </div>
      <nav>
        <button class="ghost-btn" id="btn-open" title="Load a different APIs.json">Open…</button>
        <a href="https://apisjson.org" target="_blank" rel="noopener">APIs.json</a>
        <a href="https://apicommons.org/tools/" target="_blank" rel="noopener">API Commons</a>
        <a href="https://github.com/api-commons/api-documentation" target="_blank" rel="noopener">GitHub</a>
        <button class="engage-btn" id="engage-ae">Work with us</button>
      </nav>
    </header>
    <div id="view"></div>`;

  document.getElementById('btn-open')!.addEventListener('click', () => {
    history.replaceState(null, '', location.pathname);
    landing();
  });

  initEngage(() => {
    if (!current) return 'Context: browsing API Documentation with no APIs.json loaded yet.';
    return [
      `Context: viewing "${current.name}" (APIs.json ${current.specificationVersion})`,
      sourceLabel ? `Source: ${sourceLabel}` : '',
      `APIs: ${current.apis.length}; inline artifacts: ${[...current.apis.flatMap((a) => [...a.properties, ...a.workflows, ...a.prompts, ...a.rules]), ...current.common, ...current.workflows, ...current.prompts, ...current.rules].filter((p) => p.data !== undefined).length}`,
    ].filter(Boolean).join('\n');
  });

  // Toolbar buttons inside rendered artifacts (download / copy inline payloads).
  app.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-payload]');
    if (!btn) return;
    const payload = getPayload(Number(btn.dataset.payload));
    const text = JSON.stringify(payload, null, 2);
    if (btn.dataset.act === 'copy') {
      navigator.clipboard?.writeText(text);
      flash(btn, 'Copied');
    } else {
      downloadBlob('artifact.json', 'application/json', text);
    }
  });
}

function flash(btn: HTMLButtonElement, label: string): void {
  const old = btn.textContent;
  btn.textContent = label;
  setTimeout(() => { btn.textContent = old; }, 1200);
}

function view(): HTMLElement {
  return document.getElementById('view')!;
}

function parseDocument(text: string): unknown {
  const t = text.trim();
  if (t.startsWith('{') || t.startsWith('[')) return JSON.parse(t);
  return parseYAML(t);
}

function show(raw: unknown, label: string): void {
  try {
    current = normalize(raw);
  } catch (err) {
    landing(String(err instanceof Error ? err.message : err));
    return;
  }
  sourceLabel = label;
  document.title = `${current.name} — API Documentation`;
  view().innerHTML = renderDocument(current);
  activateDocument(view());

  document.getElementById('raw-download')?.addEventListener('click', () => {
    downloadBlob('apis.json', 'application/json', JSON.stringify(current!.raw, null, 2));
  });
  document.getElementById('raw-copy')?.addEventListener('click', (e) => {
    navigator.clipboard?.writeText(JSON.stringify(current!.raw, null, 2));
    flash(e.currentTarget as HTMLButtonElement, 'Copied');
  });

  if (location.hash) {
    document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }
}

async function loadUrl(url: string): Promise<void> {
  view().innerHTML = `<div class="loading">Fetching <code>${esc(url)}</code>…</div>`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    show(parseDocument(await res.text()), url);
  } catch (err) {
    landing(`Could not load ${url} — ${err instanceof Error ? err.message : err}. If the file is remote, its server must allow CORS.`);
  }
}

function landing(error?: string): void {
  current = null;
  document.title = 'API Documentation — APIs.json';
  view().innerHTML = `
    <div class="landing">
      <div class="hero">
        <h1>Documentation for your <span class="accent">APIs.json</span></h1>
        <p>Rich, portable HTML documentation for everything an APIs.json covers — every API, every property,
           and every inline artifact, with OpenAPI rendered as a full reference and Arazzo workflows as step-by-step
           timelines. Supports every APIs.json version, 0.11 through 0.21.</p>
      </div>
      ${error ? `<div class="error-note">${esc(error)}</div>` : ''}
      <div class="drop" id="drop">
        <p><strong>Drop an apis.json here</strong> — or</p>
        <div class="drop-actions">
          <label class="mini-btn file-btn">Choose a file<input type="file" id="file-input" accept=".json,.yaml,.yml,application/json" hidden></label>
          <span class="muted">or</span>
          <form id="url-form"><input type="url" id="url-input" placeholder="https://example.com/apis.json" required><button class="mini-btn" type="submit">Fetch</button></form>
        </div>
        <p class="small muted">JSON or YAML · nothing leaves your browser</p>
      </div>
      <div class="examples">
        <h2>Examples</h2>
        <div class="example-cards">
          ${EXAMPLES.map((ex) => `
            <button class="example-card" data-example="${escAttr(ex.slug)}">
              <strong>${esc(ex.name)}</strong>
              <span>${esc(ex.blurb)}</span>
            </button>`).join('')}
        </div>
      </div>
      <div class="landing-how">
        <h2>Take it with you</h2>
        <ol>
          <li><strong>Zip it up</strong> — put the built <code>index.html</code> next to any <code>apis.json</code> and serve the folder; the viewer finds and documents it automatically.</li>
          <li><strong>Bundle one file</strong> — <code>npm run bundle your-apis.json</code> produces a single self-contained HTML document that works from disk, email, or a gist.</li>
          <li><strong>Link by URL</strong> — <code>?url=https://…/apis.json</code> documents any APIs.json on the web (CORS permitting).</li>
        </ol>
      </div>
    </div>`;

  const drop = document.getElementById('drop')!;
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', async (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    const file = e.dataTransfer?.files?.[0];
    if (file) show(parseDocument(await file.text()), file.name);
  });
  document.getElementById('file-input')!.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) show(parseDocument(await file.text()), file.name);
  });
  document.getElementById('url-form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = (document.getElementById('url-input') as HTMLInputElement).value.trim();
    if (url) {
      history.replaceState(null, '', `?url=${encodeURIComponent(url)}`);
      loadUrl(url);
    }
  });
  view().querySelectorAll<HTMLButtonElement>('[data-example]').forEach((btn) => {
    btn.addEventListener('click', () => loadUrl(`examples/${btn.dataset.example}/apis.json`));
  });
}

async function boot(): Promise<void> {
  shell();

  const inline = document.getElementById('apis-json-data');
  if (inline?.textContent?.trim()) {
    show(JSON.parse(inline.textContent), 'bundled document');
    return;
  }

  const urlParam = new URLSearchParams(location.search).get('url');
  if (urlParam) {
    await loadUrl(urlParam);
    return;
  }

  try {
    const res = await fetch('./apis.json');
    if (res.ok) {
      show(parseDocument(await res.text()), './apis.json');
      return;
    }
  } catch {
    /* file:// or no sibling apis.json — fall through to the landing screen */
  }
  landing();
}

boot();
