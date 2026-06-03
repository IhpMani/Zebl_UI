/**
 * Simulates claim-add-column-dialog.utils filtering (no TS import).
 * Run: node scripts/verify-add-column-picker.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const regPath = path.join(root, 'src/app/claims/claim-list/claim-list-additional-columns.ts');
const entityPath = path.join(root, 'src/app/claims/claim-list/claim-list-entity-column-fields.ts');

function parseColumns(file, exportName) {
  const text = fs.readFileSync(file, 'utf8');
  const start = exportName
    ? text.indexOf(`export const ${exportName}`)
    : text.indexOf('AVAILABLE_COLUMNS');
  const slice = text.slice(start);
  const re = /\{\s*key:\s*'([^']+)',\s*label:\s*'([^']*)',\s*category:\s*'([^']+)'/g;
  const out = [];
  let m;
  while ((m = re.exec(slice)) !== null) {
    out.push({ key: m[1], label: m[2], category: m[3] });
  }
  return out;
}

const curated = parseColumns(regPath);
const entity = parseColumns(entityPath, 'CLAIM_ENTITY_FIELD_COLUMNS');
const byKey = new Map();
for (const col of curated) byKey.set(col.key, col);
for (const col of entity) {
  if (!byKey.has(col.key)) byKey.set(col.key, col);
}
const merged = [...byKey.values()];

const categoryOrder = [
  'Identity', 'Status', 'Classification', 'Financial', 'Dates', 'Audit', 'Patient', 'Clinical',
  'Billing', 'EDI', 'Physicians', 'Payers', 'Primary Insured', 'Facility',
  'Admission', 'Custom', 'Other'
];

function columnMatchesSearch(col, searchText) {
  const q = searchText.trim().toLowerCase();
  if (!q) return true;
  const label = col.label.toLowerCase();
  const key = col.key.toLowerCase();
  const category = col.category.toLowerCase();
  if (label.includes(q) || key.includes(q) || category.includes(q)) return true;
  const keySpaced = key.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return keySpaced.includes(q);
}

function buildModel(searchText) {
  const columnsByCategory = new Map();
  for (const col of merged) {
    if (!columnMatchesSearch(col, searchText)) continue;
    if (!columnsByCategory.has(col.category)) columnsByCategory.set(col.category, []);
    columnsByCategory.get(col.category).push(col);
  }
  const categories = categoryOrder.filter((cat) => (columnsByCategory.get(cat)?.length ?? 0) > 0);
  return { categories, columnsByCategory };
}

function getByCategory(category, searchText) {
  return buildModel(searchText).columnsByCategory.get(category) ?? [];
}

const cla = merged.find((c) => c.key === 'claClassification');
console.log('Merged count:', merged.length);
console.log('claClassification in merged:', cla ?? 'MISSING');

for (const q of ['', 'classification', 'claim classification', 'claClassification', 'claclassification', 'facility']) {
  const model = buildModel(q);
  const classCols = getByCategory('Classification', q);
  const claHit = classCols.some((c) => c.key === 'claClassification')
    || [...model.columnsByCategory.values()].flat().some((c) => c.key === 'claClassification');
  console.log(`\nSearch "${q}": categories=${model.categories.length}, Classification cols=${classCols.length}, claFound=${claHit}`);
  if (['classification', 'claim classification', 'claClassification', 'claclassification'].includes(q) && !claHit) {
    console.log('  BUG: expected claClassification in results');
  }
}
