import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ReceiverLibraryService } from './receiver-library.service';
import { ReceiverLibraryDto } from '../../core/services/receiver-library-api.service';

interface ExportFormatOption {
  value: string;
  name: string;
}

@Component({
  selector: 'app-receiver-library-detail',
  templateUrl: './receiver-library-detail.component.html',
  styleUrls: ['./receiver-library-detail.component.scss']
})
export class ReceiverLibraryDetailComponent implements OnInit {
  form!: FormGroup;
  exportFormats: ExportFormatOption[] = [];
  loading = false;
  saving = false;
  error: string | null = null;
  /** Shown when Save is clicked but required fields are missing (form stays visible). */
  validationMessage: string | null = null;
  isNew = false;
  currentId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private service: ReceiverLibraryService
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadExportFormats();
    this.form.valueChanges.subscribe(() => { this.validationMessage = null; });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam === 'new' || idParam === 'null' || !idParam || (typeof idParam === 'string' && idParam.trim() === '')) {
      this.isNew = true;
      this.currentId = null;
    } else {
      this.currentId = idParam;
      this.loadLibrary(idParam);
    }
  }

  private buildForm(): void {
    this.form = this.fb.group({
      libraryEntryName: ['', Validators.required],
      exportFormat: [null, Validators.required],
      claimType: [''],

      submitterType: [null],
      businessOrLastName: [''],
      firstName: [''],
      submitterId: [''],
      contactName: [''],
      contactType: [''],
      contactValue: [''],

      receiverName: [''],
      receiverId: [''],

      // ISA fields - dropdown + input combinations
      authorizationInfoQualifier: ['00'],
      authorizationInfo: [''],
      securityInfoQualifier: ['00'],
      securityInfo: [''],
      senderIdQualifier: ['01'],
      senderId: [''],
      interchangeReceiverIdQualifier: ['01'],
      interchangeReceiverId: [''],
      acknowledgeRequested: [false],
      testProdIndicator: ['P'],
      senderCode: [''],
      receiverCode: [''],

      isActive: [true],
      stripExtraCharacters: [true],
      zipExportFile: [false],
      notes: ['']
    });
  }

  private loadExportFormats(): void {
    this.service.getExportFormats().subscribe({
      next: (formats) => {
        this.exportFormats = formats || [];
      },
      error: (err) => {
        console.error('Export formats load failed', err);
        this.exportFormats = [
          { value: '1', name: 'ANSI 837 w/~' },
          { value: '2', name: 'Eligibility Inquiry 270' }
        ];
      }
    });
  }

  private loadLibrary(id: string): void {
    this.loading = true;
    this.error = null;
    this.service.getById(id).subscribe({
      next: (library) => {
        // Backend now returns separate qualifier fields, use them directly
        this.form.patchValue({
          libraryEntryName: library.libraryEntryName,
          exportFormat: library.exportFormat,
          claimType: library.claimType || '',
          submitterType: library.submitterType,
          businessOrLastName: library.businessOrLastName || '',
          firstName: library.firstName || '',
          submitterId: library.submitterId || '',
          contactName: library.contactName || '',
          contactType: library.contactType || '',
          contactValue: library.contactValue || '',
          receiverName: library.receiverName || '',
          receiverId: library.receiverId || '',
          authorizationInfoQualifier: library.authorizationInfoQualifier || '00',
          authorizationInfo: library.authorizationInfo || '',
          securityInfoQualifier: library.securityInfoQualifier || '00',
          securityInfo: library.securityInfo || '',
          senderIdQualifier: library.senderQualifier || '01',
          senderId: library.senderId || '',
          interchangeReceiverIdQualifier: library.receiverQualifier || '01',
          interchangeReceiverId: library.interchangeReceiverId || '',
          acknowledgeRequested: library.acknowledgeRequested,
          testProdIndicator: library.testProdIndicator || 'P',
          senderCode: library.senderCode || '',
          receiverCode: library.receiverCode || '',
          isActive: library.isActive,
          stripExtraCharacters: true,
          zipExportFile: false,
          notes: ''
        });
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.message || 'Failed to load receiver library';
        this.loading = false;
      }
    });
  }

  onSaveAndNew(): void {
    console.log('Save & New clicked');
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.validationMessage = 'Please fill in required fields: Library Entry Name and Export Format.';
      return;
    }
    this.validationMessage = null;
    this.error = null;
    this.saving = true;
    const formValue = this.prepareFormValue(this.form.value);
    console.log('Sending create payload', formValue);

    if (this.isNew) {
      this.service.create(formValue).subscribe({
        next: () => {
          this.saving = false;
          this.service.notifyListRefresh(); // So Entry Name list shows the new entry
          this.form.reset();
          this.form.patchValue({
            testProdIndicator: 'P',
            isActive: true,
            acknowledgeRequested: false,
            stripExtraCharacters: true,
            zipExportFile: false,
            notes: '',
            authorizationInfoQualifier: '00',
            securityInfoQualifier: '00',
            senderIdQualifier: '01',
            interchangeReceiverIdQualifier: '01'
          });
        },
        error: (err) => {
          this.error = err?.error?.message || err?.message || 'Failed to create receiver library';
          this.saving = false;
          console.error('Receiver library create failed', err);
        }
      });
    } else if (this.currentId) {
      this.service.update(this.currentId, formValue).subscribe({
        next: () => {
          this.saving = false;
          this.service.notifyListRefresh(); // So Entry Name list stays up to date
          this.form.reset();
          this.form.patchValue({
            testProdIndicator: 'P',
            isActive: true,
            acknowledgeRequested: false,
            stripExtraCharacters: true,
            zipExportFile: false,
            notes: '',
            authorizationInfoQualifier: '00',
            securityInfoQualifier: '00',
            senderIdQualifier: '01',
            interchangeReceiverIdQualifier: '01'
          });
          this.isNew = true;
          this.currentId = null;
          this.router.navigate(['../new'], { relativeTo: this.route });
        },
        error: (err) => {
          this.error = err?.error?.message || err?.message || 'Failed to update receiver library';
          this.saving = false;
          console.error('Receiver library update failed', err);
        }
      });
    }
  }

  onSaveAndClose(): void {
    console.log('Save & Close clicked');
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.validationMessage = 'Please fill in required fields: Library Entry Name and Export Format.';
      return;
    }
    this.validationMessage = null;
    this.error = null;
    this.saving = true;
    const formValue = this.prepareFormValue(this.form.value);
    console.log('Sending save payload', formValue);

    if (this.isNew) {
      this.service.create(formValue).subscribe({
        next: () => {
          console.log('Create success, navigating to list');
          this.saving = false;
          this.router.navigate(['../'], { relativeTo: this.route });
        },
        error: (err) => {
          const msg = err?.error?.message || err?.message || 'Failed to create receiver library';
          this.error = msg;
          this.saving = false;
          console.error('Receiver library create failed', err?.status, err?.error, msg);
        }
      });
    } else if (this.currentId) {
      this.service.update(this.currentId, formValue).subscribe({
        next: () => {
          console.log('Update success, navigating to list');
          this.saving = false;
          this.router.navigate(['../'], { relativeTo: this.route });
        },
        error: (err) => {
          const msg = err?.error?.message || err?.message || 'Failed to update receiver library';
          this.error = msg;
          this.saving = false;
          console.error('Receiver library update failed', err?.status, err?.error, msg);
        }
      });
    } else {
      console.warn('Save & Close: neither isNew nor currentId');
      this.saving = false;
    }
  }

  onDelete(): void {
    if (!this.currentId) return;
    
    if (confirm('Are you sure you want to delete this receiver library?')) {
      this.service.delete(this.currentId).subscribe({
        next: () => {
          this.router.navigate(['../'], { relativeTo: this.route });
        },
        error: (err) => {
          this.error = err?.message || 'Failed to delete receiver library';
        }
      });
    }
  }

  onClose(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  private prepareFormValue(formValue: any): any {
    // Send separate qualifier and value fields to backend (matching backend DTO structure)
    const result = { ...formValue };
    // Backend expects exportFormat as enum number (1 or 2)
    const ef = formValue.exportFormat;
    result.exportFormat = typeof ef === 'number' ? ef : (ef != null ? Number(ef) : undefined);
    // Backend expects submitterType as int
    const st = formValue.submitterType;
    result.submitterType = typeof st === 'number' ? st : (st != null && st !== '' ? Number(st) : 0);

    // Map frontend field names to backend field names
    result.authorizationInfoQualifier = formValue.authorizationInfoQualifier || '00';
    result.authorizationInfo = formValue.authorizationInfo || '';
    result.securityInfoQualifier = formValue.securityInfoQualifier || '00';
    result.securityInfo = formValue.securityInfo || '';
    result.senderQualifier = formValue.senderIdQualifier || '01';
    result.senderId = formValue.senderId || '';
    result.receiverQualifier = formValue.interchangeReceiverIdQualifier || '01';
    result.interchangeReceiverId = formValue.interchangeReceiverId || '';
    
    // Remove frontend-only field names
    delete result.senderIdQualifier;
    delete result.interchangeReceiverIdQualifier;
    
    // Remove UI-only fields
    delete result.stripExtraCharacters;
    delete result.zipExportFile;
    delete result.notes;
    
    return result;
  }
}
