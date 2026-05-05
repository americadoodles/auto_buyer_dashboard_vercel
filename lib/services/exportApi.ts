import { ExportRequest, ExportPreview, ExportType } from '../types/export';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? '/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth.token');
  if (!token) {
    throw new Error('No authentication token found. Please log in again.');
  }
  return {
    'Authorization': `Bearer ${token}`,
  };
};

export const exportApi = {
  async exportListings(request: ExportRequest): Promise<Blob> {
    const response = await fetch(`${API_BASE}/export/listings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Export failed');
    }

    return response.blob();
  },

  async exportUsers(request: ExportRequest): Promise<Blob> {
    const response = await fetch(`${API_BASE}/export/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Export failed');
    }

    return response.blob();
  },

  async previewListingsExport(
    exportType: ExportType,
    startDate?: string,
    endDate?: string,
    buyerId?: string
  ): Promise<ExportPreview> {
    const params = new URLSearchParams({
      export_type: exportType,
    });

    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (buyerId) params.append('buyer_id', buyerId);

    const response = await fetch(`${API_BASE}/export/listings/preview?${params}`, {
      headers: {
        ...getAuthHeaders(),
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Preview failed');
    }

    return response.json();
  },

  async exportDeals(params: {
    stage_id?: number;
    category_id?: number;
    assigned_to?: string;
    contact_id?: string;
    search?: string;
    is_won?: boolean;
    is_lost?: boolean;
    include_hidden?: boolean;
  } = {}): Promise<Blob> {
    const query = new URLSearchParams();
    if (params.stage_id !== undefined) query.append('stage_id', params.stage_id.toString());
    if (params.category_id !== undefined) query.append('category_id', params.category_id.toString());
    if (params.assigned_to) query.append('assigned_to', params.assigned_to);
    if (params.contact_id) query.append('contact_id', params.contact_id);
    if (params.search) query.append('search', params.search);
    if (params.is_won !== undefined) query.append('is_won', params.is_won.toString());
    if (params.is_lost !== undefined) query.append('is_lost', params.is_lost.toString());
    if (params.include_hidden !== undefined) query.append('include_hidden', params.include_hidden.toString());

    const response = await fetch(`${API_BASE}/export/deals?${query.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Export failed' }));
      throw new Error(error.detail || 'Export failed');
    }

    return response.blob();
  },

  async exportLeads(
    statusId?: number,
    sourceId?: number,
    assignedTo?: string,
    search?: string
  ): Promise<Blob> {
    const params = new URLSearchParams();
    if (statusId !== undefined) params.append('status_id', statusId.toString());
    if (sourceId !== undefined) params.append('source_id', sourceId.toString());
    if (assignedTo) params.append('assigned_to', assignedTo);
    if (search) params.append('search', search);

    const response = await fetch(`${API_BASE}/export/leads?${params}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Export failed');
    }

    return response.blob();
  },

  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
