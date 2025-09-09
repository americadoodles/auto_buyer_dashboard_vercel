import { useMemo } from 'react';
import { Listing } from '../types/listing';

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

export const useKpiMetrics = (listings: Listing[] = []) => {
  return useMemo(() => {
    if (!listings || listings.length === 0) {
      return {
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
      };
    }

    // Calculate basic metrics
    const totalListings = listings.length;
    const totalValue = listings.reduce((sum, listing) => sum + (listing.price || 0), 0);
    const averagePrice = totalValue / totalListings;

    // Calculate unique buyers
    const uniqueBuyers = new Set(listings.map(listing => listing.buyer_id)).size;

    // Calculate scoring metrics
    const scoredListings = listings.filter(listing => listing.score !== null && listing.score !== undefined);
    const scoringRate = (scoredListings.length / totalListings) * 100;
    const averageScore = scoredListings.length > 0 
      ? scoredListings.reduce((sum, listing) => sum + (listing.score || 0), 0) / scoredListings.length 
      : 0;

    // Calculate aged inventory (listings older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const agedInventory = listings.filter(listing => {
      if (!listing.created_at) return false;
      const listingDate = new Date(listing.created_at);
      return listingDate < thirtyDaysAgo;
    }).length;

    // Calculate average profit per unit (assuming 15% margin)
    const averageProfitPerUnit = averagePrice * 0.15;

    // Calculate lead to purchase time (simulated based on listing age)
    const now = new Date();
    const totalDays = listings.reduce((sum, listing) => {
      if (!listing.created_at) return sum;
      const listingDate = new Date(listing.created_at);
      const daysDiff = Math.ceil((now.getTime() - listingDate.getTime()) / (1000 * 60 * 60 * 24));
      return sum + daysDiff;
    }, 0);
    const leadToPurchaseTime = totalDays / totalListings;

    // Calculate conversion rate (simulated - listings with scores above 70 are considered "converted")
    const convertedListings = listings.filter(listing => (listing.score || 0) >= 70).length;
    const conversionRate = (convertedListings / totalListings) * 100;

    return {
      averageProfitPerUnit,
      leadToPurchaseTime,
      agedInventory,
      totalListings,
      activeBuyers: uniqueBuyers,
      conversionRate,
      averagePrice,
      totalValue,
      scoringRate,
      averageScore,
    };
  }, [listings]);
};
