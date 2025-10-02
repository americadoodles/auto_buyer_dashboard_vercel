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
