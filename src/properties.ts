// Renders APIs.json property lists — the heart of every APIs.json. URL
// properties become link cards; inline data properties are dispatched to the
// richest renderer available (OpenAPI reference, Arazzo timeline, JSON tree).

import { parse as parseYAML } from 'yaml';
import type { PropertyItem } from './model';
import { esc, escAttr, rich, tagChips } from './ui';
import { renderOpenAPI } from './openapi';
import { renderArazzo } from './arazzo';
import { renderJSONTree } from './datatree';

// Inline payloads are registered here so toolbar buttons (download / copy)
// can reference them by index instead of duplicating the data in the DOM.
const payloads: unknown[] = [];

export function getPayload(i: number): unknown {
  return payloads[i];
}

function materialize(p: PropertyItem): unknown {
  let d = p.data;
  if (typeof d === 'string') {
    const mt = (p.mediaType || '').toLowerCase();
    try {
      d = mt.includes('yaml') || /^\s*[\w#-]/.test(d) && !mt.includes('json') ? parseYAML(d) : JSON.parse(d);
    } catch {
      /* leave as string */
    }
  }
  return d;
}

function artifactBody(p: PropertyItem): { html: string; kind: string } {
  const d = materialize(p);
  const t = (p.type || '').toLowerCase();
  const obj = d && typeof d === 'object' ? (d as Record<string, unknown>) : null;
  if (obj && (t === 'openapi' || t === 'swagger' || obj.openapi || obj.swagger)) {
    return { html: renderOpenAPI(obj), kind: 'OpenAPI' };
  }
  if (obj && (t === 'arazzo' || obj.arazzo)) {
    return { html: renderArazzo(obj), kind: 'Arazzo' };
  }
  if (typeof d === 'string') {
    return { html: `<pre class="example">${esc(d)}</pre>`, kind: 'text' };
  }
  return { html: renderJSONTree(d), kind: 'data' };
}

function artifactCard(p: PropertyItem, open: boolean): string {
  const { html, kind } = artifactBody(p);
  const idx = payloads.push(materialize(p)) - 1;
  const title = p.name || p.type || 'Inline artifact';
  return `
    <details class="prop-artifact"${open ? ' open' : ''}>
      <summary>
        <span class="prop-type-badge">${esc(p.type || kind)}</span>
        <span class="prop-title">${esc(title)}</span>
        <span class="prop-inline-note">inline ${esc(kind)}</span>
      </summary>
      <div class="prop-artifact-body">
        <div class="prop-toolbar">
          ${p.description ? `<div class="prop-desc">${rich(p.description)}</div>` : '<div></div>'}
          <div class="prop-actions">
            <button class="mini-btn" data-payload="${idx}" data-act="download">Download JSON</button>
            <button class="mini-btn" data-payload="${idx}" data-act="copy">Copy</button>
          </div>
        </div>
        ${tagChips(p.tags)}
        ${html}
      </div>
    </details>`;
}

function linkCard(p: PropertyItem): string {
  const title = p.name || p.type || p.url || 'Link';
  return `
    <a class="prop-link" href="${escAttr(p.url)}" target="_blank" rel="noopener">
      <span class="prop-type-badge">${esc(p.type || 'URL')}</span>
      <span class="prop-link-body">
        <span class="prop-title">${esc(title)}</span>
        ${p.description ? `<span class="prop-link-desc">${esc(p.description)}</span>` : ''}
        <span class="prop-url">${esc(p.url)}</span>
      </span>
    </a>`;
}

export interface PropertyRenderOptions {
  /** Auto-open the first inline artifact in the list. */
  openFirst?: boolean;
}

export function renderProperties(props: PropertyItem[], opts: PropertyRenderOptions = {}): string {
  if (!props.length) return '';
  const links = props.filter((p) => p.data === undefined && p.url);
  const artifacts = props.filter((p) => p.data !== undefined);
  const other = props.filter((p) => p.data === undefined && !p.url);
  return `
    ${links.length ? `<div class="prop-links">${links.map(linkCard).join('')}</div>` : ''}
    ${artifacts.map((p, i) => artifactCard(p, Boolean(opts.openFirst && i === 0))).join('')}
    ${other.map((p) => `<div class="muted small">Property ${esc(p.type || p.name || '?')} has no url or data.</div>`).join('')}`;
}
