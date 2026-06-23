import {
  CoverageBadgeKind,
  EligibilityBenefitGridRow,
  EligibilityBenefitRowPayload,
  EligibilityBenefitSectionRow,
  EligibilityResponsePayload,
  EligibilityResponseViewModel,
  EligibilityStructured271Dto,
  EligibilityPresentationDto,
  EligibilityBenefitCardDto,
  EligibilityAmountLineDto,
  EligibilityVendorPresentationDto,
  EligibilityTransportView,
  BenefitEntryDto,
  PrimaryCareProviderDto,
  VendorContactDto
} from './eligibility-response.models';

/** X12 service type codes (common EB03 values). */
const SERVICE_TYPE_NAMES: Record<string, string> = {
  '1': 'Medical Care',
  '2': 'Surgical',
  '3': 'Consultation',
  '4': 'Diagnostic X-Ray',
  '5': 'Diagnostic Lab',
  '6': 'Radiation Therapy',
  '7': 'Anesthesia',
  '8': 'Surgical Assistance',
  '12': 'Durable Medical Equipment',
  '14': 'Renal Supplies',
  '23': 'Diagnostic Dental',
  '30': 'Health Benefit Plan Coverage',
  '33': 'Chiropractic',
  '35': 'Dental Care',
  '36': 'Dental Crowns',
  '37': 'Dental Accident',
  '38': 'Orthodontics',
  '39': 'Prosthodontics',
  '40': 'Oral Surgery',
  '41': 'Routine Preventive Dental',
  '42': 'Home Health Care',
  '45': 'Hospice',
  '47': 'Hospital',
  '48': 'Hospital — Inpatient',
  '50': 'Hospital — Outpatient',
  '51': 'Hospital — Emergency Accident',
  '52': 'Hospital — Emergency Medical',
  '53': 'Hospital — Ambulatory Surgical',
  '54': 'Long Term Care',
  '56': 'Medically Related Transportation',
  '57': 'Air Transportation',
  '58': 'Cabulance',
  '59': 'Licensed Ambulance',
  '60': 'General Benefits',
  '61': 'In-vitro Fertilization',
  '62': 'MRI / CT Scan',
  '65': 'Newborn Care',
  '66': 'Pathology',
  '67': 'Smoking Cessation',
  '68': 'Well Baby Care',
  '69': 'Maternity',
  '70': 'Transplants',
  '71': 'Audiology',
  '72': 'Inhalation Therapy',
  '73': 'Diagnostic Medical',
  '74': 'Private Duty Nursing',
  '75': 'Prosthetics',
  '76': 'Dialysis',
  '77': 'Otological',
  '78': 'Chemotherapy',
  '79': 'Allergy Testing',
  '80': 'Immunizations',
  '81': 'Routine Physical',
  '82': 'Family Planning',
  '83': 'Infertility',
  '84': 'Abortion',
  '85': 'AIDS',
  '86': 'Emergency Services',
  '87': 'Cancer',
  '88': 'Pharmacy',
  '89': 'Free Standing Prescription Drug',
  '90': 'Mail Order Prescription Drug',
  '91': 'Brand Name Prescription Drug',
  '92': 'Generic Prescription Drug',
  '93': 'Podiatry',
  '94': 'Dental / Orthodontia',
  '95': 'Periodontics',
  '96': 'Endodontics',
  '97': 'Anesthesiologist',
  '98': 'Professional (Physician) Visit — Office',
  '99': 'Professional (Physician) Visit — Inpatient',
  A0: 'Professional (Physician) Visit — Outpatient',
  A1: 'Professional (Physician) Visit — Nursing Home',
  A2: 'Professional (Physician) Visit — Skilled Nursing',
  A3: 'Professional (Physician) Visit — Home',
  A4: 'Psychiatric',
  A5: 'Psychiatric — Room and Board',
  A6: 'Psychotherapy',
  A7: 'Psychiatric — Inpatient',
  A8: 'Psychiatric — Outpatient',
  A9: 'Rehabilitation',
  AA: 'Rehabilitation — Room and Board',
  AB: 'Rehabilitation — Inpatient',
  AC: 'Rehabilitation — Outpatient',
  AD: 'Occupational Therapy',
  AE: 'Physical Therapy',
  AF: 'Speech Therapy',
  AG: 'Skilled Nursing Care',
  AH: 'Skilled Nursing Care — Room and Board',
  AI: 'Substance Abuse',
  AJ: 'Alcoholism',
  AK: 'Drug Addiction',
  AL: 'Vision (Optometry)',
  AM: 'Frames',
  AN: 'Routine Exam',
  AO: 'Lenses',
  AP: 'Nonmedically Necessary Physical',
  AQ: 'Experimental Drug Therapy',
  AR: 'Burn Care',
  B1: 'Burn Care',
  B2: 'Brand Name Prescription Drug — Formulary',
  B3: 'Brand Name Prescription Drug — Non-Formulary',
  BA: 'Independent Medical Evaluation',
  BB: 'Partial Hospitalization (Psychiatric)',
  BC: 'Day Care (Psychiatric)',
  BD: 'Cognitive Therapy',
  BE: 'Massage Therapy',
  BF: 'Pulmonary Rehabilitation',
  BG: 'Cardiac Rehabilitation',
  BH: 'Pediatric',
  BI: 'Nursery',
  BJ: 'Skin',
  BK: 'Orthopedic',
  BL: 'Cardiac',
  BM: 'Lymphatic',
  BN: 'Gastrointestinal',
  BP: 'Endocrine',
  BQ: 'Neurology',
  BR: 'Eye',
  BS: 'Invasive Procedures',
  BT: 'Gynecological',
  BU: 'Obstetrical',
  BV: 'Obstetrical / Gynecological',
  BW: 'Mail Order Prescription Drug — Brand Name',
  BX: 'Mail Order Prescription Drug — Generic',
  BY: 'Physician Visit — Office: Sick',
  BZ: 'Physician Visit — Office: Well',
  C1: 'Coronary Care',
  CA: 'Private Duty Nursing — Inpatient',
  CB: 'Private Duty Nursing — Home',
  CC: 'Surgical Benefits — Professional (Physician)',
  CD: 'Surgical Benefits — Facility',
  CE: 'Mental Health Provider — Inpatient',
  CF: 'Mental Health Provider — Outpatient',
  CG: 'Mental Health Facility — Inpatient',
  CH: 'Mental Health Facility — Outpatient',
  CI: 'Substance Abuse Facility — Inpatient',
  CJ: 'Substance Abuse Facility — Outpatient',
  CK: 'Screening X-Ray',
  CL: 'Screening Laboratory',
  CM: 'Mammogram (High Risk)',
  CN: 'Mammogram (Low Risk)',
  CO: 'Flu Vaccination',
  CP: 'Eyewear and Accessories',
  CQ: 'Case Management',
  DG: 'Dermatology',
  DM: 'Durable Medical Equipment Purchase',
  DS: 'Diabetic Supplies',
  GF: 'Generic Prescription Drug — Formulary',
  GN: 'Generic Prescription Drug — Non-Formulary',
  GY: 'Allergy',
  IC: 'Intensive Care',
  MH: 'Mental Health',
  NI: 'Neonatal Intensive Care',
  ON: 'Oncology',
  PT: 'Physical Therapy',
  PU: 'Pulmonary',
  RN: 'Renal',
  RT: 'Residential Psychiatric Treatment',
  TC: 'Transitional Care',
  TN: 'Transitional Nursery Care',
  UC: 'Urgent Care'
};

