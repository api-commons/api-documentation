// Collapsible tree renderer for arbitrary JSON values — the fallback view for
// any inline data property the viewer has no dedicated renderer for, and the
// payload view inside Arazzo steps. Pure <details> markup: works with JS
// disabled and prints expanded.

import { esc } from './ui';

const MAX_AUTO_OPEN_DEPTH = 2;

function preview(v: unknown): string {
  if (Array.isArray(v)) return `Array(${v.length})`;
  if (v && typeof v === 'object') {
    const keys = Object.keys(v as object);
    return `{ ${keys.slice(0, 4).join(', ')}${keys.length > 4 ? ', …' : ''} }`;
  }
  return '';
}

function leaf(v: unknown): string {
  if (typeof v === 'string') {
    if (/^https?:\/\//.test(v)) return `<a class="jt-str" href="${esc(v)}" target="_blank" rel="noopener">"${esc(v)}"</a>`;
    return `<span class="jt-str">"${esc(v)}"</span>`;
  }
  if (typeof v === 'number') return `<span class="jt-num">${v}</span>`;
  if (typeof v === 'boolean') return `<span class="jt-bool">${v}</span>`;
  if (v === null) return `<span class="jt-null">null</span>`;
  return `<span class="jt-null">${esc(String(v))}</span>`;
}

function node(key: string | null, v: unknown, depth: number): string {
  const label = key === null ? '' : `<span class="jt-key">${esc(key)}</span><span class="jt-sep">: </span>`;
  if (Array.isArray(v) || (v && typeof v === 'object')) {
    const entries = Array.isArray(v)
      ? v.map((item, i) => node(String(i), item, depth + 1))
      : Object.entries(v as Record<string, unknown>).map(([k, val]) => node(k, val, depth + 1));
    if (!entries.length) return `<div class="jt-row">${label}${leaf(Array.isArray(v) ? '[]' : '{}').replace('jt-str', 'jt-null')}</div>`;
    const open = depth < MAX_AUTO_OPEN_DEPTH ? ' open' : '';
    return `<details class="jt-branch"${open}><summary>${label}<span class="jt-preview">${esc(preview(v))}</span></summary><div class="jt-children">${entries.join('')}</div></details>`;
  }
  return `<div class="jt-row">${label}${leaf(v)}</div>`;
}

export function renderJSONTree(value: unknown): string {
  return `<div class="jsontree">${node(null, value, 0)}</div>`;
}
