/**
 * Curated registry of additional columns available for Claim List Add Column feature.
 * This is the ONLY source of truth for what columns users can add.
 * NO dynamic schema discovery. NO reflection. NO auto-exposure.
 */

export interface AdditionalColumnDefinition {
  key: string;           // Property name in ClaimListItemDto
  label: string;         // Display name in UI
  category: string;      // Grouping category
  dataType: string;      // Data type for formatting
  width?: string;        // Optional column width
  isForeignKey?: boolean; // Is this a FK reference?
  referenceField?: string; // Which field to display for FKs
}

export class ClaimListAdditionalColumns {
  /**
   * Complete list of additional columns users can add to Claim List.
   * This list is EXHAUSTIVE - if a column is not here, it cannot be added.
   */
  static readonly AVAILABLE_COLUMNS: AdditionalColumnDefinition[] = [
    // Identity & Status
    { key: 'claID', label: 'Claim ID', category: 'Identity', dataType: 'number', width: '100px' },
    { key: 'claStatus', label: 'Claim Status', category: 'Status', dataType: 'string', width: '120px' },
    { key: 'claLocked', label: 'Claim Locked', category: 'Status', dataType: 'boolean', width: '100px' },
    { key: 'claActive', label: 'Active', category: 'Status', dataType: 'boolean', width: '80px' },
    
    // Financial
    { key: 'claTotalCharge', label: 'Total Charge', category: 'Financial', dataType: 'currency', width: '120px' },
    { key: 'claTotalBalance', label: 'Total Balance', category: 'Financial', dataType: 'currency', width: '120px' },
    { key: 'claTotalInsBalance', label: 'Insurance Balance', category: 'Financial', dataType: 'currency', width: '120px' },
    { key: 'claTotalPatBalance', label: 'Patient Balance', category: 'Financial', dataType: 'currency', width: '120px' },
    { key: 'claTotalInsAmtPaid', label: 'Ins Amt Paid', category: 'Financial', dataType: 'currency', width: '120px' },
    { key: 'claTotalPatAmtPaid', label: 'Patient Amt Paid', category: 'Financial', dataType: 'currency', width: '120px' },
    { key: 'claSelfpayAfterInsurance', label: 'Selfpay After Insurance', category: 'Financial', dataType: 'currency', width: '150px' },
    { key: 'claPayerClassAllowed', label: 'Payer Class/Allowed', category: 'Financial', dataType: 'currency', width: '150px' },
    { key: 'claBankDeposits', label: 'Bank Deposits', category: 'Financial', dataType: 'currency', width: '120px' },
    
    // Dates
    { key: 'claBillDate', label: 'Bill Date', category: 'Dates', dataType: 'date', width: '110px' },
    { key: 'claFirstDOS', label: '1st DOS', category: 'Dates', dataType: 'date', width: '110px' },
    { key: 'claLastDOS', label: 'Last DOS', category: 'Dates', dataType: 'date', width: '110px' },
    { key: 'claPaidDate', label: 'Paid Date', category: 'Dates', dataType: 'date', width: '110px' },
    { key: 'claDischargeDate', label: 'Discharge Date', category: 'Dates', dataType: 'date', width: '120px' },
    { key: 'claLastExported', label: 'Last Exported', category: 'Dates', dataType: 'datetime', width: '150px' },
    { key: 'claLastPrinted', label: 'Last Printed', category: 'Dates', dataType: 'datetime', width: '150px' },
    { key: 'claCreatedTimestamp', label: 'Created Timestamp', category: 'Dates', dataType: 'datetime', width: '150px' },
    { key: 'claModifiedTimestamp', label: 'Modified Timestamp', category: 'Dates', dataType: 'datetime', width: '150px' },
    { key: 'claBillDateAging', label: 'Bill Date Aging', category: 'Dates', dataType: 'number', width: '120px' },
    { key: 'claBillDateAgingBucket', label: 'Bill Date Aging Bucket', category: 'Dates', dataType: 'string', width: '150px' },
    
    // Patient Information
    { key: 'patID', label: 'Patient ID', category: 'Patient', dataType: 'number', width: '100px' },
    { key: 'patAccountNo', label: 'Account #', category: 'Patient', dataType: 'string', width: '120px' },
    { key: 'patLastName', label: 'Last Name', category: 'Patient', dataType: 'string', width: '150px' },
    { key: 'patFirstName', label: 'First Name', category: 'Patient', dataType: 'string', width: '150px' },
    { key: 'patFullName', label: 'Name', category: 'Patient', dataType: 'string', width: '200px' },
    { key: 'patDOB', label: 'DOB', category: 'Patient', dataType: 'date', width: '110px' },
    { key: 'patClassification', label: 'Pat Classification', category: 'Patient', dataType: 'string', width: '150px' },
    { key: 'claPatientStatus', label: 'Patient Status', category: 'Patient', dataType: 'string', width: '120px' },
    
    // Clinical / Diagnosis
    { key: 'claDiagnosis1', label: 'Diag 1', category: 'Clinical', dataType: 'string', width: '100px' },
    { key: 'claDiagnosis2', label: 'Diag 2', category: 'Clinical', dataType: 'string', width: '100px' },
    { key: 'claDiagnosis3', label: 'Diag 3', category: 'Clinical', dataType: 'string', width: '100px' },
    { key: 'claDiagnosis4', label: 'Diag 4', category: 'Clinical', dataType: 'string', width: '100px' },
    { key: 'claDiagnosis5', label: 'Diag 5', category: 'Clinical', dataType: 'string', width: '100px' },
    { key: 'claDiagnosis6', label: 'Diag 6', category: 'Clinical', dataType: 'string', width: '100px' },
    { key: 'claDiagnosis7', label: 'Diag 7', category: 'Clinical', dataType: 'string', width: '100px' },
    { key: 'claDiagnosis8', label: 'Diag 8', category: 'Clinical', dataType: 'string', width: '100px' },
    { key: 'claDiagnosis9', label: 'Diag 9', category: 'Clinical', dataType: 'string', width: '100px' },
    { key: 'claDiagnosis10', label: 'Diag 10', category: 'Clinical', dataType: 'string', width: '100px' },
    { key: 'claDiagnosis11', label: 'Diag 11', category: 'Clinical', dataType: 'string', width: '100px' },
    { key: 'claDiagnosis12', label: 'Diag 12', category: 'Clinical', dataType: 'string', width: '100px' },
    { key: 'claPrincipalProcedureCode', label: 'Principal Procedure Code', category: 'Clinical', dataType: 'string', width: '180px' },
    { key: 'claAdmittingDiagnosis', label: 'Admitting Diagnosis', category: 'Clinical', dataType: 'string', width: '180px' },
    { key: 'claPatientReason1', label: 'Patient Reason 1', category: 'Clinical', dataType: 'string', width: '150px' },
    { key: 'claPatientReason2', label: 'Patient Reason 2', category: 'Clinical', dataType: 'string', width: '150px' },
    { key: 'claPatientReason3', label: 'Patient Reason 3', category: 'Clinical', dataType: 'string', width: '150px' },
    { key: 'claPOAIndicator', label: 'POA Indicator', category: 'Clinical', dataType: 'string', width: '120px' },
    
    // Billing
    { key: 'claTypeOfBill', label: 'Type of Bill', category: 'Billing', dataType: 'string', width: '120px' },
    { key: 'claBillTo', label: 'Bill To', category: 'Billing', dataType: 'string', width: '150px' },
    { key: 'claBillToSequence', label: 'Bill To Sequence', category: 'Billing', dataType: 'number', width: '130px' },
    { key: 'claBillToPayerClass', label: 'Bill To Payer Class', category: 'Billing', dataType: 'string', width: '150px' },
    { key: 'claBillToAuthNo', label: 'Bill To Auth #', category: 'Billing', dataType: 'string', width: '130px' },
    { key: 'claInvoiceNumber', label: 'Invoice #', category: 'Billing', dataType: 'string', width: '120px' },
    { key: 'claSubmissionMethod', label: 'Method', category: 'Billing', dataType: 'string', width: '120px' },
    { key: 'claStatementFromOverride', label: 'Statement From Override', category: 'Billing', dataType: 'date', width: '180px' },
    { key: 'claStatementToOverride', label: 'Statement To Override', category: 'Billing', dataType: 'date', width: '180px' },
    
    // Physicians (FK references)
    { key: 'attendingPhysicianName', label: 'Attending Physician', category: 'Physicians', dataType: 'string', width: '180px', isForeignKey: true, referenceField: 'PhyLastName' },
    { key: 'referringPhysicianName', label: 'Referring Physician', category: 'Physicians', dataType: 'string', width: '180px', isForeignKey: true, referenceField: 'PhyLastName' },
    { key: 'renderingPhysicianName', label: 'Rendering Physician', category: 'Physicians', dataType: 'string', width: '180px', isForeignKey: true, referenceField: 'PhyLastName' },
    { key: 'operatingPhysicianName', label: 'Operating Physician', category: 'Physicians', dataType: 'string', width: '180px', isForeignKey: true, referenceField: 'PhyLastName' },
    { key: 'orderingPhysicianName', label: 'Ordering Physician', category: 'Physicians', dataType: 'string', width: '180px', isForeignKey: true, referenceField: 'PhyLastName' },
    { key: 'billingPhysicianName', label: 'Billing Physician', category: 'Physicians', dataType: 'string', width: '180px', isForeignKey: true, referenceField: 'PhyLastName' },
    { key: 'supervisingPhysicianName', label: 'Supervising Physician', category: 'Physicians', dataType: 'string', width: '180px', isForeignKey: true, referenceField: 'PhyLastName' },
    
    // Payers
    { key: 'primaryPayerName', label: 'Primary Payer', category: 'Payers', dataType: 'string', width: '180px', isForeignKey: true, referenceField: 'PayName' },
    { key: 'secondaryPayerName', label: 'Secondary Payer', category: 'Payers', dataType: 'string', width: '180px', isForeignKey: true, referenceField: 'PayName' },
    { key: 'primaryPayerID', label: 'Primary Payer ID', category: 'Payers', dataType: 'string', width: '130px' },
    { key: 'primaryPayerPhone', label: 'Payer Phone (PRI)', category: 'Payers', dataType: 'string', width: '150px' },
    { key: 'priInsClaimFilingInd', label: 'Pri Ins Cla Filing Ind', category: 'Payers', dataType: 'string', width: '160px' },
    { key: 'secInsClaimFilingInd', label: 'Sec Ins Cla Filing Ind', category: 'Payers', dataType: 'string', width: '160px' },
    
    // Primary Insured
    { key: 'primaryInsuredID', label: "Primary Insured's ID #", category: 'Primary Insured', dataType: 'string', width: '170px' },
    { key: 'primaryInsuredName', label: "Primary Insured's Name", category: 'Primary Insured', dataType: 'string', width: '180px' },
    { key: 'primaryInsuredDOB', label: "Primary Insured's DOB", category: 'Primary Insured', dataType: 'date', width: '170px' },
    { key: 'primaryInsuredEmployer', label: "Primary Insured's Employer", category: 'Primary Insured', dataType: 'string', width: '200px' },
    { key: 'primaryInsuredPlan', label: "Primary Insured's Plan", category: 'Primary Insured', dataType: 'string', width: '180px' },
    
    // Facility - displays Claim Classification (values from Libraries → List → Claim Classification)
    { key: 'claClassification', label: 'Facility', category: 'Facility', dataType: 'string', width: '180px' },
    
    // Admission
    { key: 'claAdmissionType', label: 'Admission Type', category: 'Admission', dataType: 'string', width: '140px' },
    { key: 'claAdmissionSource', label: 'Admission Source', category: 'Admission', dataType: 'string', width: '150px' },
    { key: 'claAdmissionHour', label: 'Admission Hour', category: 'Admission', dataType: 'string', width: '130px' },
    { key: 'claDischargeHour', label: 'Discharge Hour', category: 'Admission', dataType: 'string', width: '130px' },
    { key: 'claVisitNumber', label: 'Visit#', category: 'Admission', dataType: 'string', width: '120px' },
    
    // Other
    { key: 'claRemarks', label: 'Remarks', category: 'Other', dataType: 'string', width: '200px' },
    { key: 'claOriginalRefNo', label: 'Original Ref #', category: 'Other', dataType: 'string', width: '150px' },
    { key: 'claDenialReason', label: 'Denial Reason', category: 'Other', dataType: 'string', width: '150px' },
    { key: 'claCreatedUser', label: 'Created User', category: 'Other', dataType: 'string', width: '130px' },
    { key: 'claModifiedUser', label: 'Modified User', category: 'Other', dataType: 'string', width: '130px' },
    
    // Custom Fields
    { key: 'claCustomTextValue', label: 'Custom Text Value', category: 'Custom', dataType: 'string', width: '150px' },
    { key: 'claCustomNumberValue', label: 'Custom Number Value', category: 'Custom', dataType: 'number', width: '160px' },
    { key: 'claCustomCurrencyValue', label: 'Custom Currency Value', category: 'Custom', dataType: 'currency', width: '170px' },
    { key: 'claCustomDateValue', label: 'Custom Date Value', category: 'Custom', dataType: 'date', width: '150px' },
    { key: 'claCustomTrueFalseValue', label: 'Custom True / False Value', category: 'Custom', dataType: 'boolean', width: '180px' }
  ];