/** EB01 eligibility / benefit information codes. */
const BENEFIT_CODE_LABELS: Record<string, string> = {
  '1': 'Active Coverage',
  '2': 'Active — Full Risk',
  '3': 'Active — Capitated',
  '4': 'Active — Capitated (PCP)',
  '5': 'Active — Pending Investigation',
  '6': 'Inactive',
  '7': 'Inactive — Pending Update',
  '8': 'Inactive — Pending Investigation',
  A: 'Co-Insurance',
  B: 'Co-Payment',
  C: 'Deductible',
  D: 'Coverage Basis',
  E: 'Exclusions',
  F: 'Limitations',
  G: 'Out of Pocket (Stop Loss)',
  H: 'Unlimited',
  I: 'Non-Covered',
  J: 'Cost Containment',
  K: 'Reserve',
  L: 'Primary Care Provider',
  M: 'Pre-existing Condition',
  N: 'Services Restricted to Following Provider',
  O: 'Not Deemed a Medical Necessity',
  P: 'Benefit Disclaimer',
  Q: 'Second Surgical Opinion Required',
  R: 'Other or Additional Payor',
  S: 'Prior Year(s) History',
  T: 'Card(s) Reported Lost/Stolen',
  U: 'Contact Following Entity for Eligibility or Benefit Info',
  V: 'Cannot Process',
  W: 'Other Source of Data',
  X: 'Health Care Facility',
  Y: 'Spend Down',
  CB: 'Coverage Basis',
  MC: 'Managed Care Coordinator'
};

const PROCESSING_LIFECYCLE = new Set([
  'queued',
  'pending',
  'generating270',
  'uploading',
  'sent',
  'awaiting271',
  'processing271'
]);

const ERROR_LIFECYCLE = new Set(['failed', 'deadlettered', 'timedout', 'dead lettered', 'timed out']);

