import { Component, OnInit } from '@angular/core';
import { ListApiService, ListTypeConfigDto, ListValueDto } from '../../core/services/list-api.service';

@Component({
  selector: 'app-list-library',
  templateUrl: './list-library.component.html',
  styleUrls: ['./list-library.component.css']
})
export class ListLibraryComponent implements OnInit {
  listTypes: ListTypeConfigDto[] = [];
  listValues: ListValueDto[] = [];
  selectedListType: string | null = null;
  selectedValue: string | null = null;
  loading: boolean = false;
  loadingValues: boolean = false;
  error: string | null = null;

  // Add new value
  newValue: string = '';
  addingValue: boolean = false;
  addError: string | null = null;

  // UI state
  hasChanges: boolean = false;
  autoAddNewEntries: boolean = false;

  constructor(private listApiService: ListApiService) { }

  ngOnInit(): void {
    this.loadListTypes();
  }

  loadListTypes(): void {
    this.loading = true;
    this.error = null;

    this.listApiService.getListTypes().subscribe({
      next: (response) => {
        this.listTypes = response.data || [];
        this.loading = false;

        // Auto-select first type if available
        if (this.listTypes.length > 0) {
          this.selectListType(this.listTypes[0].listTypeName);
        }
      },
      error: (err) => {
        console.error('Error loading list types:', err);
        this.error = 'Failed to load list types. Please check if the backend is running.';
        this.loading = false;
      }
    });
  }

  selectListType(listTypeName: string): void {
    this.selectedListType = listTypeName;
    this.selectedValue = null;
    this.newValue = '';
    this.addError = null;
    this.loadListValues(listTypeName);
  }

  selectValue(value: string): void {
    this.selectedValue = value;
  }

  loadListValues(listTypeName: string): void {
    this.loadingValues = true;
    this.error = null;

    this.listApiService.getListValues(listTypeName).subscribe({
      next: (response) => {
        this.listValues = response.data || [];
        this.loadingValues = false;
      },
      error: (err) => {
        console.error('Error loading list values:', err);
        this.error = `Failed to load values for ${listTypeName}`;
        this.loadingValues = false;
      }
    });
  }

  isSelected(listTypeName: string): boolean {
    return this.selectedListType === listTypeName;
  }

  addValue(): void {
    if (!this.newValue.trim() || !this.selectedListType) {
      return;
    }

    this.addingValue = true;
    this.addError = null;

    this.listApiService.addListValue({
      listType: this.selectedListType,
      value: this.newValue.trim()
    }).subscribe({
      next: (response) => {
        // Add the new value to the list
        this.listValues.push(response.data);
        this.listValues.sort((a, b) => a.value.localeCompare(b.value));
        
        // Reset input
        this.newValue = '';
        this.addingValue = false;
        this.hasChanges = true;
      },
      error: (err) => {
        console.error('Error adding value:', err);
        if (err.error?.errorCode === 'VALUE_EXISTS') {
          this.addError = 'This value already exists';
        } else {
          this.addError = 'Failed to add value';
        }
        this.addingValue = false;
      }
    });
  }

  deleteValue(value: string): void {
    if (!this.selectedListType) return;

    const valueObj = this.listValues.find(v => v.value === value);
    if (!valueObj || !this.canDelete(valueObj)) {
      alert(`Cannot delete "${value}" - it is currently in use by ${valueObj?.usageCount} record(s)`);
      return;
    }

    if (!confirm(`Delete "${value}"?`)) {
      return;
    }

    this.listApiService.deleteListValue(this.selectedListType, value).subscribe({
      next: () => {
        this.listValues = this.listValues.filter(v => v.value !== value);
        this.hasChanges = true;
        if (this.selectedValue === value) {
          this.selectedValue = null;
        }
      },
      error: (err) => {
        console.error('Error deleting value:', err);
        alert('Failed to delete value');
      }
    });
  }

  canDelete(value: ListValueDto): boolean {
    return value.usageCount === 0;
  }

  save(): void {
    // In this implementation, changes are saved immediately
    // This button is here for UI consistency with EZClaim
    this.hasChanges = false;
    alert('Changes saved');
  }

  saveAndClose(): void {
    this.save();
    this.close();
  }

  close(): void {
    // Navigate back or close modal
    window.history.back();
  }
}