  /**
   * Get all available columns
   */
  static getAllColumns(): AdditionalColumnDefinition[] {
    return this.AVAILABLE_COLUMNS;
  }

  /**
   * Get columns grouped by category
   */
  static getColumnsByCategory(): Map<string, AdditionalColumnDefinition[]> {
    const grouped = new Map<string, AdditionalColumnDefinition[]>();
    
    this.AVAILABLE_COLUMNS.forEach(col => {
      if (!grouped.has(col.category)) {
        grouped.set(col.category, []);
      }
      grouped.get(col.category)!.push(col);
    });
    
    return grouped;
  }

  /**
   * Get category order for sorting
   */
  static getCategoryOrder(): string[] {
    return [
      'Identity',
      'Status',
      'Financial',
      'Dates',
      'Patient',
      'Clinical',
      'Billing',
      'Physicians',
      'Payers',
      'Primary Insured',
      'Facility',
      'Admission',
      'Custom',
      'Other'
    ];
  }

  /**
   * Find column definition by key
   */
  static findByKey(key: string): AdditionalColumnDefinition | undefined {
    return this.AVAILABLE_COLUMNS.find(col => col.key === key);
  }

  /**
   * Check if a column key is valid
   */
  static isValidColumn(key: string): boolean {
    return this.AVAILABLE_COLUMNS.some(col => col.key === key);
  }
}