export function buildEligibilityResponseViewModel(
  payload: EligibilityResponsePayload | null | undefined,
  formatDate: (value: unknown) => string
): EligibilityResponseViewModel | null {
  if (!payload) return null;

  const isLoading = !!payload.isLoading;
  const pollTimedOut = !!payload.pollTimedOut;
  const lifecycle = normalize(payload.inquiryStatus);
  const lifecycleLabel = formatLifecycleLabel(payload.inquiryStatus);

  let coverageRaw = normalize(payload.status);
  let coverageKind = resolveCoverageKind(coverageRaw, lifecycle);
  let coverageLabel = resolveHeaderCoverageLabel(coverageKind, coverageRaw, lifecycle);

  if (isLoading) {
    coverageKind = 'processing';
    coverageLabel = lifecycleLabel || 'Checking';
    coverageRaw = 'checking';
  }

  const benefitRows = isLoading || isInFlightLifecycle(lifecycle) ? [] : mapBenefitRows(payload.benefits ?? []);
  const structured = payload.structured271 ?? null;
  const presentation = payload.presentation ?? null;
  const structuredBenefitRows = isLoading || isInFlightLifecycle(lifecycle) ? [] : mapStructuredBenefitRows(structured);
  const eligibilitySummary = mapEligibilitySummary(presentation, structured, payload, formatDate);
  const financialSummary = mapFinancialSummary(presentation);
  const benefitCards = isLoading || isInFlightLifecycle(lifecycle) ? [] : mapBenefitCards(presentation);
  const vendorPresentations = mapVendorPresentations(presentation);
  const additionalNotes = presentation?.additionalNotes ?? [];
  const pcp = presentation?.primaryCareProvider ?? structured?.primaryCareProvider ?? null;
  const hasPresentation = !!presentation && (!!benefitCards.length || !!presentation.summary?.displayPlanName);

  if (!isLoading && !isInFlightLifecycle(lifecycle) && lifecycle === 'completed' && !hasPresentation) {
    const derived = deriveCoverageFromBenefitRows(benefitRows, coverageRaw);
    coverageKind = derived.kind;
    coverageLabel = derived.label;
    coverageRaw = derived.raw;
  }

  const benefitsEmpty = resolveBenefitsEmptyState(
    isLoading,
    lifecycle,
    lifecycleLabel,
    benefitRows.length > 0 || structuredBenefitRows.length > 0 || benefitCards.length > 0,
    coverageKind,
    payload.errorMessage,
    payload.payerMessage,
    payload.rejectionCode,
    payload.rejectionReason
  );
  let operationalSummary = buildOperationalSummary(
    coverageKind,
    coverageLabel,
    payload,
    lifecycle,
    benefitRows,
    formatDate
  );

  if (isLoading || isInFlightLifecycle(lifecycle)) {
    operationalSummary = buildInFlightSummary(lifecycle, lifecycleLabel, pollTimedOut);
  } else if (pollTimedOut && !isTerminalLifecycle(lifecycle)) {
    operationalSummary =
      'Eligibility response is taking longer than expected. This session stopped waiting, but the inquiry may still complete on the server — close and use VIEW later, or wait and refresh.';
  }

  const providerDisplay = formatProvider(payload.providerNpi, payload.providerMode);
  const eligibilityDateRange = formatDateRange(
    formatDate(payload.eligibilityStartDate),
    formatDate(payload.eligibilityEndDate)
  );
  const insuredLine = buildInsuredLine(
    displayOrDash(payload.patientName),
    displayOrDash(payload.patientAddress)
  );
  const waitingMessage = resolveWaitingMessage(isLoading, lifecycle, pollTimedOut);
  const rejectionSummary =
    coverageKind === 'error' && !isLoading && !isInFlightLifecycle(lifecycle)
      ? formatPayerRejectionHint(
          payload.payerMessage,
          payload.errorMessage,
          payload.rejectionCode,
          payload.rejectionReason
        )
      : null;

  return {
    isLoading,
    pollTimedOut,
    waitingMessage,
    lifecycleLabel,
    coverageLabel,
    coverageKind,
    operationalSummary,
    insuredLine,
    payerName: displayOrDash(presentation?.summary?.payerName ?? payload.payerName),
    planType: displayOrDash(eligibilitySummary.displayPlanName || eligibilitySummary.planName || sanitizePlanName(payload.planName)),
    planDetails: displayOrDash(payload.planDetails),
    subscriberName: displayOrDash(payload.subscriberName),
    patientName: displayOrDash(payload.patientName),
    patientDob: displayOrDash(formatDate(payload.patientDob)),
    patientGender: displayOrDash(payload.patientGender),
    memberId: displayOrDash(payload.memberId),
    patientAddress: displayOrDash(payload.patientAddress),
    eligibilityDateRange: eligibilitySummary.coverageDates || eligibilityDateRange,
    inquiryDate: displayOrDash(formatDate(payload.createdAt)),
    providerDisplay,
    controlNumber: displayOrDash(payload.controlNumber),
    benefitRows,
    hasBenefits: benefitRows.length > 0 || structuredBenefitRows.length > 0 || benefitCards.length > 0,
    hasStructuredBenefits: structuredBenefitRows.length > 0,
    hasPresentation,
    eligibilitySummary,
    financialSummary,
    benefitCards,
    structuredBenefitRows,
    vendorContacts: structured?.vendorContacts ?? [],
    vendorPresentations,
    hasVendorContacts: vendorPresentations.length > 0,
    primaryCareProvider: pcp,
    hasPrimaryCareProvider: hasPcp(pcp),
    globalMessages: structured?.globalMessages ?? [],
    additionalNotes,
    hasAdditionalNotes: additionalNotes.length > 0,
    benefitsEmptyTitle: benefitsEmpty.title,
    benefitsEmptyHint: benefitsEmpty.hint,
    rejectionSummary,
    showPayerOverrideWarning: !!payload.usedPayerOverride,
    diagnostics: {
      lifecycleStatus: displayOrDash(payload.inquiryStatus),
      batchFileName: displayOrDash(payload.batchFileName),
      rawStatusMessage: displayOrDash(payload.errorMessage),
      payerMessage: displayOrDash(payload.payerMessage ?? payload.errorMessage),
      rejectionCode: displayOrDash(payload.rejectionCode),
      rejectionReason: displayOrDash(payload.rejectionReason),
      technicalError: classifyTechnicalError(payload.errorMessage),
      providerNpi: displayOrDash(payload.providerNpi),
      providerMode: displayOrDash(payload.providerMode),
      raw271Preview: truncateRaw271(payload.raw271),
      raw270Preview: truncateRaw271(payload.raw270),
      transport: parseTransport(payload.transportMetadataJson)
    }
  };
}

