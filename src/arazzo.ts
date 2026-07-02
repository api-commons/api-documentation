// Inline Arazzo workflow renderer — workflows become step timelines with
// inputs, request payloads, success criteria, and outputs, so a bundle's
// automation reads like documentation instead of raw YAML/JSON.

import { esc, rich } from './ui';
import { renderSchema, makeResolver } from './schema';
import { renderJSONTree } from './datatree';

type Obj = Record<string, unknown>;

function asObj(v: unknown): Obj {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {};
}

function kvTable(obj: Obj, keyHead: string, valHead: string): string {
  const entries = Object.entries(obj);
  if (!entries.length) return '';
  return `<table class="params"><thead><tr><th>${esc(keyHead)}</th><th>${esc(valHead)}</th></tr></thead><tbody>
    ${entries.map(([k, v]) => `<tr><td><code>${esc(k)}</code></td><td><code>${esc(typeof v === 'string' ? v : JSON.stringify(v))}</code></td></tr>`).join('')}
  </tbody></table>`;
}

function stepCard(step: Obj, index: number): string {
  const target = step.operationId || step.operationPath || step.workflowId || '';
  const criteria = Array.isArray(step.successCriteria) ? (step.successCriteria as Obj[]) : [];
  const payload = asObj(step.requestBody).payload;
  return `
    <div class="wf-step">
      <div class="wf-step-marker"><span>${index + 1}</span></div>
      <div class="wf-step-card">
        <div class="wf-step-head">
          <strong>${esc(step.stepId || `step-${index + 1}`)}</strong>
          ${target ? `<code class="op-id">${esc(target)}</code>` : ''}
        </div>
        ${step.description ? `<div class="small">${rich(step.description)}</div>` : ''}
        ${payload !== undefined ? `<h6>Request payload</h6>${renderJSONTree(payload)}` : ''}
        ${criteria.length ? `<h6>Success criteria</h6><ul class="wf-criteria">${criteria.map((c) => `<li><code>${esc(c.condition || JSON.stringify(c))}</code></li>`).join('')}</ul>` : ''}
        ${Object.keys(asObj(step.outputs)).length ? `<h6>Outputs</h6>${kvTable(asObj(step.outputs), 'Output', 'Expression')}` : ''}
      </div>
    </div>`;
}

function workflowBlock(wf: Obj, resolve: ReturnType<typeof makeResolver>): string {
  const steps = Array.isArray(wf.steps) ? (wf.steps as Obj[]) : [];
  return `
    <div class="wf">
      <div class="wf-head">
        <h5>${esc(wf.workflowId || 'workflow')}</h5>
        ${wf.summary ? `<div class="wf-summary">${esc(wf.summary)}</div>` : ''}
      </div>
      ${wf.description ? `<div class="small">${rich(wf.description)}</div>` : ''}
      ${wf.inputs ? `<h6>Inputs</h6>${renderSchema(wf.inputs, resolve)}` : ''}
      <div class="wf-steps">${steps.map((s, i) => stepCard(s, i)).join('')}</div>
      ${Object.keys(asObj(wf.outputs)).length ? `<h6>Workflow outputs</h6>${kvTable(asObj(wf.outputs), 'Output', 'Expression')}` : ''}
    </div>`;
}

export function renderArazzo(data: unknown): string {
  const doc = asObj(data);
  if (!doc.arazzo && !doc.workflows) {
    return '<div class="muted small">Inline Arazzo data could not be interpreted.</div>';
  }
  const resolve = makeResolver(doc);
  const info = asObj(doc.info);
  const sources = Array.isArray(doc.sourceDescriptions) ? (doc.sourceDescriptions as Obj[]) : [];
  const workflows = Array.isArray(doc.workflows) ? (doc.workflows as Obj[]) : [];

  return `
    <div class="arazzo">
      <div class="oas-info">
        ${info.title ? `<h4>${esc(info.title)}</h4>` : ''}
        <div class="chips">
          ${doc.arazzo ? `<span class="chip"><span class="chip-k">Arazzo</span>${esc(doc.arazzo)}</span>` : ''}
          ${info.version ? `<span class="chip"><span class="chip-k">Version</span>${esc(info.version)}</span>` : ''}
          <span class="chip"><span class="chip-k">Workflows</span>${workflows.length}</span>
        </div>
        ${info.description ? `<div class="oas-desc">${rich(info.description)}</div>` : ''}
      </div>
      ${sources.length ? `
        <div class="oas-block"><h5>Source descriptions</h5>
          ${sources.map((s) => `<div class="server"><strong>${esc(s.name)}</strong> <span class="muted small">${esc(s.type || '')}</span>${s.url ? ` — <a href="${esc(s.url)}" target="_blank" rel="noopener"><code>${esc(s.url)}</code></a>` : ''}</div>`).join('')}
        </div>` : ''}
      ${workflows.map((wf) => workflowBlock(wf, resolve)).join('')}
    </div>`;
}
