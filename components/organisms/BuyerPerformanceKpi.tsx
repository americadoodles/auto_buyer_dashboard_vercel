import React from 'react';
import { TrendingUp, Target, DollarSign, Clock, Star, BarChart3, Calendar } from 'lucide-react';

interface BuyerStats {
  total_listings: number;
  scored_listings: number;
  avg_score: number;
  avg_price: number;
  first_listing: string | null;
  last_listing: string | null;
  unique_sources: number;
  scoring_rate: number;
}

interface BuyerPerformanceKpiProps {
  stats: BuyerStats;
}

export const BuyerPerformanceKpi: React.FC<BuyerPerformanceKpiProps> = ({ stats }) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoringRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const kpiCards = [
    {
      title: 'Total Listings',
      value: stats.total_listings.toLocaleString(),
      description: 'Vehicles sourced',
      icon: BarChart3,
      color: 'bg-blue-500',
      trend: null
    },
    {
      title: 'Scoring Rate',
      value: `${stats.scoring_rate.toFixed(1)}%`,
      description: 'Listings with scores',
      icon: Target,
      color: 'bg-green-500',
      trend: null,
      valueColor: getScoringRateColor(stats.scoring_rate)
    },
    {
      title: 'Average Score',
      value: stats.avg_score.toFixed(1),
      description: 'Quality rating',
      icon: Star,
      color: 'bg-yellow-500',
      trend: null,
      valueColor: getScoreColor(stats.avg_score)
    },
    {
      title: 'Average Price',
      value: formatCurrency(stats.avg_price),
      description: 'Per vehicle',
      icon: DollarSign,
      color: 'bg-purple-500',
      trend: null
    },
    {
      title: 'Unique Sources',
      value: stats.unique_sources.toString(),
      description: 'Data sources used',
      icon: TrendingUp,
      color: 'bg-indigo-500',
      trend: null
    },
    {
      title: 'First Listing',
      value: formatDate(stats.first_listing),
      description: 'Activity started',
      icon: Calendar,
      color: 'bg-gray-500',
      trend: null
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center">
          <TrendingUp className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Buyer Performance Indicators</h2>
          <p className="text-sm text-gray-600">Key metrics and statistics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${card.color}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">{card.title}</p>
                    <p className={`text-2xl font-bold ${card.valueColor || 'text-gray-900'}`}>
                      {card.value}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">{card.description}</p>
            </div>
          );
        })}
      </div>

      {/* Additional Stats Row */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-500">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700">Last Activity</p>
                <p className="text-lg font-semibold text-blue-900">
                  {formatDate(stats.last_listing)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-green-500">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">Scored Listings</p>
                <p className="text-lg font-semibold text-green-900">
                  {stats.scored_listings.toLocaleString()} / {stats.total_listings.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};