function parseTransport(json: string | null | undefined): EligibilityTransportView | null {
  if (!json?.trim()) return null;
  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  const gw = parsed?.gateway ?? {};
  const rl = parsed?.receiverLibrary ?? {};

  const receiverLibrary = [
    ['Library', rl.libraryEntryName],
    ['ISA01 AuthQualifier', rl.authorizationInfoQualifier],
    ['ISA02 AuthInfo', rl.authorizationInfo],
    ['ISA05 SenderQualifier', rl.senderQualifier],
    ['ISA06 SenderId', rl.senderId],
    ['ISA07 ReceiverQualifier', rl.receiverQualifier],
    ['ISA08 InterchangeReceiverId', rl.interchangeReceiverId],
    ['ISA15 TestProd', rl.testProdIndicator],
    ['GS SenderCode', rl.senderCode],
    ['GS ReceiverCode', rl.receiverCode],
    ['SubmitterId', rl.submitterId],
    ['ReceiverName', rl.receiverName],
    ['ReceiverId', rl.receiverId]
  ].map(([label, value]) => ({ label: String(label), value: displayOrDash(value == null ? '' : String(value)) }));

  return {
    capturedAt: displayOrDash(parsed?.capturedAtUtc),
    userId: displayOrDash(parsed?.userId),
    gatewayUrl: displayOrDash(gw.url),
    httpMethod: displayOrDash(gw.httpMethod),
    httpStatus: gw.httpStatusCode == null ? '—' : String(gw.httpStatusCode),
    requestedAt: displayOrDash(gw.requestedAtUtc),
    respondedAt: displayOrDash(gw.respondedAtUtc),
    durationMs: gw.durationMs == null ? '—' : `${Math.round(Number(gw.durationMs))} ms`,
    httpRequestBody: truncateRaw271(gw.requestBody),
    httpResponseBody: truncateRaw271(gw.responseBody),
    receiverLibrary
  };
}

