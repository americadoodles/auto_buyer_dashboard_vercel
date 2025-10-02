export type ExportType = 'all' | 'daily' | 'range' | 'selected';

export type ExportRequest = {
  export_type: ExportType;
  start_date?: string;
  end_date?: string;
  format: string;
  buyer_id?: string;  // For exporting specific buyer's data
  selected_listing_ids?: string[];  // For selective export
};

export type ExportResponse = {
  message: string;
  download_url?: string;
  filename: string;
  record_count: number;
};

export type ExportPreview = {
  record_count: number;
  preview_data: string;
  export_type: ExportType;
  date_range: {
    start_date: string | null;
    end_date: string | null;
  };
};
