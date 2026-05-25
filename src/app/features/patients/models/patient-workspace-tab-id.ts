/** BroadBill patient workspace tab identifiers (URL segment + state key). */
export type PatientWorkspaceTabId =
  | 'overview'
  | 'claims'
  | 'payments'
  | 'insurance'
  | 'statements'
  | 'era'
  | 'documents'
  | 'notes'
  | 'tasks'
  | 'audit';

/** MVP workspace tabs only (lookup → details replacement scope). */
export const PATIENT_WORKSPACE_MVP_TABS: ReadonlyArray<{
  id: PatientWorkspaceTabId;
  label: string;
  lazy: boolean;
}> = [
  { id: 'overview', label: 'Overview', lazy: false },
  { id: 'claims', label: 'Claims', lazy: true },
  { id: 'payments', label: 'Payments', lazy: true }
];

export const PATIENT_WORKSPACE_TABS = PATIENT_WORKSPACE_MVP_TABS;

export const DEFAULT_PATIENT_WORKSPACE_TAB: PatientWorkspaceTabId = 'overview';

const MVP_TAB_IDS = new Set<string>(PATIENT_WORKSPACE_MVP_TABS.map((t) => t.id));

export function isPatientWorkspaceTabId(value: string | null | undefined): value is PatientWorkspaceTabId {
  return !!value && MVP_TAB_IDS.has(value);
}