export function mapBenefitRows(benefits: EligibilityBenefitRowPayload[]): EligibilityBenefitGridRow[] {
  const rows: EligibilityBenefitGridRow[] = [];
  const seen = new Set<string>();

  for (const b of benefits) {
    const row = mapSingleBenefitRow(b);
    if (!row) continue;
    const key = `${row.serviceType}|${row.coverage}|${row.amount}|${row.description}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(row);
  }

  return rows.sort((a, b) => a.serviceType.localeCompare(b.serviceType));
}

function mapSingleBenefitRow(b: EligibilityBenefitRowPayload): EligibilityBenefitGridRow | null {
  const benefitCode = (b.benefit ?? '').trim();
  const rawService = (b.serviceType ?? '').trim();
  const description = (b.description ?? '').trim();

  if (isMisplacedEb01Row(benefitCode, rawService, description)) {
    return null;
  }

  const serviceType = resolveServiceTypeLabel(rawService, benefitCode, description);
  const coverage = resolveBenefitCoverageLabel(benefitCode, rawService);
  const coverageKind = resolveCoverageKindFromBenefit(benefitCode, rawService);
  const amount = formatBenefitAmount(b.amount);
  const friendlyDescription = resolveBenefitDescription(benefitCode, description);

  if (!serviceType && !coverage && !amount && !friendlyDescription) {
    return null;
  }

  return {
    serviceType: serviceType || 'General',
    coverage: coverage || '—',
    amount: amount || '—',
    description: friendlyDescription || '—',
    coverageKind
  };
}

function resolveServiceTypeLabel(
  rawService: string,
  benefitCode: string,
  description: string
): string {
  if (isCorruptServiceType(rawService)) {
    const tokens = splitServiceTypeTokens(rawService);
    for (const token of tokens) {
      const mapped = lookupServiceTypeCode(token);
      if (mapped) return mapped;
    }
    return 'Unknown';
  }

  const code = rawService.toUpperCase();
  const fromService = lookupServiceTypeCode(code);
  if (fromService) return fromService;

  const fromBenefit = lookupServiceTypeCode(benefitCode.toUpperCase());
  if (fromBenefit) return fromBenefit;

  if (rawService && !/^[16]$/.test(rawService) && rawService.length > 2 && !isCorruptServiceType(rawService)) {
    return titleCaseWords(rawService);
  }

  if (description) {
    const fromDesc = inferServiceFromDescription(description);
    if (fromDesc) return fromDesc;
  }

  return 'Unknown';
}

function isCorruptServiceType(value: string | null | undefined): boolean {
  const text = (value ?? '').trim();
  if (!text) return false;
  return /[{}~*>]/.test(text);
}

function splitServiceTypeTokens(raw: string): string[] {
  return raw
    .split(/[{}~*>^:,]+/)
    .map(token => token.trim())
    .filter(Boolean);
}

function lookupServiceTypeCode(code: string): string | null {
  const normalized = (code ?? '').trim().toUpperCase();
  if (!normalized) return null;
  return SERVICE_TYPE_NAMES[normalized] ?? null;
}

function inferServiceFromDescription(description: string): string | null {
  const d = description.toLowerCase();
  if (d.includes('physical therapy') || d === 'pt') return 'Physical Therapy';
  if (d.includes('mental health') || d.includes('psychiatric')) return 'Mental Health';
  if (d.includes('vision') || d.includes('optometry')) return 'Vision (Optometry)';
  if (d.includes('emergency') || d.includes(' er ')) return 'Emergency Services';
  if (d.includes('deductible')) return 'Health Benefit Plan Coverage';
  if (d.includes('copay') || d.includes('co-pay')) return 'Professional (Physician) Visit — Office';
  if (d.includes('specialist')) return 'Professional (Physician) Visit — Office';
  return null;
}

function mapStructuredBenefitRows(structured: EligibilityStructured271Dto | null): EligibilityBenefitSectionRow[] {
  if (!structured?.benefits?.length) return [];

  return structured.benefits
    .map((b): EligibilityBenefitSectionRow => ({
      serviceType: displayOrDash(resolveStructuredServiceType(b)),
      status: displayOrDash(b.status),
      network: displayOrDash(b.network),
      copay: formatNullableCurrency(b.copay),
      authorizationRequired: formatAuthorization(b.authorizationRequired),
      notes: formatBenefitNotes(b),
      deductible: formatNullableCurrency(b.deductible),
      outOfPocket: formatNullableCurrency(b.outOfPocket),
      timePeriod: displayOrDash(b.timePeriod),
      placeOfService: displayOrDash(b.placeOfService)
    }))
    .filter(row => row.serviceType !== '—' || row.status !== '—');
}

function resolveStructuredServiceType(benefit: BenefitEntryDto): string {
  const rawCode = (benefit.serviceTypeCode ?? benefit.serviceType ?? '').trim();
  if (isCorruptServiceType(rawCode)) {
    const tokens = splitServiceTypeTokens(rawCode);
    for (const token of tokens) {
      const mapped = lookupServiceTypeCode(token);
      if (mapped) return mapped;
    }
    return 'Unknown';
  }

  const mapped = lookupServiceTypeCode(rawCode.toUpperCase());
  if (mapped) return mapped;

  const label = (benefit.serviceType ?? '').trim();
  if (label && !isCorruptServiceType(label) && label.length > 3) {
    return label;
  }

  return 'Unknown';
}

function mapBenefitCards(presentation: EligibilityPresentationDto | null): EligibilityBenefitCardDto[] {
  return (presentation?.benefitCards ?? []).filter(card => !!card?.title);
}

function mapFinancialSummary(presentation: EligibilityPresentationDto | null): EligibilityResponseViewModel['financialSummary'] {
  const deductibles = presentation?.financialSummary?.deductibles ?? [];
  const outOfPocket = presentation?.financialSummary?.outOfPocket ?? [];
  return {
    deductibles,
    outOfPocket,
    hasFinancialData: deductibles.length > 0 || outOfPocket.length > 0
  };
}

function mapVendorPresentations(presentation: EligibilityPresentationDto | null): EligibilityVendorPresentationDto[] {
  return presentation?.vendorContacts ?? [];
}

function mapEligibilitySummary(
  presentation: EligibilityPresentationDto | null,
  structured: EligibilityStructured271Dto | null,
  payload: EligibilityResponsePayload,
  formatDate: (value: unknown) => string
): EligibilityResponseViewModel['eligibilitySummary'] {
  const summary = presentation?.summary ?? null;
  const structuredSummary = structured?.summary;
  const coverageDates =
    summary?.coverageDates ||
    formatEligibilityDateRange(structuredSummary?.coveragePeriod) ||
    formatEligibilityDateRange(
      buildRawDateRange(
        structuredSummary?.eligibilityStartDate ?? payload.eligibilityStartDate,
        structuredSummary?.eligibilityEndDate ?? payload.eligibilityEndDate
      )
    ) ||
    formatDateRange(
      formatDate(structuredSummary?.eligibilityStartDate ?? payload.eligibilityStartDate),
      formatDate(structuredSummary?.eligibilityEndDate ?? payload.eligibilityEndDate)
    );

  const displayPlanName =
    summary?.displayPlanName ||
    sanitizePlanName(structuredSummary?.planName ?? payload.planName) ||
    '';

  return {
    coverageStatus: displayOrDash(summary?.coverageStatus ?? structuredSummary?.coverageStatus ?? payload.status),
    planName: displayOrDash(sanitizePlanName(payload.planName ?? structuredSummary?.planName)),
    displayPlanName: displayOrDash(displayPlanName),
    groupName: displayOrDash(summary?.groupName ?? structuredSummary?.groupName),
    insuranceType: displayOrDash(summary?.insuranceType ?? structuredSummary?.insuranceType),
    coverageDates: coverageDates === '—' ? '—' : coverageDates,
    planSponsor: displayOrDash(summary?.planSponsor ?? structuredSummary?.planSponsor),
    groupNumber: displayOrDash(summary?.groupNumber ?? structuredSummary?.groupNumber)
  };
}

export function formatEligibilityDateRange(raw: string | null | undefined): string {
  if (!raw?.trim()) return '';

  const trimmed = raw.trim();
  if (trimmed.includes(' - ') || trimmed.includes(' – ')) {
    const parts = trimmed
      .split(/\s[-–]\s/)
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => formatEligibilityDateRange(part))
      .filter(Boolean);

    const unique = [...new Set(parts)];
    if (unique.length === 1) return unique[0];
    if (unique.length > 1) return `${unique[0]} - ${unique[unique.length - 1]}`;
  }

  if (trimmed.includes('/') && !/^\d{8}/.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.includes('-') && !trimmed.includes('/')) {
    const pieces = trimmed.split('-').map(p => p.trim()).filter(Boolean);
    if (pieces.length === 2 && pieces.every(p => /^\d{8}$/.test(p))) {
      return `${formatCompactDate(pieces[0])} - ${formatCompactDate(pieces[1])}`;
    }
  }

  if (/^\d{8}$/.test(trimmed)) {
    return formatCompactDate(trimmed);
  }

  return trimmed;
}

function buildRawDateRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return '';
  if (!end) return start ?? '';
  if (!start) return end ?? '';
  return `${start}-${end}`;
}

function formatCompactDate(raw: string): string {
  if (!/^\d{8}$/.test(raw)) return raw;
  const yyyy = raw.slice(0, 4);
  const mm = raw.slice(4, 6);
  const dd = raw.slice(6, 8);
  return `${mm}/${dd}/${yyyy}`;
}

function formatBenefitNotes(benefit: BenefitEntryDto): string {
  const parts = [...(benefit.messages ?? [])];
  if (benefit.planDescription?.trim()) {
    parts.unshift(benefit.planDescription.trim());
  }
  return parts.length ? parts.join(' · ') : '—';
}

function formatAuthorization(value: boolean | null | undefined): string {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return '—';
}

function formatNullableCurrency(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function hasPcp(pcp: PrimaryCareProviderDto | null | undefined): boolean {
  if (!pcp) return false;
  return !!(pcp.name?.trim() || pcp.npi?.trim() || pcp.phone?.trim() || pcp.address1?.trim());
}

function formatPcpAddress(pcp: PrimaryCareProviderDto): string {
  const line1 = pcp.address1?.trim();
  const cityLine = [pcp.city, pcp.state, pcp.zip].filter(Boolean).join(', ');
  if (line1 && cityLine) return `${line1}, ${cityLine}`;
  return line1 || cityLine || '—';
}

export function formatPcpAddressLine(pcp: PrimaryCareProviderDto | null | undefined): string {
  if (!pcp) return '—';
  return formatPcpAddress(pcp);
}

export function formatVendorLine(vendor: VendorContactDto): string {
  const label = vendor.serviceType || vendor.entityRole || 'Vendor';
  const name = vendor.vendorName?.trim() || '—';
  const phone = vendor.phoneNumber?.trim();
  return phone ? `${label}: ${name} (${phone})` : `${label}: ${name}`;
}

function resolveBenefitCoverageLabel(benefitCode: string, rawService: string): string {
  const code = (benefitCode || rawService).trim().toUpperCase();
  if (code === '1' || code === 'A' || code === 'ACTIVE') return 'Active';
  if (code === '6' || code === 'I' || code === 'INACTIVE') return 'Inactive';
  if (code === '2' || code === '3' || code === '4' || code === '5') return 'Active';
  if (code === '7' || code === '8') return 'Inactive';
  if (BENEFIT_CODE_LABELS[code]) return BENEFIT_CODE_LABELS[code];
  return benefitCode ? titleCaseWords(benefitCode) : '—';
}

function resolveBenefitDescription(benefitCode: string, description: string): string {
  if (description) return titleCaseWords(description);
  const code = benefitCode.trim().toUpperCase();
  return BENEFIT_CODE_LABELS[code] ?? (benefitCode ? titleCaseWords(benefitCode) : '');
}

function resolveCoverageKind(
  coverageRaw: string,
  lifecycle: string
): CoverageBadgeKind {
  if (ERROR_LIFECYCLE.has(lifecycle)) return 'error';
  if (PROCESSING_LIFECYCLE.has(lifecycle)) return 'processing';

  const c = coverageRaw.toLowerCase();
  if (c.includes('rejected') || c.includes('denied')) return 'error';
  if (c.includes('active') && !c.includes('inactive')) return 'active';
  if (c.includes('inactive') || c.includes('terminated')) return 'inactive';
  if (c.includes('partial') || c.includes('limited') || c.includes('unknown')) return 'partial';
  if (c.includes('error') || c.includes('fail')) return 'error';
  if (lifecycle === 'completed' && !c) return 'partial';
  return 'partial';
}

function resolveCoverageKindFromBenefit(benefitCode: string, rawService: string): CoverageBadgeKind {
  const code = (benefitCode || rawService).trim();
  if (code === '1' || code === '2' || code === '3' || code === '4' || code === '5') return 'active';
  if (code === '6' || code === '7' || code === '8') return 'inactive';
  if (/^[ABC]$/i.test(code)) return 'partial';
  return 'partial';
}

function deriveCoverageFromBenefitRows(
  rows: EligibilityBenefitGridRow[],
  coverageRaw: string
): { kind: CoverageBadgeKind; label: string; raw: string } {
  const raw = coverageRaw.toLowerCase();
  if (raw.includes('rejected') || raw.includes('denied')) {
    return { kind: 'error', label: 'Rejected', raw: 'rejected' };
  }
  if (raw.includes('fail')) {
    return { kind: 'error', label: 'Error', raw: 'error' };
  }
  if (raw.includes('active') && !raw.includes('inactive')) {
    return { kind: 'active', label: 'Active', raw: 'active' };
  }
  if (raw.includes('inactive')) {
    return { kind: 'inactive', label: 'Inactive', raw: 'inactive' };
  }

  const hasActiveCoverage = rows.some(
    r =>
      r.coverageKind === 'active' ||
      r.serviceType.toLowerCase().includes('health benefit') ||
      (r.description?.toLowerCase().includes('active') ?? false)
  );
  if (hasActiveCoverage) {
    return { kind: 'active', label: 'Active', raw: 'active' };
  }

  const hasInactive = rows.some(r => r.coverageKind === 'inactive');
  if (hasInactive) {
    return { kind: 'inactive', label: 'Inactive', raw: 'inactive' };
  }

  return { kind: 'partial', label: 'Unknown', raw: 'unknown' };
}

function resolveHeaderCoverageLabel(
  kind: CoverageBadgeKind,
  coverageRaw: string,
  lifecycle: string
): string {
  if (kind === 'processing') {
    return lifecycle ? titleCaseWords(lifecycle) : 'Processing';
  }
  if (kind === 'error') {
    if (ERROR_LIFECYCLE.has(lifecycle)) return titleCaseWords(lifecycle);
    return coverageRaw ? titleCaseWords(coverageRaw) : 'Error';
  }
  if (coverageRaw) return titleCaseWords(coverageRaw);
  if (kind === 'active') return 'Active';
  if (kind === 'inactive') return 'Inactive';
  return 'Unknown';
}

function isTerminalLifecycle(lifecycle: string): boolean {
  return (
    lifecycle === 'completed' ||
    lifecycle === 'failed' ||
    lifecycle === 'timedout' ||
    lifecycle === 'deadlettered'
  );
}

function formatLifecycleLabel(raw: string | null | undefined): string {
  if (!raw?.trim()) return 'Queued';
  const normalized = raw.trim();
  const explicit: Record<string, string> = {
    Queued: 'Queued',
    Generating270: 'Generating 270',
    Uploading: 'Uploading',
    Sent: 'Sent',
    Awaiting271: 'Awaiting 271',
    Processing271: 'Processing Response',
    Completed: 'Completed',
    Failed: 'Failed',
    TimedOut: 'Timed Out',
    DeadLettered: 'Failed'
  };
  if (explicit[normalized]) return explicit[normalized];
  return titleCaseWords(normalized.replace(/([a-z])([A-Z])/g, '$1 $2'));
}

function isInFlightLifecycle(lifecycle: string): boolean {
  return PROCESSING_LIFECYCLE.has(lifecycle);
}

function resolveBenefitsEmptyState(
  isLoading: boolean,
  lifecycle: string,
  lifecycleLabel: string,
  hasBenefitRows: boolean,
  coverageKind: CoverageBadgeKind = 'partial',
  errorMessage?: string | null,
  payerMessage?: string | null,
  rejectionCode?: string | null,
  rejectionReason?: string | null
): { title: string; hint: string | null } {
  if (hasBenefitRows) {
    return { title: '', hint: null };
  }

  if (isLoading || isInFlightLifecycle(lifecycle)) {
    return { title: '', hint: null };
  }

  if (lifecycle === 'completed') {
    if (coverageKind === 'error') {
      const hint = formatPayerRejectionHint(payerMessage, errorMessage, rejectionCode, rejectionReason);
      return {
        title: 'No benefit details returned.',
        hint: hint ?? 'The payer rejected or could not process this eligibility inquiry.'
      };
    }
    return {
      title: 'No benefit details returned.',
      hint: null
    };
  }

  return {
    title: 'Benefit details not available.',
    hint: null
  };
}

function resolveWaitingMessage(
  isLoading: boolean,
  lifecycle: string,
  pollTimedOut: boolean
): string | null {
  if (!isLoading && !isInFlightLifecycle(lifecycle)) {
    return null;
  }
  if (pollTimedOut && (lifecycle === 'awaiting271' || lifecycle === 'sent')) {
    return 'Waiting for payer response...';
  }
  if (lifecycle === 'processing271') {
    return 'Processing payer response...';
  }
  if (lifecycle === 'awaiting271' || lifecycle === 'sent') {
    return 'Waiting for payer response...';
  }
  if (isLoading || isInFlightLifecycle(lifecycle)) {
    return 'Checking eligibility...';
  }
  return null;
}

function buildInsuredLine(patientName: string, patientAddress: string): string {
  if (patientName === '—') {
    return patientAddress !== '—' ? patientAddress : '—';
  }
  if (patientAddress === '—') {
    return patientName;
  }
  return `${patientName}, ${patientAddress}`;
}

function buildInFlightSummary(
  lifecycle: string,
  lifecycleLabel: string,
  pollTimedOut: boolean
): string {
  if (pollTimedOut) {
    return 'Eligibility response is taking longer than expected. The inquiry may still complete on the server — close and use VIEW later, or wait for the next update.';
  }

  if (lifecycle === 'awaiting271' || lifecycle === 'sent') {
    return 'Waiting for eligibility response from the payer. The 270 request was sent successfully; benefit details will appear when the 271 is received.';
  }

  if (lifecycle === 'processing271') {
    return 'Processing eligibility response from the payer…';
  }

  const step = lifecycleLoadingMessage(lifecycle, lifecycleLabel);
  return step
    ? `Eligibility inquiry in progress. ${step}`
    : `Eligibility inquiry in progress (${lifecycleLabel}).`;
}

function lifecycleLoadingMessage(lifecycle: string, lifecycleLabel: string): string {
  switch (lifecycle) {
    case 'queued':
      return 'Inquiry queued.';
    case 'generating270':
      return 'Building 270 request.';
    case 'uploading':
      return 'Uploading to clearinghouse.';
    case 'sent':
    case 'awaiting271':
      return 'Waiting for 271 response.';
    case 'processing271':
      return 'Processing payer response.';
    default:
      return lifecycleLabel ? `Status: ${lifecycleLabel}.` : '';
  }
}

function buildOperationalSummary(
  kind: CoverageBadgeKind,
  label: string,
  payload: EligibilityResponsePayload,
  lifecycle: string,
  rows: EligibilityBenefitGridRow[],
  formatDate: (value: unknown) => string
): string {
  const payer = payload.payerName?.trim();
  const asOf = formatDate(payload.eligibilityStartDate) || formatDate(payload.createdAt);

  if (kind === 'processing') {
    if (lifecycle === 'awaiting271' || lifecycle === 'sent') {
      return 'Waiting for eligibility response from the payer. No coverage determination has been received yet.';
    }
    if (lifecycle === 'processing271') {
      return 'Processing eligibility response from the payer…';
    }
    return `Eligibility inquiry is in progress (${titleCaseWords(payload.inquiryStatus ?? 'processing')}). Results will update when the payer response is received.`;
  }

  if (kind === 'error' || isTechnicalFailure(payload.errorMessage, lifecycle)) {
    const rejectionSummary = formatPayerRejectionHint(
      payload.payerMessage,
      payload.errorMessage,
      payload.rejectionCode,
      payload.rejectionReason
    );
    if (rejectionSummary) {
      return rejectionSummary;
    }
    return 'Eligibility could not be completed. Review the summary below or open Advanced Diagnostics for technical details.';
  }

  if (kind === 'active') {
    const plan = payload.planName?.trim();
    const parts = [
      payer ? `Member appears to have active coverage with ${payer}.` : 'Member appears to have active coverage.',
      plan && !/^active coverage$/i.test(plan) ? `Plan: ${plan}.` : null,
      asOf ? `Eligibility effective ${asOf}.` : null,
      rows.length ? `${rows.length} benefit detail row(s) returned.` : 'No detailed benefit rows were returned by the payer.'
    ].filter(Boolean);
    return parts.join(' ');
  }

  if (kind === 'inactive') {
    return payer
      ? `Coverage with ${payer} is reported as inactive or terminated${asOf ? ` as of ${asOf}` : ''}.`
      : `Coverage is reported as inactive or terminated${asOf ? ` as of ${asOf}` : ''}.`;
  }

  return `${label} coverage${payer ? ` for ${payer}` : ''}${asOf ? ` (as of ${asOf})` : ''}.`;
}

function isTechnicalFailure(errorMessage: string | null | undefined, lifecycle: string): boolean {
  if (ERROR_LIFECYCLE.has(lifecycle)) return true;
  const msg = (errorMessage ?? '').toLowerCase();
  return msg.includes('http context') ||
    msg.includes('exception') ||
    msg.includes('failed') ||
    msg.includes('timeout') ||
    msg.includes('sftp');
}

function classifyTechnicalError(errorMessage: string | null | undefined): string {
  if (!errorMessage?.trim()) return '—';
  return errorMessage.trim();
}

function formatPayerRejectionHint(
  payerMessage?: string | null,
  errorMessage?: string | null,
  rejectionCode?: string | null,
  rejectionReason?: string | null
): string | null {
  const msg = (payerMessage ?? errorMessage ?? '').trim();
  const code = (rejectionCode ?? '').trim();
  const reason = (rejectionReason ?? '').trim();

  if (!msg && !code && !reason) return null;

  const parts: string[] = [];
  if (code) parts.push(`AAA reject reason ${code}`);
  if (msg) parts.push(`MSG: ${msg}`);
  if (reason && reason !== msg && !reason.includes(msg)) parts.push(reason);

  return parts.join(' — ');
}

function formatBenefitAmount(amount: string | null | undefined): string {
  if (amount == null || amount === '') return '';
  const trimmed = String(amount).trim();
  const numeric = Number(trimmed.replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(numeric)) return trimmed;
  if (trimmed.includes('%')) return `${numeric}%`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(numeric);
}

function formatProvider(npi: string | null | undefined, mode: string | null | undefined): string {
  if (!npi?.trim()) return '—';
  const modeLabel = mode?.trim() ? ` (${titleCaseWords(mode)})` : '';
  return `${npi.trim()}${modeLabel}`;
}

function formatDateRange(start: string, end: string): string {
  if (start && end) return `${start} – ${end}`;
  return start || end || '—';
}

function truncateRaw271(raw: string | null | undefined): string {
  if (!raw?.trim()) return '—';
  const t = raw.trim();
  return t.length > 2000 ? `${t.slice(0, 2000)}…` : t;
}

function displayOrDash(value: string | null | undefined): string {
  const v = value?.trim();
  return v ? v : '—';
}

function isMisplacedEb01Row(benefitCode: string, rawService: string, description: string): boolean {
  const code = benefitCode.toUpperCase();
  const svc = rawService.toUpperCase();
  if (!code && /^[ABCG16]$/i.test(rawService)) {
    return true;
  }
  if (/^[ABCG]$/i.test(code) && (!svc || svc === code) && !description) {
    return true;
  }
  return false;
}

function sanitizePlanName(planName: string | null | undefined): string | null {
  const name = (planName ?? '').trim();
  if (!name) return null;
  if (/^active\s+coverage$/i.test(name)) return null;
  if (/^\d{4,7}-\d{2}([A-Z]{2}\d+)?$/i.test(name)) return null;
  if (/^[\d\-A-Z]+$/i.test(name) && /\d{4,}-\d{2}/.test(name) && name.length <= 20) return null;
  return name;
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function titleCaseWords(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** Sample BCBS active response for unit tests / manual QA. */
export function buildBcbsNjActiveSamplePayload(): EligibilityResponsePayload {
  return {
    payerName: 'BCBS NEW JERSEY',
    status: 'Active',
    inquiryStatus: 'Completed',
    planName: 'PPO',
    planDetails: 'Employer group coverage',
    eligibilityStartDate: '20260529',
    eligibilityEndDate: null,
    createdAt: '2026-05-29T10:00:00Z',
    controlNumber: '000000002',
    batchFileName: 'eligibility-1.270',
    patientName: 'BORGES, JULIO',
    patientDob: '1934-01-28',
    patientGender: 'Male',
    memberId: '123',
    subscriberName: 'BORGES, JULIO',
    providerNpi: '1234567899',
    providerMode: 'Billing',
    benefits: [
      { serviceType: '30', benefit: 'C', amount: '500', description: 'Annual Deductible' },
      { serviceType: '98', benefit: 'B', amount: '25', description: 'Office Copay' },
      { serviceType: 'AL', benefit: 'B', amount: '15', description: 'Vision Copay' },
      { serviceType: 'MH', benefit: 'B', amount: '40', description: 'Mental Health' },
      { serviceType: 'AE', benefit: 'B', amount: '30', description: 'Physical Therapy' },
      { serviceType: '86', benefit: 'B', amount: '150', description: 'ER Copay' },
      { serviceType: '1', benefit: '1', amount: '', description: 'Active Coverage' }
    ]
  };
}
