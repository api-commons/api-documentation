// Document layout: fixed sidebar navigation + one long scrolling reference,
// the shape people expect from good OpenAPI documentation — applied to the
// whole APIs.json.

import type { ApisDoc, ApiItem, PropertyItem, NamedUrl, Contact } from './model';
import { versionInfo } from './versions';
import { esc, escAttr, rich, chip, tagChips, extLink } from './ui';
import { renderProperties } from './properties';

function collectionSection(id: string, title: string, blurb: string, props: PropertyItem[]): string {
  if (!props.length) return '';
  return `
    <section class="doc-section" id="${escAttr(id)}">
      <h2>${esc(title)} <span class="count">${props.length}</span></h2>
      <p class="section-blurb">${esc(blurb)}</p>
      ${renderProperties(props, { openFirst: false })}
    </section>`;
}

function namedUrlSection(id: string, title: string, blurb: string, items: NamedUrl[]): string {
  if (!items.length) return '';
  return `
    <section class="doc-section" id="${escAttr(id)}">
      <h2>${esc(title)} <span class="count">${items.length}</span></h2>
      <p class="section-blurb">${esc(blurb)}</p>
      <div class="prop-links">
        ${items.map((x) => `
          <a class="prop-link" href="${escAttr(x.url)}" target="_blank" rel="noopener">
            <span class="prop-type-badge">${esc(title.replace(/s$/, ''))}</span>
            <span class="prop-link-body">
              <span class="prop-title">${esc(x.name || x.url)}</span>
              <span class="prop-url">${esc(x.url)}</span>
            </span>
          </a>`).join('')}
      </div>
    </section>`;
}

function maintainerCard(m: Contact): string {
  const name = m.FN || m.organizationName || m.email || 'Maintainer';
  return `
    <div class="maintainer">
      ${m.photo ? `<img src="${escAttr(m.photo)}" alt="" loading="lazy">` : ''}
      <div>
        <strong>${esc(name)}</strong>
        ${m.organizationName && m.organizationName !== name ? `<div class="small muted">${esc(m.organizationName)}</div>` : ''}
        <div class="small">
          ${m.email ? `<a href="mailto:${escAttr(m.email)}">${esc(m.email)}</a>` : ''}
          ${m.url ? ` · ${extLink(m.url)}` : ''}
        </div>
      </div>
    </div>`;
}

function apiSection(api: ApiItem): string {
  const promoted = [
    { key: 'workflows', title: 'Workflows', items: api.workflows },
    { key: 'prompts', title: 'Prompts', items: api.prompts },
    { key: 'rules', title: 'Rules', items: api.rules },
  ].filter((c) => c.items.length);
  return `
    <section class="doc-section api-section" id="${escAttr(api.anchor)}">
      <div class="api-head">
        <h2>${esc(api.name)}</h2>
        <div class="chips">
          ${chip('aid', api.aid, 'mono')}
          ${api.baseURL ? `<span class="chip"><span class="chip-k">baseURL</span><code>${esc(api.baseURL)}</code></span>` : ''}
        </div>
        ${api.humanURL ? `<div class="small">${extLink(api.humanURL)}</div>` : ''}
      </div>
      ${api.description ? `<div class="api-desc">${rich(api.description)}</div>` : ''}
      ${tagChips(api.tags)}
      ${renderProperties(api.properties, { openFirst: true })}
      ${promoted.map((c) => `
        <h3 class="promoted-head">${esc(c.title)} <span class="count">${c.items.length}</span></h3>
        ${renderProperties(c.items)}`).join('')}
      ${api.contact.length ? `<h3 class="promoted-head">Contact</h3><div class="maintainers">${api.contact.map(maintainerCard).join('')}</div>` : ''}
    </section>`;
}

