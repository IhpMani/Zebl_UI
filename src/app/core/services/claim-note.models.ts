export interface ClaimNoteListItem {
  claID: number;
  claDateTimeCreated: string;
  claEDINotes: string | null;
  claRemarks: string | null;
  claStatus: string | null;
  additionalColumns?: { [key: string]: any };
}

export interface ClaimNotesApiResponse {
  data: ClaimNoteListItem[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
}
