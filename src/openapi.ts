// Full inline OpenAPI reference renderer — the reason this viewer exists.
// Handles OpenAPI 3.x fully and Swagger 2.0 tolerantly: info, servers,
// security schemes, and tag-grouped operations with parameters, request
// bodies, and responses rendered as schema trees.

import { esc, escAttr, rich, extLink, nextId } from './ui';
import { renderSchema, makeResolver, type RefResolver } from './schema';

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'] as const;

type Obj = Record<string, unknown>;

function asObj(v: unknown): Obj {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {};
}

function deref(v: unknown, resolve: RefResolver): Obj {
  const o = asObj(v);
  return typeof o.$ref === 'string' ? asObj(resolve(o.$ref)) : o;
}

function infoBlock(doc: Obj): string {
  const info = asObj(doc.info);
  const version = doc.openapi || doc.swagger;
  const contact = asObj(info.contact);
  const license = asObj(info.license);
  const meta = [
    info.version ? `<span class="chip"><span class="chip-k">API version</span>${esc(info.version)}</span>` : '',
    version ? `<span class="chip"><span class="chip-k">${doc.swagger ? 'Swagger' : 'OpenAPI'}</span>${esc(version)}</span>` : '',
    license.name ? `<span class="chip"><span class="chip-k">License</span>${esc(license.name)}</span>` : '',
  ].join('');
  const links = [
    info.termsOfService ? extLink(info.termsOfService, 'Terms of service') : '',
    contact.url ? extLink(contact.url, contact.name ? `Contact: ${contact.name}` : 'Contact') : '',
    contact.email ? `<a href="mailto:${escAttr(contact.email)}">${esc(contact.email)}</a>` : '',
    asObj(doc.externalDocs).url ? extLink(asObj(doc.externalDocs).url, (asObj(doc.externalDocs).description as string) || 'External docs') : '',
  ].filter(Boolean).join(' · ');
  return `
    <div class="oas-info">
      ${info.title ? `<h4>${esc(info.title)}</h4>` : ''}
      <div class="chips">${meta}</div>
      ${info.description ? `<div class="oas-desc">${rich(info.description)}</div>` : ''}
      ${links ? `<div class="small">${links}</div>` : ''}
    </div>`;
}

function serversBlock(doc: Obj): string {
  const servers = Array.isArray(doc.servers) ? (doc.servers as Obj[]) : [];
  if (doc.swagger && typeof doc.host === 'string') {
    const scheme = Array.isArray(doc.schemes) && doc.schemes.length ? doc.schemes[0] : 'https';
    servers.push({ url: `${scheme}://${doc.host}${typeof doc.basePath === 'string' ? doc.basePath : ''}` });
  }
  if (!servers.length) return '';
  return `
    <div class="oas-block">
      <h5>Servers</h5>
      ${servers.map((s) => `<div class="server"><code>${esc(s.url)}</code>${s.description ? ` <span class="muted">— ${esc(s.description)}</span>` : ''}</div>`).join('')}
    </div>`;
}

function securityBlock(doc: Obj, resolve: RefResolver): string {
  const schemes = asObj(asObj(doc.components).securitySchemes || doc.securityDefinitions);
  const names = Object.keys(schemes);
  if (!names.length) return '';
  const rows = names.map((name) => {
    const s = deref(schemes[name], resolve);
    const detail = [
      s.type ? `type: ${s.type}` : '',
      s.scheme ? `scheme: ${s.scheme}` : '',
      s.bearerFormat ? `bearer: ${s.bearerFormat}` : '',
      s.in && s.name ? `${s.in} parameter "${s.name}"` : '',
      s.openIdConnectUrl ? `OIDC: ${s.openIdConnectUrl}` : '',
    ].filter(Boolean).join(' · ');
    const flows = asObj(s.flows);
    const flowBits = Object.entries(flows).map(([fname, f]) => {
      const fo = asObj(f);
      const scopes = Object.keys(asObj(fo.scopes));
      return `<div class="small muted">${esc(fname)} flow${fo.authorizationUrl ? ` — authorize: <code>${esc(fo.authorizationUrl)}</code>` : ''}${fo.tokenUrl ? ` — token: <code>${esc(fo.tokenUrl)}</code>` : ''}${scopes.length ? `<br>scopes: ${scopes.map((sc) => `<code>${esc(sc)}</code>`).join(' ')}` : ''}</div>`;
    }).join('');
    return `
      <div class="sec-scheme">
        <div><strong>${esc(name)}</strong> <span class="muted small">${esc(detail)}</span></div>
        ${s.description ? `<div class="small">${rich(s.description)}</div>` : ''}
        ${flowBits}
      </div>`;
  }).join('');
  return `<div class="oas-block"><h5>Authentication</h5>${rows}</div>`;
}

