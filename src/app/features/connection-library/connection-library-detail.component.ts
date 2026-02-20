import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConnectionLibraryService } from './connection-library.service';
import { ConnectionLibraryDto, CreateConnectionLibraryCommand, UpdateConnectionLibraryCommand } from '../../core/services/connection-library-api.service';

@Component({
  selector: 'app-connection-library-detail',
  templateUrl: './connection-library-detail.component.html',
  styleUrls: ['./connection-library-detail.component.scss']
})
export class ConnectionLibraryDetailComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  saving = false;
  testing = false;
  error: string | null = null;
  isNew = false;
  currentId: string | null = null;
  /** Stored when loading a connection so we can send it on save without displaying it */
  private loadedUsername = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private service: ConnectionLibraryService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam === 'new') {
      this.isNew = true;
    } else if (idParam) {
      this.currentId = idParam;
    }
    
    this.buildForm();

    if (this.currentId) {
      this.loadConnection(this.currentId);
    } else {
      // New entry: ensure credentials stay empty (defeat browser autofill)
      setTimeout(() => {
        this.form.get('username')?.setValue('', { emitEvent: false });
        this.form.get('password')?.setValue('', { emitEvent: false });
      }, 0);
    }
  }

  private buildForm(): void {
    this.form = this.fb.group({
      id: [null],
      name: ['', Validators.required],
      connectionType: ['Secure File Transfer'],
      host: ['', Validators.required],
      port: [22, [Validators.required, Validators.min(1), Validators.max(65535)]],
      username: ['', this.isNew ? Validators.required : []],
      password: [this.isNew ? '' : '', this.isNew ? Validators.required : []],
      uploadDirectory: [''],
      downloadDirectory: [''],
      downloadPattern: [''],
      autoRenameFiles: [false],
      allowMoveOrDelete: [false],
      autoFileExtension: [''],
      useWithInterfacesOnly: [false],
      downloadFromSubdirectories: [false],
      isActive: [true]
    });

    // Conditional validation: autoFileExtension required if autoRenameFiles is true
    this.form.get('autoRenameFiles')?.valueChanges.subscribe(value => {
      const autoFileExtensionControl = this.form.get('autoFileExtension');
      if (value) {
        autoFileExtensionControl?.setValidators([Validators.required]);
      } else {
        autoFileExtensionControl?.clearValidators();
      }
      autoFileExtensionControl?.updateValueAndValidity();
    });
  }

  private loadConnection(id: string): void {
    this.loading = true;
    this.error = null;
    this.service.getById(id).subscribe({
      next: (connection) => {
        this.loadedUsername = connection.username || '';
        this.form.patchValue({
          id: connection.id,
          name: connection.name,
          host: connection.host,
          port: connection.port,
          username: '',
          password: '',
          uploadDirectory: connection.uploadDirectory || '',
          downloadDirectory: connection.downloadDirectory || '',
          downloadPattern: connection.downloadPattern || '',
          autoRenameFiles: connection.autoRenameFiles,
          allowMoveOrDelete: connection.allowMoveOrDelete,
          autoFileExtension: connection.autoFileExtension || '',
          useWithInterfacesOnly: connection.useWithInterfacesOnly,
          downloadFromSubdirectories: connection.downloadFromSubdirectories,
          isActive: connection.isActive
        });
        this.loading = false;
        // Clear credentials again after a tick so browser autofill does not overwrite
        setTimeout(() => {
          this.form.get('username')?.setValue('', { emitEvent: false });
          this.form.get('password')?.setValue('', { emitEvent: false });
        }, 0);
      },
      error: (err) => {
        this.error = err?.message || 'Failed to load connection library';
        this.loading = false;
      }
    });
  }

  onSaveAndNew(): void {
    if (this.form.invalid) return;
    
    this.saving = true;
    const formValue = this.prepareFormValue(this.form.value);
    
    if (this.isNew) {
      this.service.create(formValue as CreateConnectionLibraryCommand).subscribe({
        next: () => {
          this.saving = false;
          this.form.reset();
          this.buildForm();
          this.isNew = true;
          this.currentId = null;
          // Refresh parent list
          this.router.navigate(['../'], { relativeTo: this.route }).then(() => {
            this.router.navigate(['../new'], { relativeTo: this.route });
          });
        },
        error: (err) => {
          this.error = err?.error?.error?.message || err?.message || 'Failed to create connection library';
          this.saving = false;
        }
      });
    } else {
      this.service.update(this.currentId!, formValue as UpdateConnectionLibraryCommand).subscribe({
        next: () => {
          this.saving = false;
          this.form.reset();
          this.buildForm();
          this.isNew = true;
          this.currentId = null;
          // Refresh parent list
          this.router.navigate(['../'], { relativeTo: this.route }).then(() => {
            this.router.navigate(['../new'], { relativeTo: this.route });
          });
        },
        error: (err) => {
          this.error = err?.error?.error?.message || err?.message || 'Failed to update connection library';
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
      this.service.create(formValue as CreateConnectionLibraryCommand).subscribe({
        next: () => {
          this.saving = false;
          this.router.navigate(['../'], { relativeTo: this.route });
        },
        error: (err) => {
          this.error = err?.error?.error?.message || err?.message || 'Failed to create connection library';
          this.saving = false;
        }
      });
    } else {
      this.service.update(this.currentId!, formValue as UpdateConnectionLibraryCommand).subscribe({
        next: () => {
          this.saving = false;
          this.router.navigate(['../'], { relativeTo: this.route });
        },
        error: (err) => {
          this.error = err?.error?.error?.message || err?.message || 'Failed to update connection library';
          this.saving = false;
        }
      });
    }
  }

  onClose(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  onDelete(): void {
    if (!this.currentId) return;
    
    if (confirm('Are you sure you want to delete this connection library?')) {
      this.saving = true;
      this.service.delete(this.currentId).subscribe({
        next: () => {
          this.saving = false;
          this.router.navigate(['../'], { relativeTo: this.route });
        },
        error: (err) => {
          this.error = err?.error?.error?.message || err?.message || 'Failed to delete connection library';
          this.saving = false;
        }
      });
    }
  }

  onTestConnection(): void {
    if (this.form.invalid || !this.currentId) {
      alert('Please save the connection first before testing.');
      return;
    }

    this.testing = true;
    this.service.testConnection(this.currentId).subscribe({
      next: (response) => {
        this.testing = false;
        if (response.success) {
          alert('Connection test successful!');
        } else {
          alert('Connection test failed: ' + (response.message || 'Unknown error'));
        }
      },
      error: (err) => {
        this.testing = false;
        const errorMsg = err?.error?.error?.message || err?.error?.error || err?.message || 'Connection test failed';
        alert('Connection test failed: ' + errorMsg);
      }
    });
  }

  private prepareFormValue(formValue: any): any {
    const result: any = { ...formValue };
    if (!this.isNew) {
      if (!formValue.password) delete result.password;
      if (!result.username) result.username = this.loadedUsername;
    }
    delete result.id;
    delete result.connectionType;
    return result;
  }
}
