// APIs.json specification version awareness. The viewer renders every version
// the same tolerant way; this module supplies the badge, a short description of
// the declared version, and advisory notes when a document uses fields newer
// than the version it declares (or declares no version at all).

import type { ApisDoc } from './model';

export const KNOWN_VERSIONS = [
  '0.11', '0.12', '0.13', '0.14', '0.15', '0.16', '0.17', '0.18', '0.19', '0.20', '0.21',
];

export const LATEST = '0.21';

const VERSION_BLURBS: Record<string, string> = {
  '0.11': 'Early draft — name, description, apis, include, and maintainers.',
  '0.12': 'Early draft refinements to the core index shape.',
  '0.13': 'Stabilized the property object (type + url) on each API.',
  '0.14': 'The classic, widely-deployed version powering early apis.io.',
  '0.15': 'Incremental cleanup of the 0.14 shape.',
  '0.16': 'Introduced the common collection for properties that span every API.',
  '0.17': 'Introduced aid identifiers, overlays, and rating.',
  '0.18': 'Refined overlays and property tags.',
  '0.19': 'Inline data on properties — artifacts can travel inside the file.',
  '0.20': 'Introduced the rules collection.',
  '0.21': 'Current version — kind, promoted prompts / rules / workflows collections, and inline data throughout.',
};

// The version that introduced each field, for advisory notes only.
const FIELD_INTRODUCED: Record<string, string> = {
  aid: '0.17', rating: '0.17', overlays: '0.17', common: '0.16',
  kind: '0.21', prompts: '0.21', workflows: '0.21', rules: '0.20',
  network: '0.14',
};

function cmp(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  return pa[0] - pb[0] || (pa[1] || 0) - (pb[1] || 0);
}

export interface VersionInfo {
  declared: string;
  known: boolean;
  latest: boolean;
  blurb: string;
  notes: string[];
}

export function versionInfo(doc: ApisDoc): VersionInfo {
  const v = doc.specificationVersion;
  const known = KNOWN_VERSIONS.includes(v);
  const notes: string[] = [];

  if (v === 'unknown') {
    notes.push('No specificationVersion declared — rendered against the latest (0.21) shape.');
  } else if (!known) {
    notes.push(`Version ${v} is not a published APIs.json version — rendered tolerantly against the latest shape.`);
  }

  if (known) {
    const has = (k: string): boolean => {
      const val = (doc.raw as Record<string, unknown>)[k];
      return Array.isArray(val) ? val.length > 0 : val !== undefined && val !== null && val !== '';
    };
    for (const [field, intro] of Object.entries(FIELD_INTRODUCED)) {
      if (has(field) && cmp(v, intro) < 0) {
        notes.push(`Uses ${field} (introduced in ${intro}) while declaring ${v} — rendered anyway.`);
      }
    }
    const hasData = [...doc.apis.flatMap((a) => a.properties), ...doc.common].some((p) => p.data !== undefined);
    if (hasData && cmp(v, '0.19') < 0) {
      notes.push(`Uses inline data properties (introduced in 0.19) while declaring ${v} — rendered anyway.`);
    }
  }

  if (doc.unknownKeys.length) {
    notes.push(`Fields outside the specification: ${doc.unknownKeys.join(', ')}.`);
  }

  return {
    declared: v,
    known,
    latest: v === LATEST,
    blurb: VERSION_BLURBS[v] || '',
    notes,
  };
}
