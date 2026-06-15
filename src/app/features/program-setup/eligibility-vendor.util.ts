function normalizeEligibilityVendor(vendor: string | null | undefined): string {
  return (vendor ?? 'GenericSftp').trim();
}

/** REST gateway vendors (Waystar / legacy ZirMed hostname). */
export function eligibilityUsesRestGateway(vendor: string | null | undefined): boolean {
  const v = normalizeEligibilityVendor(vendor);
  return v === 'Waystar' || v === 'ZirMed';
}

/** SFTP/file-drop vendors require upload/incoming/processed directories. */
export function eligibilityUsesSftpDirectories(vendor: string | null | undefined): boolean {
  return !eligibilityUsesRestGateway(vendor);
}
