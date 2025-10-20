import { useState, useEffect } from 'react';

interface ActivityData {
  date: string;
  count: number;
  level: number;
}

interface ActivityHeatmapResponse {
  data: ActivityData[];
  total_activities: number;
  active_days: number;
  average_per_week: number;
}

export const useActivityHeatmap = () => {
  const [data, setData] = useState<ActivityHeatmapResponse>({
    data: [],
    total_activities: 0,
    active_days: 0,
    average_per_week: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivityHeatmap = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL ?? '/api').replace(/\/+$/, '');
        
        const response = await fetch(`${baseUrl}/activity_heatmap/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth.token')}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch activity heatmap: ${response.statusText}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err: any) {
        console.error('Error fetching activity heatmap:', err);
        setError(err.message || 'Failed to fetch activity heatmap data');
        
        // Generate mock data for development
        const mockData = generateMockData();
        setData(mockData);
      } finally {
        setLoading(false);
      }
    };

    fetchActivityHeatmap();
  }, []);

  return { data, loading, error };
};

// Generate mock data for development/demo purposes
const generateMockData = (): ActivityHeatmapResponse => {
  const data: ActivityData[] = [];
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);
  
  // Generate random activity data for the last year
  for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    
    // Generate realistic activity patterns
    let count = 0;
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Higher activity on weekdays
    if (!isWeekend) {
      // Random activity with some patterns
      const random = Math.random();
      if (random < 0.1) count = 0; // 10% no activity
      else if (random < 0.3) count = Math.floor(Math.random() * 5) + 1; // 20% low activity
      else if (random < 0.7) count = Math.floor(Math.random() * 10) + 5; // 40% medium activity
      else if (random < 0.9) count = Math.floor(Math.random() * 15) + 10; // 20% high activity
      else count = Math.floor(Math.random() * 20) + 15; // 10% very high activity
    } else {
      // Lower activity on weekends
      const random = Math.random();
      if (random < 0.4) count = 0; // 40% no activity on weekends
      else if (random < 0.8) count = Math.floor(Math.random() * 3) + 1; // 40% low activity
      else count = Math.floor(Math.random() * 8) + 3; // 20% medium activity
    }
    
    // Add some seasonal patterns (more activity in certain months)
    const month = d.getMonth();
    if (month >= 2 && month <= 5) { // Spring months
      count = Math.floor(count * 1.2);
    } else if (month >= 8 && month <= 10) { // Fall months
      count = Math.floor(count * 1.1);
    }
    
    // Add some recent activity boost (last 30 days)
    const daysDiff = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 30) {
      count = Math.floor(count * 1.3);
    }
    
    data.push({
      date: dateStr,
      count: count,
      level: 0 // Will be calculated by the component
    });
  }
  
  const total_activities = data.reduce((sum, day) => sum + day.count, 0);
  const active_days = data.filter(day => day.count > 0).length;
  const average_per_week = Math.round(total_activities / 52);
  
  return {
    data,
    total_activities,
    active_days,
    average_per_week
  };
};