function paramsTable(params: Obj[], resolve: RefResolver): string {
  if (!params.length) return '';
  const rows = params.map((raw) => {
    const p = deref(raw, resolve);
    const schema = asObj(p.schema);
    const type = schema.type || p.type || (schema.$ref ? String(schema.$ref).split('/').pop() : '');
    return `<tr>
      <td><code>${esc(p.name)}</code></td>
      <td>${esc(p.in)}</td>
      <td>${esc(type)}${p.required ? ' <span class="sch-req">required</span>' : ''}</td>
      <td>${rich(p.description)}</td>
    </tr>`;
  }).join('');
  return `
    <h6>Parameters</h6>
    <table class="params"><thead><tr><th>Name</th><th>In</th><th>Type</th><th>Description</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function contentBlock(content: Obj, resolve: RefResolver): string {
  const types = Object.entries(content);
  if (!types.length) return '';
  return types.map(([mt, spec]) => {
    const s = asObj(spec);
    return `
      <div class="content-type"><code>${esc(mt)}</code></div>
      ${s.schema ? renderSchema(s.schema, resolve) : ''}
      ${s.example !== undefined ? `<pre class="example">${esc(JSON.stringify(s.example, null, 2))}</pre>` : ''}`;
  }).join('');
}

function requestBodyBlock(op: Obj, resolve: RefResolver): string {
  const rb = deref(op.requestBody, resolve);
  const bodyParam = Array.isArray(op.parameters)
    ? (op.parameters as Obj[]).map((p) => deref(p, resolve)).find((p) => p.in === 'body')
    : undefined;
  if (bodyParam?.schema) {
    return `<h6>Request body</h6>${rich(bodyParam.description)}${renderSchema(bodyParam.schema, resolve)}`;
  }
  if (!Object.keys(rb).length) return '';
  return `
    <h6>Request body${rb.required ? ' <span class="sch-req">required</span>' : ''}</h6>
    ${rb.description ? `<div class="small">${rich(rb.description)}</div>` : ''}
    ${contentBlock(asObj(rb.content), resolve)}`;
}

function responsesBlock(op: Obj, resolve: RefResolver): string {
  const responses = asObj(op.responses);
  const codes = Object.keys(responses);
  if (!codes.length) return '';
  const rows = codes.map((code) => {
    const r = deref(responses[code], resolve);
    const cls = code.startsWith('2') ? 'ok' : code.startsWith('4') || code.startsWith('5') ? 'err' : 'neutral';
    const body = `${contentBlock(asObj(r.content), resolve)}${!r.content && r.schema ? renderSchema(r.schema, resolve) : ''}`;
    if (!body.trim()) {
      return `<div class="resp"><span class="resp-code ${cls}">${esc(code)}</span> <span class="small">${esc(r.description || '')}</span></div>`;
    }
    return `
      <details class="resp">
        <summary><span class="resp-code ${cls}">${esc(code)}</span> <span class="small">${esc(r.description || '')}</span></summary>
        <div class="resp-body">${body}</div>
      </details>`;
  }).join('');
  return `<h6>Responses</h6>${rows}`;
}

interface TaggedOp {
  method: string;
  path: string;
  op: Obj;
  pathParams: Obj[];
}

function operationCard(t: TaggedOp, resolve: RefResolver): string {
  const { method, path, op } = t;
  const params = [
    ...t.pathParams,
    ...(Array.isArray(op.parameters) ? (op.parameters as Obj[]) : []),
  ].map((p) => deref(p, resolve)).filter((p) => p.in !== 'body');
  const opId = op.operationId ? `<code class="op-id">${esc(op.operationId)}</code>` : '';
  return `
    <details class="op op-${method}" id="${escAttr(nextId('op'))}">
      <summary>
        <span class="method m-${method}">${method.toUpperCase()}</span>
        <code class="op-path">${esc(path)}</code>
        <span class="op-summary">${esc(op.summary || '')}</span>
        ${op.deprecated ? '<span class="deprecated">deprecated</span>' : ''}
      </summary>
      <div class="op-body">
        ${opId ? `<div class="small muted">operationId: ${opId}</div>` : ''}
        ${op.description && op.description !== op.summary ? `<div class="op-desc">${rich(op.description)}</div>` : ''}
        ${paramsTable(params, resolve)}
        ${requestBodyBlock(op, resolve)}
        ${responsesBlock(op, resolve)}
      </div>
    </details>`;
}

export function renderOpenAPI(data: unknown): string {
  const doc = asObj(data);
  if (!doc.openapi && !doc.swagger && !doc.paths) {
    return '<div class="muted small">Inline OpenAPI data could not be interpreted.</div>';
  }
  const resolve = makeResolver(doc);

  const groups = new Map<string, TaggedOp[]>();
  const paths = asObj(doc.paths);
  for (const [path, item] of Object.entries(paths)) {
    const pi = deref(item, resolve);
    const pathParams = Array.isArray(pi.parameters) ? (pi.parameters as Obj[]) : [];
    for (const method of METHODS) {
      const op = asObj(pi[method]);
      if (!Object.keys(op).length) continue;
      const tags = Array.isArray(op.tags) && op.tags.length ? (op.tags as string[]) : ['Operations'];
      for (const tag of tags) {
        if (!groups.has(tag)) groups.set(tag, []);
        groups.get(tag)!.push({ method, path, op, pathParams });
      }
    }
  }

  const tagDescriptions = new Map<string, string>(
    (Array.isArray(doc.tags) ? (doc.tags as Obj[]) : [])
      .filter((t) => typeof t.name === 'string')
      .map((t) => [t.name as string, typeof t.description === 'string' ? t.description : '']),
  );

  const opCount = [...groups.values()].reduce((n, ops) => n + ops.length, 0);
  const sections = [...groups.entries()].map(([tag, ops]) => `
    <div class="oas-tag-group">
      ${groups.size > 1 || tag !== 'Operations' ? `<h5 class="oas-tag">${esc(tag)}</h5>` : '<h5 class="oas-tag">Operations</h5>'}
      ${tagDescriptions.get(tag) ? `<div class="small muted">${rich(tagDescriptions.get(tag))}</div>` : ''}
      ${ops.map((t) => operationCard(t, resolve)).join('')}
    </div>`).join('');

  return `
    <div class="openapi">
      ${infoBlock(doc)}
      ${serversBlock(doc)}
      ${securityBlock(doc, resolve)}
      <div class="oas-block">
        <h5>Reference <span class="count">${opCount} operation${opCount === 1 ? '' : 's'}</span></h5>
        ${sections || '<div class="muted small">No paths documented.</div>'}
      </div>
    </div>`;
}
