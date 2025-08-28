import React from 'react';
import { Car } from 'lucide-react';
import { Button } from '../atoms/Button';

interface HeaderProps {
  onLoadFromBackend: () => void;
  onSeedBackend: () => void;
  onRescoreVisible: () => void;
  loading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onLoadFromBackend,
  onSeedBackend,
  onRescoreVisible,
  loading
}) => {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-slate-900 p-2 text-white shadow">
          <Car className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Buyer Review Queue</h1>
          <p className="text-sm text-slate-600">Ingest → Normalize → Score → Review → Notify</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onLoadFromBackend}
          disabled={loading}
        >
          Load from Backend
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onSeedBackend}
          disabled={loading}
        >
          Seed Backend
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onRescoreVisible}
          disabled={loading}
        >
          Re-score Visible
        </Button>
      </div>
    </header>
  );
};
