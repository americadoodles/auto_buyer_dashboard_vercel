import { useMemo, useState, useEffect } from 'react';
import { Listing } from '../types/listing';
import { ApiService } from '../services/api';

interface KpiMetrics {
  averageProfitPerUnit: number;
  leadToPurchaseTime: number;
  agedInventory: number;
  totalListings: number;
  activeBuyers: number;
  conversionRate: number;
  averagePrice: number;
  totalValue: number;
  scoringRate: number;
  averageScore: number;
}

export const useKpiMetrics = () => {
  const [metrics, setMetrics] = useState<KpiMetrics>({
    averageProfitPerUnit: 0,
    leadToPurchaseTime: 0,
    agedInventory: 0,
    totalListings: 0,
    activeBuyers: 0,
    conversionRate: 0,
    averagePrice: 0,
    totalValue: 0,
    scoringRate: 0,
    averageScore: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch metrics from backend only
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await ApiService.getKpiMetrics();
        
        if (response.success) {
          setMetrics({
            averageProfitPerUnit: response.metrics.average_profit_per_unit,
            leadToPurchaseTime: response.metrics.lead_to_purchase_time,
            agedInventory: response.metrics.aged_inventory,
            totalListings: response.metrics.total_listings,
            activeBuyers: response.metrics.active_buyers,
            conversionRate: response.metrics.conversion_rate,
            averagePrice: response.metrics.average_price,
            totalValue: response.metrics.total_value,
            scoringRate: response.metrics.scoring_rate,
            averageScore: response.metrics.average_score,
          });
        } else {
          setError(response.message || 'Failed to fetch KPI metrics');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  return { metrics, loading, error };
};
