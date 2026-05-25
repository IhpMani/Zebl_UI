import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, tap } from 'rxjs/operators';
import { PatientCommandCenterService } from './patient-command-center.service';
import { PatientLookupQueryService } from '../services/queries/patient-lookup-query.service';
import { PatientLookupRowDto } from '../models/patient-lookup-row.dto';
import { PatientWorkspacePersistenceService } from '../services/patient-workspace-persistence.service';
import { rankByFuzzy } from '../utils/fuzzy-match.util';
import { OperationalToastService } from '../../../shared/operational/services/operational-toast.service';
import { PatientNavigationService } from '../services/patient-navigation.service';
import { WorkspaceService } from '../../../workspace/application/workspace.service';
import { RibbonContextService } from '../../../core/services/ribbon-context.service';

@Component({
  selector: 'app-patient-lookup-panel',
  templateUrl: './patient-lookup-panel.component.html',
  styleUrls: ['./patient-lookup-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientLookupPanelComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  readonly searchControl = new FormControl('', { nonNullable: true });
  rows: PatientLookupRowDto[] = [];
  recentPatients: Array<{ patId: number; label: string; visitedAt: number }> = [];
  recentSearches: string[] = [];
  highlightedIndex = 0;
  loading = false;
  open = false;

  private readonly destroy$ = new Subject<void>();
  private readonly search$ = new Subject<string>();

  constructor(
    private readonly commandCenter: PatientCommandCenterService,
    private readonly lookupQuery: PatientLookupQueryService,
    private readonly persistence: PatientWorkspacePersistenceService,
    private readonly navigation: PatientNavigationService,
    private readonly toast: OperationalToastService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.commandCenter.state$.pipe(takeUntil(this.destroy$)).subscribe((s) => {
      this.open = s.open;
      if (s.open) {
        this.recentPatients = this.persistence.getRecentPatients();
        this.recentSearches = this.persistence.getRecentSearches();
        this.highlightedIndex = 0;
        setTimeout(() => this.searchInput?.nativeElement?.focus(), 0);
      }
      this.cdr.markForCheck();
    });

    this.searchControl.valueChanges
      .pipe(debounceTime(120), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((v) => this.search$.next(v));

    this.search$
      .pipe(
        tap(() => {
          this.loading = true;
          this.cdr.markForCheck();
        }),
        switchMap((text) => this.lookupQuery.search({ searchText: text, page: 1, pageSize: 25 })),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (res) => {
          const q = this.searchControl.value.trim();
          this.rows = rankByFuzzy(q, res.rows, (r) =>
            [r.patientName, r.accountNo, r.mrn, r.primaryPayer].filter(Boolean).join(' ')
          );
          this.highlightedIndex = 0;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.rows = [];
          this.cdr.markForCheck();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get displayRows(): PatientLookupRowDto[] {
    const q = this.searchControl.value.trim();
    if (!q && this.rows.length === 0) return [];
    return this.rows;
  }

  onBackdropClick(): void {
    this.commandCenter.close();
  }

  onKeydown(event: KeyboardEvent): void {
    const list = this.displayRows;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightedIndex = Math.min(this.highlightedIndex + 1, Math.max(0, list.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightedIndex = Math.max(this.highlightedIndex - 1, 0);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const row = list[this.highlightedIndex];
      if (row) this.openPatient(row);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.commandCenter.close();
    }
  }

  openPatient(row: PatientLookupRowDto): void {
    const patId = Number(row.patId);
    if (!Number.isFinite(patId) || patId <= 0) return;

    const term = this.searchControl.value.trim();
    if (term) this.persistence.pushRecentSearch(term);
    this.commandCenter.close();
    const patientName = row.patientName?.trim() || null;
    this.toast.info(`Opening ${row.patientName}`);
    this.persistence.pushRecentPatient(patId, row.patientName);
    this.ribbonContext.setContext({ patientId: patId, patientName, claimId: null });
    if (patientName) {
      this.workspace.updateActiveTabTitle(patientName);
    }
    this.navigation.navigateToPatientWorkspace(patId, 'overview');
  }

  openRecent(patId: number): void {
    const hit = this.recentPatients.find((r) => r.patId === patId);
    if (!hit) return;
    this.openPatient({
      patId: hit.patId,
      patientName: hit.label,
      accountNo: null,
      mrn: null,
      dob: null,
      phone: null,
      primaryPayer: null,
      patientBalance: null,
      insuranceBalance: null,
      totalBalance: null,
      lastDos: null,
      openClaimCount: null,
      status: 'Active'
    });
  }

  applyRecentSearch(term: string): void {
    this.searchControl.setValue(term);
    this.search$.next(term);
  }
}
