import { Component, OnInit } from '@angular/core';
import { ClaimApiService } from '../../core/services/claim-api.service';
import { Claim, ApiResponse } from '../../core/services/claim.models';

@Component({
  selector: 'app-claim-list',
  templateUrl: './claim-list.component.html',
  styleUrls: ['./claim-list.component.css']
})
export class ClaimListComponent implements OnInit {
  claims: Claim[] = [];
  filteredClaims: Claim[] = [];
  loading: boolean = false;
  error: string | null = null;
  meta: { page: number; pageSize: number; totalCount: number } | null = null;
  showCustomizationDialog: boolean = false;
  columnSearchText: string = '';

  columns: Array<{
    key: string;
    label: string;
    visible: boolean;
    filterValue: string;
  }> = [
    {
      key: 'claID',
      label: 'Claim ID',
      visible: true,
      filterValue: ''
    },
    {
      key: 'claStatus',
      label: 'Status',
      visible: true,
      filterValue: ''
    },
    {
      key: 'claDateTimeCreated',
      label: 'Date Created',
      visible: true,
      filterValue: ''
    },
    {
      key: 'claTotalChargeTRIG',
      label: 'Total Charge',
      visible: true,
      filterValue: ''
    },
    {
      key: 'claTotalBalanceCC',
      label: 'Total Balance',
      visible: true,
      filterValue: ''
    },
    {
      key: 'claClassification',
      label: 'Classification',
      visible: false,
      filterValue: ''
    },
    {
      key: 'claFirstDateTRIG',
      label: '1st DOS',
      visible: false,
      filterValue: ''
    },
    {
      key: 'claLastDateTRIG',
      label: 'Last DOS',
      visible: false,
      filterValue: ''
    },
    {
      key: 'claBillTo',
      label: 'Bill To',
      visible: false,
      filterValue: ''
    },
    {
      key: 'claDateTimeModified',
      label: 'Modified Timestamp',
      visible: false,
      filterValue: ''
    },
    {
      key: 'claLastUserName',
      label: 'Modified User',
      visible: false,
      filterValue: ''
    }
  ];

  constructor(private claimApiService: ClaimApiService) { }

  ngOnInit(): void {
    this.loadClaims(1, 25);
  }

  loadClaims(page: number, pageSize: number): void {
    this.loading = true;
    this.error = null;

    this.claimApiService.getClaims(page, pageSize).subscribe({
      next: (response: ApiResponse<Claim>) => {
        this.claims = response.data;
        this.applyFilters();
        this.meta = response.meta;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load claims. Please check if the backend is running.';
        this.loading = false;
        console.error('Error loading claims:', err);
      }
    });
  }

  getTotalPages(): number {
    if (!this.meta) return 0;
    return Math.ceil(this.meta.totalCount / this.meta.pageSize);
  }

  get visibleColumns() {
    return this.columns.filter(c => c.visible);
  }

  hideColumn(columnKey: string): void {
    const col = this.columns.find(c => c.key === columnKey);
    if (col) {
      col.visible = false;
    }
  }

  showColumn(columnKey: string): void {
    const col = this.columns.find(c => c.key === columnKey);
    if (col) {
      col.visible = true;
    }
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  clearFilter(columnKey: string, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    const col = this.columns.find(c => c.key === columnKey);
    if (col) {
      col.filterValue = '';
      this.applyFilters();
    }
  }

  getCellValue(claim: Claim, key: string): any {
    return (claim as any)[key];
  }

  toggleCustomizationDialog(): void {
    this.showCustomizationDialog = !this.showCustomizationDialog;
    if (!this.showCustomizationDialog) {
      this.columnSearchText = '';
    }
  }

  closeCustomizationDialog(event?: MouseEvent): void {
    if (event && (event.target as HTMLElement).classList.contains('customization-overlay')) {
      this.showCustomizationDialog = false;
      this.columnSearchText = '';
    } else if (!event) {
      this.showCustomizationDialog = false;
      this.columnSearchText = '';
    }
  }

  toggleColumnVisibility(columnKey: string): void {
    const col = this.columns.find(c => c.key === columnKey);
    if (col) {
      col.visible = !col.visible;
    }
  }

  clearAllColumns(): void {
    this.columns.forEach(col => col.visible = false);
  }

  get filteredColumnsForDialog() {
    if (!this.columnSearchText.trim()) {
      return this.columns;
    }
    const searchLower = this.columnSearchText.toLowerCase();
    return this.columns.filter(col => 
      col.label.toLowerCase().includes(searchLower) || 
      col.key.toLowerCase().includes(searchLower)
    );
  }

  private applyFilters(): void {
    const activeFilters = this.columns
      .filter(c => c.filterValue && c.filterValue.toString().trim() !== '');

    if (activeFilters.length === 0) {
      this.filteredClaims = [...this.claims];
      return;
    }

    this.filteredClaims = this.claims.filter((claim) => {
      return activeFilters.every((col) => {
        const rawValue = (this.getCellValue(claim, col.key) ?? '').toString().toLowerCase();
        const filterValue = col.filterValue.toString().toLowerCase();
        return rawValue.includes(filterValue);
      });
    });
  }
}

