
'use client';

import React from 'react';
import { useListings } from '../lib/hooks/useListings';
import { PageTemplate } from '../components/templates/PageTemplate';
import { Header } from '../components/organisms/Header';
import { ListingsTable } from '../components/organisms/ListingsTable';
import { KpiGrid } from '../components/organisms/KpiGrid';
import { Listing } from '../lib/types/listing';

export const preferredRegion = ['iad1'];

export default function Page() {
  const {
    data,
    sortedRows,
    sort,
    setSort,
    loading,
    backendOk,
    rescoreVisible,
    seedBackend,
    loadFromBackend,
    notify
  } = useListings();

  const handleSort = (key: keyof Listing) => {
    setSort(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc'
    }));
  };

  return (
    <PageTemplate>
      <Header
        onLoadFromBackend={loadFromBackend}
        onSeedBackend={seedBackend}
        onRescoreVisible={rescoreVisible}
        loading={loading}
      />

      {backendOk === false && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900">
          Backend not reachable. Using in-memory demo data.
        </div>
      )}

      <ListingsTable
        listings={sortedRows}
        sort={sort}
        onSort={handleSort}
        onNotify={notify}
      />

      <KpiGrid />
    </PageTemplate>
  );
}
