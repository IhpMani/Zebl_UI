/**
 * Final QA simulation for Find screen Add Column pickers.
 * Run: node scripts/final-qa-add-column-picker.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function extractColumns(relPath) {
  const text = fs.readFileSync(path.join(root, relPath), 'utf8');
  return [...text.matchAll(/\{\s*key:\s*'([^']+)',\s*label:\s*'([^']*)'/g)].map((m) => ({
    key: m[1],
    label: m[2]
  }));
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

function columnMatchesSearch(col, searchText) {
  const q = searchText.trim().toLowerCase();
  if (!q) return true;
  const label = col.label.toLowerCase();
  const key = col.key.toLowerCase();
  const category = (col.category ?? '').toLowerCase();
  if (label.includes(q) || key.includes(q) || category.includes(q)) return true;
  const keySpaced = key.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return keySpaced.includes(q);
}

function inferCategory(key, label) {
  const k = key.toLowerCase();
  const l = label.toLowerCase();
  if (/classification/.test(k) || /classification/.test(l)) return 'Classification';
  if (/trig|balance|charge|amt|paid|amount|fee|disbursed|remaining/.test(k)) return 'Financial';
  if (/status|locked|archived/.test(k)) return 'Status';
  if (/diag|diagnosis|condition/.test(k)) return 'Clinical';
  if (/edi|export|835/.test(k)) return 'EDI';
  if (/^pat/.test(k)) return 'Patient';
  if (/pay|payer|insured/.test(k)) return 'Insurance';
  if (/phy|physician|npi|specialty|entity/.test(k)) return 'Provider';
  if (/recall/.test(k)) return 'Other';
  if (/modifier|procedure|revenue|srv/.test(k)) return 'Other';
  return 'Other';
}

function buildFlatSections(columns, searchText) {
  const filtered = searchText.trim()
    ? columns.filter((c) => columnMatchesSearch({ ...c, category: c.category ?? inferCategory(c.key, c.label) }, searchText))
    : columns;
  const byCat = new Map();
  for (const col of filtered) {
    const cat = col.category ?? inferCategory(col.key, col.label);
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat).push(col);
  }
  return { filtered, sections: [...byCat.entries()].filter(([, cols]) => cols.length > 0) };
}

function buildClaimsSections(columns, searchText) {
  const order = [
    'Identity', 'Status', 'Classification', 'Financial', 'Dates', 'Audit', 'Patient', 'Clinical',
    'Billing', 'EDI', 'Physicians', 'Payers', 'Primary Insured', 'Facility', 'Admission', 'Custom', 'Other'
  ];
  const filtered = searchText.trim() ? columns.filter((c) => columnMatchesSearch(c, searchText)) : columns;
  const byCat = new Map();
  for (const col of filtered) {
    if (!byCat.has(col.category)) byCat.set(col.category, []);
    byCat.get(col.category).push(col);
  }
  const sections = order.filter((cat) => (byCat.get(cat)?.length ?? 0) > 0).map((cat) => [cat, byCat.get(cat)]);
  return { filtered, sections };
}

function dedupeCount(columns) {
  const counts = new Map();
  for (const c of columns) counts.set(c.key, (counts.get(c.key) ?? 0) + 1);
  return [...counts.entries()].filter(([, n]) => n > 1);
}

const screens = [
  {
    name: 'Find Claims',
    columns: () => simulateClaimsMerged(),
    buildSections: buildClaimsSections,
    searches: ['classification', 'claim classification', 'claClassification', 'diagnosis', 'edi', 'balance', 'status']
  },
  {
    name: 'Find Patients',
    path: 'src/app/patients/patient-list-legacy/patient-list-legacy.component.ts',
    searches: ['classification', 'balance', 'recall', 'payment', 'patClassification']
  },
  {
    name: 'Find Services',
    path: 'src/app/services/service-list/service-list.component.ts',
    searches: ['balance', 'modifier', 'procedure', 'revenue', 'srvTotalInsBalanceCC']
  },
  {
    name: 'Find Payments',
    path: 'src/app/payments/payment-list/payment-list.component.ts',
    searches: ['response', 'disbursed', 'payer', 'pmtResponseCode']
  },
  {
    name: 'Find Disbursements',
    path: 'src/app/disbursements/disbursement-list/disbursement-list.component.ts',
    searches: ['disb', 'amount', 'batch']
  },
  {
    name: 'Find Adjustments',
    path: 'src/app/adjustments/adjustment-list/adjustment-list.component.ts',
    searches: ['835', 'remark', 'group']
  },
  {
    name: 'Find Payers',
    path: 'src/app/payers/payer-list/payer-list.component.ts',
    searches: ['eligibility', 'submission', 'classification', 'payClassification']
  },
  {
    name: 'Find Physicians',
    path: 'src/app/physicians/physician-list/physician-list.component.ts',
    searches: ['specialty', 'npi', 'entity', 'phyNPI']
  },
  {
    name: 'Find Claim Notes',
    path: 'src/app/claim-notes/claim-note-list/claim-note-list.component.ts',
    extraClaims: true,
    searches: ['classification', 'claClassification', 'auditID', 'noteText']
  }
];

const results = [];
let allPass = true;

for (const screen of screens) {
  let cols = screen.columns ? screen.columns() : extractColumns(screen.path);
  if (screen.extraClaims) {
    const seen = new Set(cols.map((c) => c.key));
    for (const c of simulateClaimsMerged()) {
      if (!seen.has(c.key)) {
        cols.push(c);
        seen.add(c.key);
      }
    }
  }
  const dupes = dedupeCount(cols);
  const issues = [];
  if (dupes.length) {
    issues.push(`duplicate keys: ${dupes.map(([k, n]) => `${k}×${n}`).join(', ')}`);
    allPass = false;
  }

  const emptySearch = screen.buildSections
    ? screen.buildSections(cols, '')
    : buildFlatSections(cols, '');
  if (emptySearch.sections.some(([, list]) => list.length === 0)) {
    issues.push('empty category section');
    allPass = false;
  }

  for (const term of screen.searches) {
    const { filtered } = screen.buildSections
      ? screen.buildSections(cols, term)
      : buildFlatSections(cols, term);
    if (filtered.length === 0) {
      issues.push(`search "${term}" → 0 results`);
      allPass = false;
    }
  }

  const perfNote =
    screen.name === 'Find Claim Notes' && cols.length > 200
      ? `large picker (${cols.length} keys); categorized sections reduce scroll`
      : null;

  results.push({
    screen: screen.name,
    columnCount: cols.length,
    sectionCount: emptySearch.sections.length,
    duplicateKeys: dupes.length,
    issues,
    perfNote,
    pass: issues.length === 0
  });
}

const lines = [
  '# Find Add Columns — Final QA Report',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  `**Automated simulation:** ${allPass ? 'PASS' : 'ISSUES FOUND'}`,
  '',
  '| Screen | Columns | Sections | Dupes | Status |',
  '|--------|--------:|---------:|------:|--------|'
];

for (const r of results) {
  lines.push(`| ${r.screen} | ${r.columnCount} | ${r.sectionCount} | ${r.duplicateKeys} | ${r.pass ? 'PASS' : 'FAIL'} |`);
}

lines.push('', '## Per-screen detail', '');

for (const r of results) {
  lines.push(`### ${r.screen}`);
  lines.push(`- Unique columns: ${r.columnCount}`);
  lines.push(`- Category sections (no search): ${r.sectionCount}`);
  if (r.perfNote) lines.push(`- Performance: ${r.perfNote}`);
  if (r.issues.length) {
    lines.push('- **Issues:**');
    for (const i of r.issues) lines.push(`  - ${i}`);
  } else {
    lines.push('- All configured business search terms return ≥1 column.');
  }
  lines.push('');
}

const out = path.join(root, 'docs/find-columns-final-qa-report.md');
fs.writeFileSync(out, lines.join('\n'));
console.log(lines.join('\n'));
process.exit(allPass ? 0 : 1);
