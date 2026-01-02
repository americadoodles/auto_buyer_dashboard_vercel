import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services/api';

export const useAccuTradeData = (vin: string | null | undefined) => {
  const [hasData, setHasData] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const checkData = useCallback(async () => {
    if (!vin) {
      setHasData(false);
      return;
    }

    setLoading(true);
    try {
      const result = await ApiService.checkAccuTradeDataExists(vin);
      setHasData(result.exists);
    } catch (error) {
      console.error('Error checking AccuTrade data:', error);
      setHasData(false);
    } finally {
      setLoading(false);
    }
  }, [vin]);

  useEffect(() => {
    checkData();
  }, [checkData]);

  return { hasData, loading, refresh: checkData };
};
