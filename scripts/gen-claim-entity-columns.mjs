import fs from 'fs';

const comp = fs.readFileSync('src/app/claims/claim-list/claim-list.component.ts', 'utf8');
const reg = fs.readFileSync('src/app/claims/claim-list/claim-list-additional-columns.ts', 'utf8');
const regKeys = new Set([...reg.matchAll(/key: '([^']+)'/g)].map((m) => m[1]));
const cols = [...comp.matchAll(/\{\s*key: '([^']+)',\s*label: '([^']*)'/g)];

function cat(key) {
  const k = key.toLowerCase();
  if (/^(createddate|modifieddate)|user|guid|computer/.test(k)) return 'Audit';
  if (/trig|balance|charge|amt|adj|applied|deposit|paid|insbalance|patbalance/.test(k)) return 'Financial';
  if (/date|dos|time|aging/.test(k)) return 'Dates';
  if (/^pat/.test(k)) return 'Patient';
  if (/diagnosis|condition|poa|procedure|reason|icd|dme/.test(k)) return 'Clinical';
  if (/payer|insured|filing|billto/.test(k)) return 'Payers';
  if (/phy|physician|facilityname/.test(k)) return 'Physicians';
  if (/edi|export/.test(k)) return 'EDI';
  if (/bill|invoice|submission|statement|admission|discharge|visit|medicalrecord/.test(k)) return 'Billing';
  if (/custom/.test(k)) return 'Custom';
  if (/locked|archived|status|active/.test(k)) return 'Status';
  return 'Other';
}

function dtype(key) {
  const k = key.toLowerCase();
  if (/balance|charge|amt|adj|applied|deposit|paid|labcharges/.test(k)) return 'currency';
  if (/date|dos/.test(k) && !/datetime|timestamp/.test(k)) return 'date';
  if (/datetime|timestamp/.test(k)) return 'datetime';
  if (/archived|locked|active|ignore/.test(k)) return 'boolean';
  if (/fid|count|sequence|length|outside/.test(k)) return 'number';
  return 'string';
}

const seen = new Set(regKeys);
const lines = [];
for (const m of cols) {
  const key = m[1];
  if (seen.has(key)) continue;
  seen.add(key);
  const label = m[2].replace(/'/g, "\\'");
  lines.push(`    { key: '${key}', label: '${label}', category: '${cat(key)}', dataType: '${dtype(key)}' },`);
}

const extras = [
  ['billToDisplay', 'Bill To Display', 'Payers', 'string'],
  ['primaryPayerName', 'Primary Payer Name', 'Payers', 'string'],
  ['claTotalChargeTRIG', 'Total Charge TRIG', 'Financial', 'currency'],
  ['claTotalBalanceCC', 'Total Balance CC', 'Financial', 'currency'],
  ['patFullNameCC', 'Patient Name', 'Patient', 'string'],
  ['createdDate', 'Date Created', 'Audit', 'datetime'],
  ['modifiedDate', 'Date Modified', 'Audit', 'datetime'],
  ['claEdiClaimId', 'EDI Claim ID', 'EDI', 'string']
];
for (const [key, label, category, dataType] of extras) {
  if (seen.has(key)) continue;
  seen.add(key);
  lines.push(`    { key: '${key}', label: '${label}', category: '${category}', dataType: '${dataType}' },`);
}

const out = `/**
 * Claim scalar fields for Add Column picker (synced from claim-list base columns).
 * Merged into ClaimListAdditionalColumns.getAllColumns().
 */
export const CLAIM_ENTITY_FIELD_COLUMNS: Array<{
  key: string;
  label: string;
  category: string;
  dataType: string;
}> = [
${lines.join('\n')}
];
`;

fs.writeFileSync('src/app/claims/claim-list/claim-list-entity-column-fields.ts', out);
console.log('Wrote', lines.length, 'entries');
