/** SFTP/file-drop vendors require upload/incoming/processed directories. */
export function eligibilityUsesSftpDirectories(vendor: string | null | undefined): boolean {
  return (vendor ?? 'GenericSftp').trim() !== 'Waystar';
}

export function eligibilityUsesRestGateway(vendor: string | null | undefined): boolean {
  return (vendor ?? '').trim() === 'Waystar';
}
