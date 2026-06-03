import { ClaimListAdditionalColumns, AdditionalColumnDefinition } from '../claim-list/claim-list-additional-columns';

export function getAdditionalColumnCategories(searchText: string): string[] {
  const categories = ClaimListAdditionalColumns.getCategoryOrder();
  const q = searchText.trim().toLowerCase();
  if (!q) return categories;
  return categories.filter((category) =>
    ClaimListAdditionalColumns.getAllColumns()
      .filter((col) => col.category === category)
      .some((col) => col.label.toLowerCase().includes(q))
  );
}

export function getAdditionalColumnsByCategory(
  category: string,
  searchText: string
): AdditionalColumnDefinition[] {
  let columns = ClaimListAdditionalColumns.getAllColumns().filter((col) => col.category === category);
  const q = searchText.trim().toLowerCase();
  if (q) {
    columns = columns.filter((col) => col.label.toLowerCase().includes(q));
  }
  return columns;
}
