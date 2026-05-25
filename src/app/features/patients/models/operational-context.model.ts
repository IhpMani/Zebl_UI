export interface PatientContextualAction {
  id: string;
  label: string;
  tone: 'default' | 'warning' | 'danger' | 'primary';
  route?: string | null;
  queryParams?: Record<string, string | number>;
  disabled?: boolean;
}
