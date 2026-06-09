import {
  ClaimProgramSettings,
  CompanyProgramSettings,
  InterfaceProgramSettings,
  PatientEligibilityProgramSettings,
  PatientProgramSettings,
  SendingClaimsCoreSettings,
  SendingClaimsExtendedSettings,
  SendingClaimsProgramSettings
} from './program-setup.models';

type ApiRecord = Record<string, unknown> | null | undefined;

/** Read a value from API JSON with case-insensitive key matching. Preserves empty strings. */
export function readApiValue(source: ApiRecord, ...names: string[]): unknown {
  if (!source || typeof source !== 'object') {
    return undefined;
  }
  const keys = Object.keys(source);
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(source, name)) {
      return source[name];
    }
    const match = keys.find(k => k.toLowerCase() === name.toLowerCase());
    if (match != null) {
      return source[match];
    }
  }
  return undefined;
}

export function readApiString(source: ApiRecord, ...names: string[]): string {
  const value = readApiValue(source, ...names);
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

export function readApiBoolean(source: ApiRecord, name: string, defaultValue: boolean): boolean {
  const value = readApiValue(source, name);
  if (value === null || value === undefined) {
    return defaultValue;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const s = String(value).trim().toLowerCase();
  if (!s) {
    return defaultValue;
  }
  return s === 'true' || s === '1';
}

export function readApiNumber(source: ApiRecord, name: string, defaultValue: number): number {
  const value = readApiValue(source, name);
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
}

export function readApiNullableNumber(source: ApiRecord, ...names: string[]): number | null {
  const raw = readApiString(source, ...names);
  if (!raw) {
    return null;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function readApiNullableString(source: ApiRecord, ...names: string[]): string | null {
  const raw = readApiString(source, ...names);
  return raw || null;
}

export function cloneSettings<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function hydratePatientSettings(raw: ApiRecord): PatientProgramSettings {
  const defaults: PatientProgramSettings = {
    automaticAccountNumber: true,
    nextAccountNumber: 1000,
    nextAccountPrefix: '',
    requireAccountNumbers: false,
    requireUniqueAccountNumbers: false,
    automaticPatientTemplateId: null,
    initialAcceptAssignment: true
  };
  if (!raw || typeof raw !== 'object') {
    return { ...defaults };
  }
  const merged: PatientProgramSettings = {
    ...defaults,
    automaticAccountNumber: readApiBoolean(raw, 'automaticAccountNumber', defaults.automaticAccountNumber),
    nextAccountNumber: readApiNumber(raw, 'nextAccountNumber', defaults.nextAccountNumber),
    nextAccountPrefix: readApiString(raw, 'nextAccountPrefix'),
    requireAccountNumbers: readApiBoolean(raw, 'requireAccountNumbers', defaults.requireAccountNumbers),
    requireUniqueAccountNumbers: readApiBoolean(raw, 'requireUniqueAccountNumbers', defaults.requireUniqueAccountNumbers),
    automaticPatientTemplateId: readApiNullableNumber(raw, 'automaticPatientTemplateId'),
    initialAcceptAssignment: readApiBoolean(raw, 'initialAcceptAssignment', defaults.initialAcceptAssignment)
  };
  if (merged.source === 'EDIConnection') {
    merged.source = '';
  }
  return merged;
}

export function hydrateClaimSettings(raw: ApiRecord): ClaimProgramSettings {
  const defaults: ClaimProgramSettings = {
    initialClaimStatus: 'OnHold',
    initialPlaceOfService: '11',
    initialICDIndicator: '0',
    lockClaimsAfterPrint: false,
    checkDuplicateServiceLines: true,
    validateICDLogic: true
  };
  if (!raw || typeof raw !== 'object') {
    return { ...defaults };
  }
  return {
    initialClaimStatus: readApiString(raw, 'initialClaimStatus') || defaults.initialClaimStatus,
    initialPlaceOfService: readApiString(raw, 'initialPlaceOfService') || defaults.initialPlaceOfService,
    initialICDIndicator: readApiString(raw, 'initialICDIndicator') || defaults.initialICDIndicator,
    lockClaimsAfterPrint: readApiBoolean(raw, 'lockClaimsAfterPrint', defaults.lockClaimsAfterPrint),
    checkDuplicateServiceLines: readApiBoolean(raw, 'checkDuplicateServiceLines', defaults.checkDuplicateServiceLines),
    validateICDLogic: readApiBoolean(raw, 'validateICDLogic', defaults.validateICDLogic)
  };
}

export function toClaimSavePayload(state: ClaimProgramSettings): ClaimProgramSettings {
  return {
    initialClaimStatus: state.initialClaimStatus ?? 'OnHold',
    initialPlaceOfService: state.initialPlaceOfService ?? '11',
    initialICDIndicator: state.initialICDIndicator ?? '0',
    lockClaimsAfterPrint: !!state.lockClaimsAfterPrint,
    checkDuplicateServiceLines: state.checkDuplicateServiceLines !== false,
    validateICDLogic: state.validateICDLogic !== false
  };
}

export function hydrateCompanySettings(raw: ApiRecord): CompanyProgramSettings {
  const defaults: CompanyProgramSettings = {
    companyName: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    fax: '',
    email: '',
    website: '',
    taxId: '',
    npi: ''
  };
  if (!raw || typeof raw !== 'object') {
    return { ...defaults };
  }
  return {
    companyName: readApiString(raw, 'companyName'),
    address1: readApiString(raw, 'address1'),
    address2: readApiString(raw, 'address2'),
    city: readApiString(raw, 'city'),
    state: readApiString(raw, 'state'),
    zip: readApiString(raw, 'zip'),
    phone: readApiString(raw, 'phone'),
    fax: readApiString(raw, 'fax'),
    email: readApiString(raw, 'email'),
    website: readApiString(raw, 'website'),
    taxId: readApiString(raw, 'taxId'),
    npi: readApiString(raw, 'npi')
  };
}

export function hydrateInterfaceSettings(raw: ApiRecord): InterfaceProgramSettings {
  const defaultDuplicateCheckFields = {
    serviceDate: true,
    procedureCode: true,
    productCode: true,
    modifiers: true,
    diagnosisPointer: true
  };
  const defaults: InterfaceProgramSettings = {
    duplicateCheckFields: { ...defaultDuplicateCheckFields },
    assignPatientDiagnosisCodes: true
  };
  if (!raw || typeof raw !== 'object') {
    return cloneSettings(defaults);
  }
  const duplicateRaw = readApiValue(raw, 'duplicateCheckFields');
  const duplicate =
    duplicateRaw && typeof duplicateRaw === 'object'
      ? (duplicateRaw as Record<string, unknown>)
      : {};
  return {
    duplicateCheckFields: {
      serviceDate: readApiBoolean(duplicate, 'serviceDate', defaultDuplicateCheckFields.serviceDate),
      procedureCode: readApiBoolean(duplicate, 'procedureCode', defaultDuplicateCheckFields.procedureCode),
      productCode: readApiBoolean(duplicate, 'productCode', defaultDuplicateCheckFields.productCode),
      modifiers: readApiBoolean(duplicate, 'modifiers', defaultDuplicateCheckFields.modifiers),
      diagnosisPointer: readApiBoolean(duplicate, 'diagnosisPointer', defaultDuplicateCheckFields.diagnosisPointer)
    },
    assignPatientDiagnosisCodes: readApiBoolean(raw, 'assignPatientDiagnosisCodes', true)
  };
}

export function hydrateSendingClaimsExtended(raw: ApiRecord): SendingClaimsExtendedSettings {
  const defaults: SendingClaimsExtendedSettings = {
    defaultSubmitterReceiverId: null,
    exportFormat: 'ANSI837',
    autoMarkClaimsSent: true,
    lockClaimsAfterExport: false,
    exportBatchSize: 100
  };
  if (!raw || typeof raw !== 'object') {
    return { ...defaults };
  }
  return {
    defaultSubmitterReceiverId: readApiNullableString(raw, 'defaultSubmitterReceiverId'),
    exportFormat: readApiString(raw, 'exportFormat') || defaults.exportFormat,
    autoMarkClaimsSent: readApiBoolean(raw, 'autoMarkClaimsSent', defaults.autoMarkClaimsSent),
    lockClaimsAfterExport: readApiBoolean(raw, 'lockClaimsAfterExport', defaults.lockClaimsAfterExport),
    exportBatchSize: Math.max(1, readApiNumber(raw, 'exportBatchSize', defaults.exportBatchSize))
  };
}

export function hydrateSendingClaimsSettings(
  coreRaw: ApiRecord,
  extendedRaw: ApiRecord
): SendingClaimsProgramSettings {
  const extended = hydrateSendingClaimsExtended(extendedRaw);
  const defaults: SendingClaimsCoreSettings = {
    showBillToPatientClaims: false,
    patientControlNumberMode: 'ClaimId',
    nextSubmissionNumber: 1
  };
  const core = coreRaw && typeof coreRaw === 'object' ? coreRaw : {};
  const modeRaw = readApiString(core, 'patientControlNumberMode');
  return {
    ...extended,
    showBillToPatientClaims: readApiBoolean(core, 'showBillToPatientClaims', defaults.showBillToPatientClaims),
    patientControlNumberMode: modeRaw === 'PatientAccount' ? 'PatientAccount' : 'ClaimId',
    nextSubmissionNumber: Math.max(1, readApiNumber(core, 'nextSubmissionNumber', defaults.nextSubmissionNumber))
  };
}

export function toSendingClaimsCorePayload(state: SendingClaimsProgramSettings): SendingClaimsCoreSettings {
  const nextNum = Number(state.nextSubmissionNumber);
  return {
    showBillToPatientClaims: !!state.showBillToPatientClaims,
    patientControlNumberMode: state.patientControlNumberMode === 'PatientAccount' ? 'PatientAccount' : 'ClaimId',
    nextSubmissionNumber: Number.isFinite(nextNum) && nextNum >= 1 ? Math.floor(nextNum) : 1
  };
}

export function toSendingClaimsExtendedPayload(state: SendingClaimsProgramSettings): SendingClaimsExtendedSettings {
  return {
    defaultSubmitterReceiverId: state.defaultSubmitterReceiverId ?? null,
    exportFormat: (state.exportFormat ?? 'ANSI837').toString(),
    autoMarkClaimsSent: state.autoMarkClaimsSent !== false,
    lockClaimsAfterExport: !!state.lockClaimsAfterExport,
    exportBatchSize: Math.max(1, Number(state.exportBatchSize) || 100)
  };
}

export function hydratePatientEligibilitySettings(raw: ApiRecord): PatientEligibilityProgramSettings {
  const defaults: PatientEligibilityProgramSettings = {
    receiverId: null,
    vendor: 'GenericSftp',
    providerMode: 'Billing',
    specificProviderId: null,
    username: '',
    password: '',
    server: '',
    uploadDirectory: '',
    incomingDirectory: '',
    processedDirectory: '',
    passwordConfigured: false,
    showEligibilityResponseViewer: true
  };
  if (!raw || typeof raw !== 'object') {
    return { ...defaults };
  }

  let providerMode = readApiString(raw, 'providerMode', 'ProviderMode') || defaults.providerMode;
  if (providerMode === 'PatientBillingProvider') {
    providerMode = 'Billing';
  } else if (providerMode === 'PatientRenderingProvider') {
    providerMode = 'Rendering';
  } else if (providerMode === 'SpecificProvider') {
    providerMode = 'Specific';
  }

  return {
    receiverId: readApiNullableString(raw, 'receiverId', 'ReceiverId'),
    vendor: readApiString(raw, 'source', 'vendor', 'Vendor') || defaults.vendor,
    providerMode,
    specificProviderId: readApiNullableNumber(raw, 'specificProviderId', 'SpecificProviderId'),
    username: readApiString(raw, 'username', 'Username'),
    password: '',
    server: readApiString(raw, 'server', 'Server'),
    uploadDirectory: readApiString(raw, 'uploadDirectory', 'UploadDirectory'),
    incomingDirectory: readApiString(raw, 'incomingDirectory', 'IncomingDirectory'),
    processedDirectory: readApiString(raw, 'processedDirectory', 'ProcessedDirectory'),
    passwordConfigured: readApiBoolean(raw, 'passwordConfigured', false),
    showEligibilityResponseViewer: readApiBoolean(raw, 'showEligibilityResponseViewer', true)
  };
}

export function toPatientEligibilitySavePayload(
  state: PatientEligibilityProgramSettings,
  options?: { includeDirectoryFields?: boolean }
): Record<string, unknown> {
  const pwd = (state.password ?? '').trim();
  const includeDirectoryFields = options?.includeDirectoryFields ?? true;
  const payload: Record<string, unknown> = {
    receiverId: state.receiverId,
    vendor: (state.vendor ?? 'GenericSftp').toString(),
    providerMode: state.providerMode,
    specificProviderId: state.specificProviderId,
    username: (state.username ?? '').trim(),
    server: (state.server ?? '').trim(),
    showEligibilityResponseViewer: state.showEligibilityResponseViewer !== false
  };
  if (includeDirectoryFields) {
    payload['uploadDirectory'] = (state.uploadDirectory ?? '').trim();
    payload['incomingDirectory'] = (state.incomingDirectory ?? '').trim();
    payload['processedDirectory'] = (state.processedDirectory ?? '').trim();
  }
  if (pwd) {
    payload['password'] = pwd;
  } else if (state.passwordConfigured) {
    payload['password'] = '********';
  }
  return payload;
}
