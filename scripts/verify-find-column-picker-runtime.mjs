/**
 * Runtime-style verification of Find screen Add Column pickers (static simulation).
 * Run: node scripts/verify-find-column-picker-runtime.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function extractColumnsFromComponent(relPath) {
  const text = fs.readFileSync(path.join(root, relPath), 'utf8');
  const cols = [...text.matchAll(/\{\s*key:\s*'([^']+)',\s*label:\s*'([^']*)'/g)].map((m) => ({
    key: m[1],
    label: m[2]
  }));
  return cols;
}

function columnMatchesSearch(col, searchText) {
  const q = searchText.trim().toLowerCase();
  if (!q) return true;
  const label = col.label.toLowerCase();
  const key = col.key.toLowerCase();
  if (label.includes(q) || key.includes(q)) return true;
  const keySpaced = key.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return keySpaced.includes(q);
}

function dedupe(cols) {
  const byKey = new Map();
  const counts = new Map();
  for (const c of cols) {
    counts.set(c.key, (counts.get(c.key) ?? 0) + 1);
    if (!byKey.has(c.key)) byKey.set(c.key, c);
  }
  return {
    unique: [...byKey.values()],
    dupes: [...counts.entries()].filter(([, n]) => n > 1)
  };
}

function simulateClaimsMerged() {
  const reg = fs.readFileSync(path.join(root, 'src/app/claims/claim-list/claim-list-additional-columns.ts'), 'utf8');
  const entity = fs.readFileSync(path.join(root, 'src/app/claims/claim-list/claim-list-entity-column-fields.ts'), 'utf8');
  const regCols = [...reg.matchAll(/\{\s*key:\s*'([^']+)',\s*label:\s*'([^']*)',\s*category:\s*'([^']+)'/g)].map((m) => ({
    key: m[1],
    label: m[2],
    category: m[3]
  }));
  const entityCols = [...entity.matchAll(/\{\s*key:\s*'([^']+)',\s*label:\s*'([^']*)',\s*category:\s*'([^']+)'/g)].map((m) => ({
    key: m[1],
    label: m[2],
    category: m[3]
  }));
  const byKey = new Map();
  for (const c of regCols) byKey.set(c.key, c);
  for (const c of entityCols) {
    if (!byKey.has(c.key)) byKey.set(c.key, c);
  }
  return [...byKey.values()];
}

const screens = [
  { name: 'Find Claims', columns: () => simulateClaimsMerged(), important: ['claClassification'] },
  { name: 'Find Patients', path: 'src/app/patients/patient-list-legacy/patient-list-legacy.component.ts', important: ['patClassification', 'patPaymentMatchingKey'] },
  { name: 'Find Services', path: 'src/app/services/service-list/service-list.component.ts', important: ['srvProcedureCode'] },
  { name: 'Find Payments', path: 'src/app/payments/payment-list/payment-list.component.ts', important: ['payClassification', 'patClassification'] },
  { name: 'Find Disbursements', path: 'src/app/disbursements/disbursement-list/disbursement-list.component.ts', important: ['disbAmount'] },
  { name: 'Find Adjustments', path: 'src/app/adjustments/adjustment-list/adjustment-list.component.ts', important: ['adj835Ref'] },
  { name: 'Find Payers', path: 'src/app/payers/payer-list/payer-list.component.ts', important: ['payClassification'] },
  { name: 'Find Physicians', path: 'src/app/physicians/physician-list/physician-list.component.ts', important: ['phyNPI'] },
  { name: 'Find Claim Notes', path: 'src/app/claim-notes/claim-note-list/claim-note-list.component.ts', important: ['claClassification', 'auditID'], extraFromClaims: true }
];

const searchTerms = ['classification', 'claim classification', 'claClassification', 'claclassification'];
const lines = ['# Find Screens — Add Column Runtime Verification', '', `Generated: ${new Date().toISOString()}`, ''];

for (const screen of screens) {
  let cols = screen.columns ? screen.columns() : extractColumnsFromComponent(screen.path);
  if (screen.extraFromClaims) {
    const claimCols = simulateClaimsMerged().map((c) => ({
      key: c.key,
      label: c.label,
      category: c.category
    }));
    const seen = new Set(cols.map((c) => c.key));
    for (const c of claimCols) {
      if (!seen.has(c.key)) {
        cols.push(c);
        seen.add(c.key);
      }
    }
  }
  const { unique, dupes } = dedupe(cols);
  const issues = [];
  for (const key of screen.important) {
    const col = unique.find((c) => c.key === key);
    if (!col) {
      issues.push(`missing source: ${key}`);
      continue;
    }
    const failed = searchTerms.filter((t) => !columnMatchesSearch(col, t));
    if (key === 'claClassification' && failed.includes('claclassification')) {
      issues.push(`${key}: camelCase key search fails without spaced-key matcher`);
    }
    if (key === 'patClassification' && col.label === 'Facility') {
      issues.push(`${key}: label "Facility" hides classification searches`);
    }
    if (key === 'payClassification' && col.label === 'Classification' && !col.label.includes('Payer')) {
      issues.push(`${key}: ambiguous "Classification" label on payers screen`);
    }
  }
  lines.push(`## ${screen.name}`);
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|------:|`);
  lines.push(`| Source column rows | ${cols.length} |`);
  lines.push(`| Unique keys | ${unique.length} |`);
  lines.push(`| Duplicate keys | ${dupes.length} |`);
  lines.push(`| Searchable (no filter) | ${unique.length} |`);
  if (dupes.length) {
    lines.push('');
    lines.push('**Dedupe collisions:**');
    for (const [key, count] of dupes) {
      lines.push(`- \`${key}\` ×${count}`);
    }
  }
  if (issues.length) {
    lines.push('');
    lines.push('**Runtime discoverability issues:**');
    for (const i of issues) lines.push(`- ${i}`);
  } else {
    lines.push('');
    lines.push('**Important fields:** search OK (simulated).');
  }
  lines.push('');
}

const outPath = path.join(root, 'docs/find-columns-runtime-verification-report.md');
fs.writeFileSync(outPath, lines.join('\n'));
console.log('Wrote', outPath);
console.log(lines.join('\n'));
