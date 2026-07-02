// JSON Schema tree renderer used by the OpenAPI reference (request/response
// bodies, parameters) and Arazzo workflow inputs. Resolves local $refs through
// the provided resolver, guards against cycles, and renders as nested
// <details> so deep models stay scannable.

import { esc, rich } from './ui';

export type RefResolver = (ref: string) => unknown;

interface Ctx {
  resolve: RefResolver;
  seen: Set<unknown>;
}

function typeLabel(s: Record<string, unknown>): string {
  const t = s.type;
  let label = Array.isArray(t) ? t.join(' | ') : typeof t === 'string' ? t : '';
  if (label === 'array') {
    const items = s.items as Record<string, unknown> | undefined;
    const inner = items ? (typeof items.type === 'string' ? items.type : items.$ref ? refName(items.$ref as string) : 'object') : 'any';
    label = `array of ${inner}`;
  }
  if (typeof s.format === 'string') label += ` (${s.format})`;
  return label || (s.properties ? 'object' : s.$ref ? refName(s.$ref as string) : 'any');
}

function refName(ref: string): string {
  return ref.split('/').pop() || ref;
}

function constraints(s: Record<string, unknown>): string {
  const bits: string[] = [];
  if (Array.isArray(s.enum)) bits.push(`enum: ${s.enum.map((e) => JSON.stringify(e)).join(', ')}`);
  if (s.default !== undefined) bits.push(`default: ${JSON.stringify(s.default)}`);
  for (const k of ['minimum', 'maximum', 'minLength', 'maxLength', 'minItems', 'maxItems', 'pattern'] as const) {
    if (s[k] !== undefined) bits.push(`${k}: ${JSON.stringify(s[k])}`);
  }
  if (s.example !== undefined) bits.push(`example: ${JSON.stringify(s.example)}`);
  return bits.length ? `<div class="sch-constraints">${esc(bits.join(' · '))}</div>` : '';
}

function deref(s: unknown, ctx: Ctx): Record<string, unknown> | null {
  if (!s || typeof s !== 'object') return null;
  let cur = s as Record<string, unknown>;
  let hops = 0;
  while (typeof cur.$ref === 'string' && hops++ < 10) {
    const resolved = ctx.resolve(cur.$ref);
    if (!resolved || typeof resolved !== 'object') break;
    cur = resolved as Record<string, unknown>;
  }
  return cur;
}

function schemaNode(name: string | null, raw: unknown, required: boolean, ctx: Ctx, depth: number): string {
  const refLabel = raw && typeof raw === 'object' && typeof (raw as any).$ref === 'string' ? refName((raw as any).$ref) : '';
  const s = deref(raw, ctx);
  if (!s) return '';

  const head =
    `${name !== null ? `<span class="sch-name">${esc(name)}</span>` : ''}` +
    `<span class="sch-type">${esc(typeLabel(s))}${refLabel ? ` · ${esc(refLabel)}` : ''}</span>` +
    `${required ? '<span class="sch-req">required</span>' : ''}`;
  const desc = typeof s.description === 'string' && s.description ? `<div class="sch-desc">${rich(s.description)}</div>` : '';
  const cons = constraints(s);

  const children: string[] = [];
  if (!ctx.seen.has(s)) {
    ctx.seen.add(s);
    const req = new Set(Array.isArray(s.required) ? (s.required as string[]) : []);
    if (s.properties && typeof s.properties === 'object') {
      for (const [k, v] of Object.entries(s.properties as Record<string, unknown>)) {
        children.push(schemaNode(k, v, req.has(k), ctx, depth + 1));
      }
    }
    if (s.items) children.push(schemaNode('items', s.items, false, ctx, depth + 1));
    if (s.additionalProperties && typeof s.additionalProperties === 'object') {
      children.push(schemaNode('additional properties', s.additionalProperties, false, ctx, depth + 1));
    }
    for (const comb of ['allOf', 'oneOf', 'anyOf'] as const) {
      const arr = s[comb];
      if (Array.isArray(arr)) {
        arr.forEach((sub, i) => children.push(schemaNode(`${comb}[${i}]`, sub, false, ctx, depth + 1)));
      }
    }
    ctx.seen.delete(s);
  } else {
    children.push(`<div class="sch-cycle">recursive reference${refLabel ? ` to ${esc(refLabel)}` : ''}</div>`);
  }

  if (!children.filter(Boolean).length) {
    return `<div class="sch-row">${head}${desc}${cons}</div>`;
  }
  const open = depth < 2 ? ' open' : '';
  return `<details class="sch-branch"${open}><summary>${head}</summary>${desc}${cons}<div class="sch-children">${children.join('')}</div></details>`;
}

export function renderSchema(schema: unknown, resolve: RefResolver): string {
  if (!schema || typeof schema !== 'object') return '<div class="muted small">No schema.</div>';
  return `<div class="schema">${schemaNode(null, schema, false, { resolve, seen: new Set() }, 0)}</div>`;
}

export function makeResolver(root: unknown): RefResolver {
  return (ref: string) => {
    if (!ref.startsWith('#/')) return null;
    let cur: unknown = root;
    for (const part of ref.slice(2).split('/')) {
      if (!cur || typeof cur !== 'object') return null;
      cur = (cur as Record<string, unknown>)[part.replace(/~1/g, '/').replace(/~0/g, '~')];
    }
    return cur;
  };
}
