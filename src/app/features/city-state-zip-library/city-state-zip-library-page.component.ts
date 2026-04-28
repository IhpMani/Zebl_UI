import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CityStateZipApiService, CityStateZipRow } from '../../core/services/city-state-zip-api.service';

@Component({
  selector: 'app-city-state-zip-library-page',
  templateUrl: './city-state-zip-library-page.component.html',
  styleUrls: ['./city-state-zip-library-page.component.scss']
})
export class CityStateZipLibraryPageComponent implements OnInit {
  @ViewChild('newCityInput') newCityInput?: ElementRef<HTMLInputElement>;

  rows: CityStateZipRow[] = [];

  filterCity = '';
  filterState = '';
  filterZip = '';

  selectedIds = new Set<number>();

  // New row (top "Click here to add..." row)
  adding = false;
  newCity = '';
  newState = '';
  newZip = '';

  autoAddNewEntriesToLibrary = false;

  // paging (single large page by default)
  page = 1;
  pageSize = 500;
  total = 0;

  loading = false;
  saving = false;
  error: string | null = null;

  dirtyIds = new Set<number>();
  private tempIdCounter = -1;

  constructor(private api: CityStateZipApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.api.get(this.page, this.pageSize).subscribe({
      next: res => {
        this.rows = (res.items || []).map(r => ({ ...r }));
        this.total = res.total ?? this.rows.length;
        this.loading = false;
        this.dirtyIds.clear();
      },
      error: err => {
        this.error = err?.error?.error || err?.message || 'Failed to load City / State / ZIP library.';
        this.loading = false;
      }
    });
  }

  get filteredRows(): CityStateZipRow[] {
    const c = this.filterCity.trim().toLowerCase();
    const s = this.filterState.trim().toLowerCase();
    const z = this.filterZip.trim().toLowerCase();
    return this.rows.filter(r => {
      if (c && !r.city.toLowerCase().includes(c)) return false;
      if (s && !r.state.toLowerCase().includes(s)) return false;
      if (z && !r.zip.toLowerCase().includes(z)) return false;
      return true;
    });
  }

  markDirty(row: CityStateZipRow): void {
    if (row.id <= 0) {
      // temp row
      this.dirtyIds.add(row.id);
    } else {
      this.dirtyIds.add(row.id);
    }
  }

  isChecked(id: number): boolean {
    return this.selectedIds.has(id);
  }

  toggleChecked(id: number, checked: boolean): void {
    if (checked) this.selectedIds.add(id);
    else this.selectedIds.delete(id);
  }

  checkAll(): void {
    this.selectedIds = new Set<number>(this.filteredRows.map(r => r.id));
  }

  uncheckAll(): void {
    this.selectedIds.clear();
  }

  startAdd(): void {
    if (this.adding) return;
    this.adding = true;
    this.newCity = '';
    this.newState = '';
    this.newZip = '';

    setTimeout(() => this.newCityInput?.nativeElement.focus(), 0);
  }

  commitAdd(): void {
    const city = this.newCity.trim();
    const state = this.newState.trim();
    const zip = this.newZip.trim();
    if (!city || !state || !zip) return;

    const tempId = this.tempIdCounter--;
    const newRow: CityStateZipRow = {
      id: tempId,
      city,
      state,
      zip,
      isActive: true
    };
    this.rows = [newRow, ...this.rows];
    this.markDirty(newRow);
    this.adding = false;
    this.newCity = '';
    this.newState = '';
    this.newZip = '';
  }

  deleteChecked(): void {
    if (this.selectedIds.size === 0 || this.saving) {
      return;
    }

    const idsToDelete = Array.from(this.selectedIds);
    const realIds = idsToDelete.filter(id => id > 0);
    const tempIds = idsToDelete.filter(id => id <= 0);

    // Optimistically remove temp (unsaved) rows locally
    if (tempIds.length > 0) {
      this.rows = this.rows.filter(r => !tempIds.includes(r.id));
    }

    // Clean up selection and dirty flags for removed rows
    idsToDelete.forEach(id => {
      this.selectedIds.delete(id);
      this.dirtyIds.delete(id);
    });

    if (realIds.length === 0) {
      // Only temp rows were selected
      return;
    }

    this.saving = true;
    this.api.bulkDelete(realIds).subscribe({
      next: () => {
        this.saving = false;
        // Remove deleted rows from current data set
        this.rows = this.rows.filter(r => !realIds.includes(r.id));
      },
      error: err => {
        this.error = err?.error?.error || err?.message || 'Failed to delete City / State / ZIP entries.';
        this.saving = false;
      }
    });
  }

  save(closeAfter = false): void {
    if (this.saving || this.dirtyIds.size === 0) return;

    const dirtyRows = this.rows.filter(r => this.dirtyIds.has(r.id));
    if (dirtyRows.length === 0) return;

    this.saving = true;
    const payload = dirtyRows.map(r => ({
      id: r.id > 0 ? r.id : undefined,
      city: r.city,
      state: r.state,
      zip: r.zip,
      isActive: r.isActive
    }));

    this.api.bulkSave(payload).subscribe({
      next: () => {
        this.saving = false;
        this.dirtyIds.clear();
        this.load();
        if (closeAfter) {
          this.close();
        }
      },
      error: err => {
        this.error = err?.error?.error || err?.message || 'Failed to save City / State / ZIP entries.';
        this.saving = false;
      }
    });
  }

  saveAndClose(): void {
    if (this.dirtyIds.size === 0) {
      this.close();
      return;
    }
    this.save(true);
  }

  close(): void {
    window.history.back();
  }
}

