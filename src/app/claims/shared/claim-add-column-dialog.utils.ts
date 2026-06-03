import {
  AdditionalColumnDefinition,
  ClaimListAdditionalColumns
} from '../claim-list/claim-list-additional-columns';
import { columnMatchesListPickerSearch } from '../../core/utils/list-column-picker.utils';

export interface AddColumnPickerModel {
  categories: string[];
  columnsByCategory: Map<string, AdditionalColumnDefinition[]>;
  totalColumns: number;
  searchText: string;
}

/** Match user search against label, property key, and category name. */
export function columnMatchesSearch(col: AdditionalColumnDefinition, searchText: string): boolean {
  return columnMatchesListPickerSearch(col, searchText);
}

export function buildAddColumnPickerModel(searchText: string): AddColumnPickerModel {
  const all = ClaimListAdditionalColumns.getAllColumns();
  const q = searchText.trim().toLowerCase();
  const columnsByCategory = new Map<string, AdditionalColumnDefinition[]>();
  const categoryOrder = ClaimListAdditionalColumns.getCategoryOrder();

  for (const col of all) {
    if (!columnMatchesSearch(col, searchText)) {
      continue;
    }
    if (!columnsByCategory.has(col.category)) {
      columnsByCategory.set(col.category, []);
    }
    columnsByCategory.get(col.category)!.push(col);
  }

  for (const [, cols] of columnsByCategory) {
    cols.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  }

  const categories = categoryOrder.filter((cat) => {
    const cols = columnsByCategory.get(cat);
    return cols != null && cols.length > 0;
  });

  let totalColumns = 0;
  for (const cat of categories) {
    totalColumns += columnsByCategory.get(cat)?.length ?? 0;
  }

  return { categories, columnsByCategory, totalColumns, searchText };
}

/** @deprecated Use buildAddColumnPickerModel — kept for gradual migration */
export function getAdditionalColumnCategories(searchText: string): string[] {
  return buildAddColumnPickerModel(searchText).categories;
}

/** @deprecated Use buildAddColumnPickerModel — kept for gradual migration */
export function getAdditionalColumnsByCategory(
  category: string,
  searchText: string
): AdditionalColumnDefinition[] {
  const model = buildAddColumnPickerModel(searchText);
  return model.columnsByCategory.get(category) ?? [];
}

export function findPickerColumn(
  searchText: string,
  key: string
): AdditionalColumnDefinition | undefined {
  const model = buildAddColumnPickerModel(searchText);
  for (const cat of model.categories) {
    const hit = model.columnsByCategory.get(cat)?.find((c) => c.key === key);
    if (hit) return hit;
  }
  return undefined;
}
