import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { PatientApiService } from '../../core/services/patient-api.service';
import {
  PatientDetail,
  InsuranceInfo,
  InsuranceUpdate,
} from '../../core/services/patient.models';
import { PhysicianApiService } from '../../core/services/physician-api.service';
import { PayerApiService } from '../../core/services/payer-api.service';
import { ListApiService, ListValueDto } from '../../core/services/list-api.service';
import { RibbonContextService } from '../../core/services/ribbon-context.service';

interface PhysicianOption {
  phyID: number;
  phyName: string;
  phyEntityType: string | null;
}

@Component({
  selector: 'app-patient-details',
  templateUrl: './patient-details.component.html',
  styleUrls: ['./patient-details.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientDetailsComponent implements OnInit {
  patient: PatientDetail | null = null;
  patientForm!: FormGroup;
  loading = false;
  error: string | null = null;
  patId: number | null = null;
  newNote = '';
  saving = false;

  physicians: PhysicianOption[] = [];
  payers: Array<{ payID: number; payName: string }> = [];

  physicianPickerOpen = false;
  /** When opening the physician library, which patient form field to set (e.g. patFacilityPhyFID). */
  physicianPickerFor: string | null = null;

  classificationOptions: ListValueDto[] = [];

  readonly US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
  readonly MARITAL_OPTIONS: { value: number | null; label: string }[] = [
    { value: null, label: '--' },
    { value: 0, label: 'Unknown' }, { value: 1, label: 'Single' }, { value: 2, label: 'Married' },
    { value: 3, label: 'Divorced' }, { value: 4, label: 'Widowed' }
  ];
  readonly APT_REMINDER_OPTIONS = ['No Reminders', 'Email', 'SMS', 'Phone'];
  readonly REMINDER_PROMPT_OPTIONS = ['Don\'t Prompt', 'Daily', 'Weekly'];
  readonly RELATION_TO_INSURED_OPTIONS: { value: number; label: string }[] = [
    { value: 0, label: 'Self' }, { value: 1, label: 'Spouse' }, { value: 2, label: 'Child' },
    { value: 3, label: 'Other' }
  ];
  readonly CLAIM_FILING_OPTIONS = ['11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', 'BL', 'CH', 'CI', 'DS', 'HM', 'LI', 'LM', 'MA', 'MB', 'MC', 'OF', 'SI', 'SS', 'VA', 'WC'];

  /** Insurances 1-5 (Primary, Secondary, 3rd, 4th, 5th) */
  insuranceList: InsuranceInfo[] = [];

  /** Current tab 1-5 (sequence number) */
  insuranceTab = 1;
  insuranceLoaded = false;

  readonly MAX_INSURANCES = 5;
  readonly ngModelStandalone = { standalone: true };
  readonly INSURANCE_TAB_LABELS: Record<number, string> = {
    1: 'Primary Ins',
    2: 'Secondary Ins',
    3: '3rd Ins',
    4: '4th Ins',
    5: '5th Ins'
  };

  sectionsState = {
    patientInfo: true,
    contactInfo: true,
    physicianFacility: true,
    additionalClaim: true,
    otherPatient: true,
    additionalData: true,
    statement: true,
    reminderNote: true,
    patientNotes: true
  };


  private requestInFlight = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private patientApi: PatientApiService,
    private ribbonContext: RibbonContextService,
    private physicianApi: PhysicianApiService,
    private payerApi: PayerApiService,
    private listApi: ListApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.buildPatientForm();
    const idParam = this.route.snapshot.paramMap.get('patId');
    if (idParam) {
      this.patId = +idParam;
      const claimIdParam = this.route.snapshot.queryParamMap.get('claimId');
      const fromClaimId = claimIdParam ? parseInt(claimIdParam, 10) : null;
      this.ribbonContext.setContext({
        patientId: this.patId,
        claimId: fromClaimId && !isNaN(fromClaimId) ? fromClaimId : null
      });
      this.loadClassificationOptions();
      this.loadPhysicians();
      this.loadPayers();
      this.loadPatient(this.patId);
    } else {
      this.error = 'Invalid patient ID';
      this.cdr.markForCheck();
    }
  }

  private buildPatientForm(): void {
    this.patientForm = this.fb.group({
      patFirstName: [''],
      patLastName: [''],
      patMI: [''],
      patAddress: [''],
      patAddress2: [''],
      patCity: [''],
      patState: [null as string | null],
      patZip: [''],
      patBirthDate: [null as string | null],
      patSex: [null as string | null],
      patMarried: [null as number | null],
      patEmployed: [null as number | null],
      patAccountNo: [''],
      patClassification: [null as string | null],
      patClaLibFID: [0],
      patCoPayAmount: [null as number | null],
      patCoPayPercent: [null as number | null],
      patDiagnosis1: [''],
      patDiagnosis2: [''],
      patDiagnosis3: [''],
      patDiagnosis4: [''],
      patPhoneNo: [''],
      patHomePhoneNo: [''],
      patCellPhoneNo: [''],
      patWorkPhoneNo: [''],
      patFaxNo: [''],
      patPriEmail: [''],
      patSecEmail: [''],
      patAptReminderPref: [null as string | null],
      patEmergencyContactName: [''],
      patEmergencyContactPhoneNo: [''],
      patEmergencyContactRelation: [''],
      patBillingPhyFID: [0],
      patRenderingPhyFID: [0],
      patFacilityPhyFID: [0],
      patReferringPhyFID: [0],
      patOrderingPhyFID: [0],
      patSupervisingPhyFID: [0],
      patPhyPrintDate: [false],
      patSigOnFile: [false],
      patPrintSigDate: [false],
      patInsuredSigOnFile: [false],
      patSigSource: [null as string | null],
      patBox8Reserved: [''],
      patSSN: [''],
      patWeight: [''],
      patHeight: [''],
      patMemberID: [''],
      patStatementName: [''],
      patStatementAddressLine1: [''],
      patStatementAddressLine2: [''],
      patStatementCity: [''],
      patStatementState: [null as string | null],
      patStatementZipCode: [''],
      patStatementMessage: [''],
      patDontSendStatements: [false],
      patDontSendPromotions: [false],
      patReminderNote: [''],
      patReminderNoteEvent: [null as string | null],
      patCustomField1: [''],
      patCustomField2: [''],
      patCustomField3: [''],
      patCustomField4: [''],
      patCustomField5: [''],
      patExternalFID: [''],
      patPaymentMatchingKey: [''],
      patActive: [true],
      patAuthTracking: [false]
    });
  }

  loadClassificationOptions(): void {
    this.listApi.getListValues('Patient Classification').subscribe({
      next: (r) => {
        this.classificationOptions = (r.data || []).slice().sort((a, b) => (a.value || '').localeCompare(b.value || ''));
        this.cdr.markForCheck();
      },
      error: () => {
        this.classificationOptions = [];
        this.cdr.markForCheck();
      }
    });
  }

  loadPhysicians(): void {
    this.physicianApi.getPhysicians(1, 10000, { inactive: false }).subscribe({
      next: (r) => {
        const data = r.data ?? [];
        this.physicians = data.map(p => ({
          phyID: p.phyID,
          phyName: p.phyFullNameCC || p.phyName || 'Unknown',
          phyEntityType: (p as any).phyEntityType ?? p.phyType ?? null
        }));
        this.cdr.markForCheck();
      },
      error: () => {
        this.physicians = [];
        this.cdr.markForCheck();
      }
    });
  }

  loadPayers(): void {
    this.payerApi.getPayers(1, 1000, { inactive: false }).subscribe({
      next: (r) => {
        this.payers = (r.data || []).map((p: any) => ({ payID: p.payID, payName: p.payName || 'Unknown' }));
        this.cdr.markForCheck();
      },
      error: () => {
        this.payers = [];
        this.cdr.markForCheck();
      }
    });
  }

  loadPatient(patId: number): void {
    if (this.requestInFlight) return;
    this.loading = true;
    this.error = null;
    this.insuranceLoaded = false;
    this.requestInFlight = true;

    this.patientApi.getPatientById(patId).pipe(
      finalize(() => {
        this.loading = false;
        this.requestInFlight = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (p: PatientDetail) => {
        this.patient = p;
        this.patientForm.patchValue(this.patientToFormValue(p));
        this.bindInsuranceFromApi(p);
        this.insuranceLoaded = true;
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (err.status === 404) {
          this.error = `Patient ${patId} not found.`;
        } else {
          this.error = 'Failed to load patient. Please try again.';
        }
        console.error('Error loading patient:', err);
      }
    });
  }

  private patientToFormValue(p: PatientDetail): Record<string, unknown> {
    return {
      patFirstName: p.patFirstName ?? '',
      patLastName: p.patLastName ?? '',
      patMI: p.patMI ?? '',
      patAddress: p.patAddress ?? '',
      patAddress2: p.patAddress2 ?? '',
      patCity: p.patCity ?? '',
      patState: p.patState ?? null,
      patZip: p.patZip ?? '',
      patBirthDate: p.patBirthDate ?? null,
      patSex: p.patSex ?? null,
      patMarried: p.patMarried ?? null,
      patEmployed: p.patEmployed ?? null,
      patAccountNo: p.patAccountNo ?? '',
      patClassification: p.patClassification ?? null,
      patClaLibFID: p.patClaLibFID ?? 0,
      patCoPayAmount: p.patCoPayAmount ?? null,
      patCoPayPercent: p.patCoPayPercent ?? null,
      patDiagnosis1: p.patDiagnosis1 ?? '',
      patDiagnosis2: p.patDiagnosis2 ?? '',
      patDiagnosis3: p.patDiagnosis3 ?? '',
      patDiagnosis4: p.patDiagnosis4 ?? '',
      patPhoneNo: p.patPhoneNo ?? '',
      patHomePhoneNo: p.patHomePhoneNo ?? '',
      patCellPhoneNo: p.patCellPhoneNo ?? '',
      patWorkPhoneNo: p.patWorkPhoneNo ?? '',
      patFaxNo: p.patFaxNo ?? '',
      patPriEmail: p.patPriEmail ?? '',
      patSecEmail: p.patSecEmail ?? '',
      patAptReminderPref: p.patAptReminderPref ?? null,
      patEmergencyContactName: p.patEmergencyContactName ?? '',
      patEmergencyContactPhoneNo: p.patEmergencyContactPhoneNo ?? '',
      patEmergencyContactRelation: p.patEmergencyContactRelation ?? '',
      patBillingPhyFID: p.patBillingPhyFID ?? 0,
      patRenderingPhyFID: p.patRenderingPhyFID ?? 0,
      patFacilityPhyFID: p.patFacilityPhyFID ?? 0,
      patReferringPhyFID: p.patReferringPhyFID ?? 0,
      patOrderingPhyFID: p.patOrderingPhyFID ?? 0,
      patSupervisingPhyFID: p.patSupervisingPhyFID ?? 0,
      patPhyPrintDate: p.patPhyPrintDate ?? false,
      patSigOnFile: p.patSigOnFile ?? false,
      patPrintSigDate: p.patPrintSigDate ?? false,
      patInsuredSigOnFile: p.patInsuredSigOnFile ?? false,
      patSigSource: p.patSigSource ?? null,
      patBox8Reserved: (p as any).patBox8Reserved ?? '',
      patSSN: p.patSSN ?? '',
      patWeight: p.patWeight ?? '',
      patHeight: p.patHeight ?? '',
      patMemberID: p.patMemberID ?? '',
      patStatementName: p.patStatementName ?? '',
      patStatementAddressLine1: p.patStatementAddressLine1 ?? '',
      patStatementAddressLine2: p.patStatementAddressLine2 ?? '',
      patStatementCity: p.patStatementCity ?? '',
      patStatementState: p.patStatementState ?? null,
      patStatementZipCode: p.patStatementZipCode ?? '',
      patStatementMessage: p.patStatementMessage ?? '',
      patDontSendStatements: p.patDontSendStatements ?? false,
      patDontSendPromotions: p.patDontSendPromotions ?? false,
      patReminderNote: p.patReminderNote ?? '',
      patReminderNoteEvent: p.patReminderNoteEvent ?? null,
      patCustomField1: p.patCustomField1 ?? '',
      patCustomField2: p.patCustomField2 ?? '',
      patCustomField3: p.patCustomField3 ?? '',
      patCustomField4: p.patCustomField4 ?? '',
      patCustomField5: p.patCustomField5 ?? '',
      patExternalFID: p.patExternalFID ?? '',
      patPaymentMatchingKey: p.patPaymentMatchingKey ?? '',
      patActive: p.patActive ?? true,
      patAuthTracking: p.patAuthTracking ?? false
    };
  }

  /** Bind insurance from API */
  private bindInsuranceFromApi(p: PatientDetail): void {
    const list = p.insuranceList && p.insuranceList.length > 0
      ? p.insuranceList
      : [p.primaryInsurance, p.secondaryInsurance].filter(Boolean) as InsuranceInfo[];
    this.insuranceList = list.map(ins => this.normalizeInsurance(ins)!).filter(Boolean);
    if (this.insuranceTab > this.insuranceList.length && this.insuranceList.length > 0) {
      this.insuranceTab = 1;
    }
  }

  get currentInsurance(): InsuranceInfo | null {
    const found = this.insuranceList.find(i => i.patInsSequence === this.insuranceTab);
    return found ?? this.insuranceList[this.insuranceTab - 1] ?? null;
  }

  get hasPrimaryInsurance(): boolean {
    return this.insuranceList.some(ins => ins.patInsSequence === 1);
  }

  get canUpdateClaims(): boolean {
    return !this.saving && this.hasPrimaryInsurance;
  }

  get canAddInsurance(): boolean {
    return this.insuranceList.length < this.MAX_INSURANCES;
  }

  /** Tabs for Secondary, 3rd, 4th, 5th ins (Primary always shown separately) */
  get additionalInsuranceTabs(): InsuranceInfo[] {
    return this.insuranceList.filter(i => i.patInsSequence > 1);
  }

  hasInsuranceAtSequence(seq: number): boolean {
    return this.insuranceList.some(i => i.patInsSequence === seq);
  }

  getInsuranceTabLabel(seq: number): string {
    return this.INSURANCE_TAB_LABELS[seq] ?? `Ins ${seq}`;
  }

  selectInsuranceTab(seq: number): void {
    this.insuranceTab = seq;
    this.cdr.markForCheck();
  }

  private normalizeInsurance(ins: InsuranceInfo | null | undefined): InsuranceInfo | null {
    if (!ins) return null;
    return { ...ins, patInsGUID: ins.patInsGUID ?? '', insAcceptAssignment: ins.insAcceptAssignment ?? 0, patInsActive: ins.patInsActive ?? true, patInsLocked: ins.patInsLocked ?? false };
  }

  refreshPhysicians(): void {
    this.loadPhysicians();
  }

  openPhysicianPicker(controlName?: string): void {
    this.physicianPickerFor = controlName ?? null;
    this.physicianPickerOpen = true;
    this.cdr.markForCheck();
  }

  closePhysicianPicker(): void {
    this.physicianPickerOpen = false;
    this.physicianPickerFor = null;
    this.loadPhysicians();
    this.cdr.markForCheck();
  }

  getPhysicianPickerInitialId(): number {
    if (!this.physicianPickerFor) return 0;
    const v = this.patientForm.get(this.physicianPickerFor)?.value;
    return (v != null && Number(v)) ? Number(v) : 0;
  }

  onPhysicianSelected(physician: { phyID: number }): void {
    if (this.physicianPickerFor && this.patientForm.contains(this.physicianPickerFor)) {
      this.patientForm.patchValue({ [this.physicianPickerFor]: physician.phyID });
      this.cdr.markForCheck();
    }
    this.closePhysicianPicker();
  }

  getBox8DateValue(): string {
    return this.patientForm.get('patBox8Reserved')?.value ?? '';
  }

  setBox8DateValue(value: string): void {
    this.patientForm.patchValue({ patBox8Reserved: value || '' });
    this.cdr.markForCheck();
  }

  setSignatureSourceToInitial(): void {
    this.patientForm.patchValue({ patSigSource: 'I' });
    this.cdr.markForCheck();
  }

  clearPhysician(controlName: string): void {
    this.patientForm.patchValue({ [controlName]: 0 });
    this.cdr.markForCheck();
  }

  parseInsuredName(value: string, ins: InsuranceInfo): void {
    const parts = (value || '').split(',').map(s => s.trim());
    ins.insLastName = parts[0] || null;
    const firstMi = (parts[1] || '').split(/\s+/);
    ins.insFirstName = firstMi[0] || null;
    ins.insMI = firstMi[1] || null;
    this.cdr.markForCheck();
  }

  setAcceptAssignment(ins: InsuranceInfo, checked: boolean): void {
    ins.insAcceptAssignment = checked ? 1 : 0;
    this.cdr.markForCheck();
  }

  clearPayer(ins: InsuranceInfo): void {
    ins.payID = 0;
    this.cdr.markForCheck();
  }

  copyFromPatient(ins: InsuranceInfo): void {
    if (!this.patient) return;
    const v = this.patientForm.value;
    ins.insLastName = v.patLastName;
    ins.insFirstName = v.patFirstName;
    ins.insMI = v.patMI;
    ins.insBirthDate = v.patBirthDate;
    ins.insAddress = v.patAddress;
    ins.insCity = v.patCity;
    ins.insState = v.patState;
    ins.insZip = v.patZip;
    ins.insPhone = v.patPhoneNo;
    this.cdr.markForCheck();
  }

  getInsuredNameDisplay(ins: InsuranceInfo): string {
    const parts = [ins.insLastName, ins.insFirstName].filter(Boolean);
    if (ins.insMI) parts[1] = (parts[1] || '') + ' ' + ins.insMI;
    return parts.join(', ') || '';
  }

  goBackToList(): void {
    this.router.navigate(['/patients/find-patient']);
  }

  toggleSection(section: keyof typeof this.sectionsState): void {
    this.sectionsState[section] = !this.sectionsState[section];
    this.cdr.markForCheck();
  }

  /** Swap current insurance with Primary (seq 1) */
  swapInsurance(): void {
    const current = this.currentInsurance;
    const primary = this.insuranceList.find(i => i.patInsSequence === 1);
    if (!current || !primary || current.patInsSequence === 1) return;
    const newList = this.insuranceList.map(i => {
      if (i.patInsSequence === 1) return { ...current, patInsSequence: 1 };
      if (i.patInsSequence === current.patInsSequence) return { ...primary, patInsSequence: current.patInsSequence };
      return i;
    }).sort((a, b) => a.patInsSequence - b.patInsSequence);
    this.insuranceList = newList;
    this.insuranceTab = 1;
    this.cdr.markForCheck();
    this.saveAndReload();
  }

  /** Promote current insurance to Primary */
  replacePrimary(): void {
    const current = this.currentInsurance;
    if (!current || current.patInsSequence === 1) return;
    const seq = current.patInsSequence;
    const newList = this.insuranceList.map(i => {
      if (i.patInsSequence === 1) return { ...i, patInsSequence: seq };
      if (i.patInsSequence === seq) return { ...i, patInsSequence: 1 };
      return i;
    }).sort((a, b) => a.patInsSequence - b.patInsSequence);
    this.insuranceList = newList;
    this.insuranceTab = 1;
    this.cdr.markForCheck();
    this.saveAndReload();
  }

  private saveAndReload(): void {
    if (!this.patId) return;
    const body = this.buildUpdateBody();
    body.insuranceList = this.buildInsuranceList();
    this.patientApi.updatePatient(this.patId, body).subscribe({
      next: () => this.loadPatient(this.patId!),
      error: (err) => {
        console.error('Failed to save insurance swap', err);
        alert('Failed to save. Please try again.');
      }
    });
  }

  /** Add Ins: new insurance becomes Primary (seq 1), others shift down. Max 5. */
  addInsurance(): void {
    if (!this.canAddInsurance) return;
    const newIns: InsuranceInfo = {
      patInsGUID: '',
      patInsSequence: 1,
      payID: 0,
      payerName: null,
      insGroupNumber: null,
      insIDNumber: null,
      insFirstName: null,
      insLastName: null,
      insMI: null,
      insPlanName: null,
      patInsRelationToInsured: 0,
      insBirthDate: null,
      insAddress: null,
      insCity: null,
      insState: null,
      insZip: null,
      insPhone: null,
      insEmployer: null,
      insAcceptAssignment: 0,
      insClaimFilingIndicator: null,
      insSSN: null,
      patInsEligStatus: null,
      patInsActive: true
    };
    const shifted = this.insuranceList.map((i, idx) => ({ ...i, patInsSequence: idx + 2 })).filter(i => i.patInsSequence <= this.MAX_INSURANCES);
    this.insuranceList = [newIns, ...shifted];
    this.insuranceTab = 1;
    this.cdr.markForCheck();
  }

  removeCurrentInsurance(): void {
    const current = this.currentInsurance;
    if (!current) return;
    const seq = current.patInsSequence;
    const newList = this.insuranceList
      .filter(i => i.patInsSequence !== seq)
      .map(i => i.patInsSequence > seq ? { ...i, patInsSequence: i.patInsSequence - 1 } : i)
      .sort((a, b) => a.patInsSequence - b.patInsSequence);
    this.insuranceList = newList;
    if (this.insuranceTab > newList.length) this.insuranceTab = Math.max(1, newList.length);
    this.cdr.markForCheck();
    this.saveAndReload();
  }

  /** Update all claims' primary insurance from patient's primary (ResponsibilitySequence=1) */
  updateClaims(): void {
    if (!this.patient || !this.patId || this.saving) return;
    const primary = this.insuranceList.find(i => i.patInsSequence === 1);
    if (!primary) {
      alert('No primary insurance to copy to claims.');
      return;
    }
    this.saving = true;
    this.cdr.markForCheck();

    const body = { ...this.buildUpdateBody(), updateClaims: true };

    this.patientApi.updatePatient(this.patId, body).pipe(
      finalize(() => {
        this.saving = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: () => {
        this.loadPatient(this.patId!);
        alert('Claims updated with primary insurance.');
      },
      error: (err) => {
        console.error('Failed to update claims', err);
        alert('Failed to update claims.');
      }
    });
  }

  buildInsuranceList(): InsuranceUpdate[] {
    const toUpdate = (ins: InsuranceInfo): InsuranceUpdate => ({
      patInsGUID: ins.patInsGUID || undefined,
      sequence: ins.patInsSequence,
      payID: ins.payID || undefined,
      groupNumber: ins.insGroupNumber,
      memberID: ins.insIDNumber,
      insFirstName: ins.insFirstName,
      insLastName: ins.insLastName,
      insMI: ins.insMI,
      planName: ins.insPlanName,
      relationToInsured: ins.patInsRelationToInsured,
      insBirthDate: ins.insBirthDate || undefined,
      insAddress: ins.insAddress,
      insCity: ins.insCity,
      insState: ins.insState,
      insZip: ins.insZip,
      insPhone: ins.insPhone,
      insEmployer: ins.insEmployer,
      insAcceptAssignment: ins.insAcceptAssignment ?? 0,
      insClaimFilingIndicator: ins.insClaimFilingIndicator,
      insSSN: ins.insSSN
    });
    return this.insuranceList.map(toUpdate);
  }

  save(): void {
    if (!this.patient || !this.patId || this.saving) return;
    this.syncFormToPatient();
    this.saving = true;
    this.cdr.markForCheck();

    const body = this.buildUpdateBody();
    this.patientApi.updatePatient(this.patId, body).pipe(
      finalize(() => {
        this.saving = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: () => {
        this.newNote = '';
        this.loadPatient(this.patId!);
      },
      error: (err) => {
        console.error('Failed to save patient', err);
        alert('Failed to save patient');
      }
    });
  }

  saveAndClose(): void {
    if (!this.patient || !this.patId || this.saving) {
      this.goBackToList();
      return;
    }
    this.syncFormToPatient();
    this.saving = true;
    this.cdr.markForCheck();

    const body = this.buildUpdateBody();
    this.patientApi.updatePatient(this.patId, body).pipe(
      finalize(() => { this.saving = false; this.cdr.markForCheck(); })
    ).subscribe({
      next: () => {
        this.newNote = '';
        this.goBackToList();
      },
      error: (err) => {
        console.error('Failed to save patient', err);
        alert('Failed to save patient');
      }
    });
  }

  close(): void {
    this.goBackToList();
  }

  private syncFormToPatient(): void {
    if (!this.patient) return;
    const v = this.patientForm.value;
    Object.assign(this.patient, v);
  }

  private buildUpdateBody() {
    this.syncFormToPatient();
    const p = this.patient!;
    return {
      patFirstName: p.patFirstName,
      patLastName: p.patLastName,
      patMI: p.patMI,
      patAccountNo: p.patAccountNo,
      patActive: p.patActive,
      patBirthDate: p.patBirthDate,
      patSSN: p.patSSN,
      patSex: p.patSex,
      patAddress: p.patAddress,
      patAddress2: p.patAddress2,
      patCity: p.patCity,
      patState: p.patState,
      patZip: p.patZip,
      patPhoneNo: p.patPhoneNo,
      patCellPhoneNo: p.patCellPhoneNo,
      patHomePhoneNo: p.patHomePhoneNo,
      patWorkPhoneNo: p.patWorkPhoneNo,
      patFaxNo: p.patFaxNo,
      patPriEmail: p.patPriEmail,
      patSecEmail: p.patSecEmail,
      patClassification: p.patClassification,
      patClaLibFID: p.patClaLibFID ?? undefined,
      patCoPayAmount: p.patCoPayAmount ?? undefined,
      patDiagnosis1: p.patDiagnosis1,
      patDiagnosis2: p.patDiagnosis2,
      patDiagnosis3: p.patDiagnosis3,
      patDiagnosis4: p.patDiagnosis4,
      patEmployed: p.patEmployed ?? undefined,
      patMarried: p.patMarried ?? undefined,
      patRenderingPhyFID: p.patRenderingPhyFID,
      patBillingPhyFID: p.patBillingPhyFID,
      patFacilityPhyFID: p.patFacilityPhyFID,
      patReferringPhyFID: p.patReferringPhyFID,
      patOrderingPhyFID: p.patOrderingPhyFID,
      patSupervisingPhyFID: p.patSupervisingPhyFID,
      patStatementName: p.patStatementName,
      patStatementAddressLine1: p.patStatementAddressLine1,
      patStatementAddressLine2: p.patStatementAddressLine2,
      patStatementCity: p.patStatementCity,
      patStatementState: p.patStatementState,
      patStatementZipCode: p.patStatementZipCode,
      patStatementMessage: p.patStatementMessage,
      patReminderNote: p.patReminderNote,
      patEmergencyContactName: p.patEmergencyContactName,
      patEmergencyContactPhoneNo: p.patEmergencyContactPhoneNo,
      patEmergencyContactRelation: p.patEmergencyContactRelation,
      patWeight: p.patWeight,
      patHeight: p.patHeight,
      patMemberID: p.patMemberID,
      patSigOnFile: p.patSigOnFile,
      patInsuredSigOnFile: p.patInsuredSigOnFile,
      patPrintSigDate: p.patPrintSigDate ?? undefined,
      patPhyPrintDate: p.patPhyPrintDate ?? undefined,
      patDontSendPromotions: p.patDontSendPromotions,
      patDontSendStatements: p.patDontSendStatements,
      patAptReminderPref: p.patAptReminderPref,
      patReminderNoteEvent: p.patReminderNoteEvent,
      patSigSource: p.patSigSource,
      patCoPayPercent: p.patCoPayPercent ?? undefined,
      patCustomField1: p.patCustomField1,
      patCustomField2: p.patCustomField2,
      patCustomField3: p.patCustomField3,
      patCustomField4: p.patCustomField4,
      patCustomField5: p.patCustomField5,
      patExternalFID: p.patExternalFID,
      patPaymentMatchingKey: p.patPaymentMatchingKey,
      patLastStatementDateTRIG: p.patLastStatementDateTRIG ?? undefined,
      patAuthTracking: p.patAuthTracking ?? undefined,
      insuranceList: this.buildInsuranceList(),
      noteText: this.newNote?.trim() || null
    };
  }

  getPatientName(): string {
    if (!this.patient) return 'Unknown';
    const fn = this.patient.patFirstName || '';
    const ln = this.patient.patLastName || '';
    if (ln || fn) return `${ln.toUpperCase()}, ${fn}`.trim();
    return this.patient.patFullNameCC || 'Unknown';
  }

  formatDateOnly(value: string | null | undefined): string {
    if (!value) return '';
    try {
      return new Date(value).toLocaleDateString('en-US', {
        year: 'numeric', month: '2-digit', day: '2-digit'
      });
    } catch {
      return value;
    }
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) return '';
    try {
      return new Date(value).toLocaleString('en-US', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
    } catch {
      return value;
    }
  }

  getNotesHistory() {
    return this.patient?.patientNotes ?? [];
  }
}
