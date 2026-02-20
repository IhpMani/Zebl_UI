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
    
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam === 'new') {
      this.isNew = true;
    } else if (idParam) {
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
        this.exportFormats = formats;
      },
      error: (err) => {
        this.error = 'Failed to load export formats';
        console.error(err);
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
    if (this.form.invalid) return;
    
    this.saving = true;
    const formValue = this.prepareFormValue(this.form.value);
    
    if (this.isNew) {
      this.service.create(formValue).subscribe({
        next: () => {
          this.saving = false;
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
          // Stay on new route
        },
        error: (err) => {
          this.error = err?.message || 'Failed to create receiver library';
          this.saving = false;
        }
      });
    } else if (this.currentId) {
      this.service.update(this.currentId, formValue).subscribe({
        next: () => {
          this.saving = false;
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
          this.error = err?.message || 'Failed to update receiver library';
          this.saving = false;
        }
      });
    }
  }

  onSaveAndClose(): void {
    if (this.form.invalid) return;
    
    this.saving = true;
    const formValue = this.prepareFormValue(this.form.value);
    
    if (this.isNew) {
      this.service.create(formValue).subscribe({
        next: (created) => {
          this.saving = false;
          this.router.navigate(['../'], { relativeTo: this.route });
        },
        error: (err) => {
          this.error = err?.message || 'Failed to create receiver library';
          this.saving = false;
        }
      });
    } else if (this.currentId) {
      this.service.update(this.currentId, formValue).subscribe({
        next: () => {
          this.saving = false;
          this.router.navigate(['../'], { relativeTo: this.route });
        },
        error: (err) => {
          this.error = err?.message || 'Failed to update receiver library';
          this.saving = false;
        }
      });
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
