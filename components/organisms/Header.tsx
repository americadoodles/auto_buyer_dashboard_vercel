import React from 'react';
import { Car, Download, Database, RefreshCw } from 'lucide-react';
import { Button } from '../atoms/Button';
import { ExportButton } from '../molecules/ExportButton';

interface HeaderProps {
  onLoadFromBackend: () => void;
  onSeedBackend: () => void;
  onRescoreVisible: () => void;
  loading: boolean;
  userRole?: string;
  buyerId?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onLoadFromBackend,
  onSeedBackend,
  onRescoreVisible,
  loading,
  userRole = 'buyer',
  buyerId
}) => {
  return (
    <header className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
            <Car className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Buyer Review Queue</h1>
            <p className="text-sm text-gray-600 mt-1">
              Ingest → Normalize → Score → Review → Notify
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <ExportButton
            exportType="listings"
            userRole={userRole}
            variant="success"
            size="sm"
            buyerId={buyerId}
          />
          
          <Button
            variant="secondary"
            size="sm"
            onClick={onLoadFromBackend}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Load from Backend</span>
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={onSeedBackend}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <Database className="w-4 h-4" />
            <span>Seed Backend</span>
          </Button>
          
          <Button
            variant="primary"
            size="sm"
            onClick={onRescoreVisible}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Re-score Visible</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