export function renderDocument(doc: ApisDoc): string {
  const vi = versionInfo(doc);

  const navApis = doc.apis.map((a) => `
    <a class="nav-item nav-api" href="#${escAttr(a.anchor)}" data-name="${escAttr(a.name.toLowerCase())}">
      ${esc(a.name)}
      ${a.properties.some((p) => p.data !== undefined) || a.workflows.length ? '<span class="nav-dot" title="carries inline artifacts"></span>' : ''}
    </a>`).join('');

  const navExtra = [
    doc.common.length ? `<a class="nav-item" href="#common">Common properties</a>` : '',
    doc.workflows.length ? `<a class="nav-item" href="#workflows">Workflows</a>` : '',
    doc.prompts.length ? `<a class="nav-item" href="#prompts">Prompts</a>` : '',
    doc.rules.length ? `<a class="nav-item" href="#rules">Rules</a>` : '',
    doc.include.length ? `<a class="nav-item" href="#includes">Includes</a>` : '',
    doc.overlays.length ? `<a class="nav-item" href="#overlays">Overlays</a>` : '',
    doc.network.length ? `<a class="nav-item" href="#network">Network</a>` : '',
    doc.maintainers.length ? `<a class="nav-item" href="#maintainers">Maintainers</a>` : '',
    `<a class="nav-item" href="#raw">Raw APIs.json</a>`,
  ].filter(Boolean).join('');

  const overviewChips = [
    `<span class="chip version" title="${escAttr(vi.blurb)}"><span class="chip-k">APIs.json</span>${esc(vi.declared)}${vi.latest ? ' · latest' : ''}</span>`,
    chip('aid', doc.aid, 'mono'),
    chip('type', doc.type),
    chip('kind', doc.kind),
    chip('visibility', doc.visibility),
    chip('access', doc.access),
    chip('position', doc.position),
    chip('rating', doc.rating),
  ].join('');

  const dates = [
    doc.created ? `Created ${esc(doc.created)}` : '',
    doc.modified ? `Modified ${esc(doc.modified)}` : '',
  ].filter(Boolean).join(' · ');

  return `
    <div class="doc">
      <aside class="sidebar" id="sidebar">
        <div class="side-search"><input id="nav-filter" type="search" placeholder="Filter APIs…" autocomplete="off"></div>
        <nav class="side-nav">
          <a class="nav-item" href="#overview">Overview</a>
          <div class="nav-group">APIs <span class="count">${doc.apis.length}</span></div>
          ${navApis || '<div class="nav-empty muted small">No APIs listed.</div>'}
          <div class="nav-group">More</div>
          ${navExtra}
        </nav>
      </aside>

      <main class="content" id="content">
        <section class="doc-section overview" id="overview">
          <div class="overview-head">
            ${doc.image ? `<img class="overview-logo" src="${escAttr(doc.image)}" alt="" loading="lazy">` : ''}
            <div>
              <h1>${esc(doc.name)}</h1>
              <div class="chips">${overviewChips}</div>
            </div>
          </div>
          ${doc.description ? `<div class="overview-desc">${rich(doc.description)}</div>` : ''}
          ${tagChips(doc.tags)}
          <div class="small muted">
            ${doc.url ? `${extLink(doc.url)}${dates ? ' · ' : ''}` : ''}${dates}
          </div>
          ${vi.notes.length ? `
            <details class="version-notes">
              <summary>Specification notes <span class="count">${vi.notes.length}</span></summary>
              <ul>${vi.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
            </details>` : ''}
          <div class="overview-stats">
            <div class="stat"><span>${doc.apis.length}</span>APIs</div>
            <div class="stat"><span>${doc.apis.reduce((n, a) => n + a.properties.length, 0)}</span>Properties</div>
            <div class="stat"><span>${[...doc.apis.flatMap((a) => [...a.properties, ...a.workflows, ...a.prompts, ...a.rules]), ...doc.common, ...doc.workflows, ...doc.prompts, ...doc.rules].filter((p) => p.data !== undefined).length}</span>Inline artifacts</div>
            <div class="stat"><span>${doc.common.length}</span>Common</div>
          </div>
        </section>

        ${doc.apis.map(apiSection).join('')}

        ${collectionSection('common', 'Common properties', 'Properties that apply across every API in this index.', doc.common)}
        ${collectionSection('workflows', 'Workflows', 'Arazzo and other workflows that span the APIs in this index.', doc.workflows)}
        ${collectionSection('prompts', 'Prompts', 'Prompts published alongside the APIs in this index.', doc.prompts)}
        ${collectionSection('rules', 'Rules', 'Governance rules published alongside the APIs in this index.', doc.rules)}
        ${namedUrlSection('includes', 'Includes', 'Other APIs.json indexes folded into this one.', doc.include)}
        ${namedUrlSection('overlays', 'Overlays', 'Overlay documents applied to this index.', doc.overlays)}
        ${namedUrlSection('network', 'Network', 'Related indexes in the wider network.', doc.network)}

        ${doc.maintainers.length ? `
          <section class="doc-section" id="maintainers">
            <h2>Maintainers</h2>
            <div class="maintainers">${doc.maintainers.map(maintainerCard).join('')}</div>
          </section>` : ''}

        <section class="doc-section" id="raw">
          <h2>Raw APIs.json</h2>
          <div class="prop-actions" style="margin-bottom:0.6rem">
            <button class="mini-btn" id="raw-download">Download apis.json</button>
            <button class="mini-btn" id="raw-copy">Copy</button>
          </div>
          <pre class="rawjson">${esc(JSON.stringify(doc.raw, null, 2))}</pre>
        </section>

        <footer class="doc-foot small muted">
          Rendered by <a href="https://documentation.apicommons.org" target="_blank" rel="noopener">API Documentation</a>,
          an <a href="https://apicommons.org" target="_blank" rel="noopener">API Commons</a> tool for
          <a href="https://apisjson.org" target="_blank" rel="noopener">APIs.json</a>.
        </footer>
      </main>
    </div>`;
}

/** Wire sidebar filter + scrollspy after the document HTML is in the DOM. */
export function activateDocument(root: HTMLElement): void {
  const filter = root.querySelector<HTMLInputElement>('#nav-filter');
  filter?.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase();
    root.querySelectorAll<HTMLElement>('.nav-api').forEach((el) => {
      el.hidden = Boolean(q) && !(el.dataset.name || '').includes(q);
    });
  });

  const links = [...root.querySelectorAll<HTMLAnchorElement>('.side-nav .nav-item')];
  const byId = new Map(links.map((l) => [l.getAttribute('href')?.slice(1) || '', l]));
  const observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach((l) => l.classList.remove('active'));
        byId.get(e.target.id)?.classList.add('active');
      }
    },
    { rootMargin: '-10% 0px -80% 0px' },
  );
  root.querySelectorAll('.doc-section').forEach((s) => observer.observe(s));
}
