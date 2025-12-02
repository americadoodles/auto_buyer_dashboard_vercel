"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Users, Search } from "lucide-react";
import { Input } from "../../components/atoms/Input";
import { useAuth } from "../auth/useAuth";
import { ApiService } from "../../lib/services/api";
import { User as UserType } from "../../lib/types/user";
import Link from "next/link";

export default function BuyerActivityPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [buyers, setBuyers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Get user role from auth context
  const userRole = user?.role || "admin";
  const isAdmin = userRole?.toLowerCase() === 'admin';
  const isBuyer = userRole?.toLowerCase() === 'buyer';

  // Redirect buyers to their own activity page
  useEffect(() => {
    if (isBuyer && user?.id) {
      router.replace(`/buyer-activity/${user.id}`);
    }
  }, [isBuyer, user?.id, router]);

  // Fetch buyers list for admins
  useEffect(() => {
    const fetchBuyers = async () => {
      if (!isAdmin) return;
      
      setLoading(true);
      try {
        const usersData = await ApiService.getUsers().catch(() => []);
        // Filter to only show buyers
        const buyersList = usersData.filter(u => u.role?.toLowerCase() === 'buyer');
        setBuyers(buyersList);
      } catch (error) {
        console.error('Error fetching buyers:', error);
        setBuyers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBuyers();
  }, [isAdmin]);

  // Filter buyers based on search
  const filteredBuyers = buyers.filter((buyer) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      buyer.username?.toLowerCase().includes(searchLower) ||
      buyer.email?.toLowerCase().includes(searchLower)
    );
  });

  // Don't render if buyer (will redirect)
  if (isBuyer) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
            <Users className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Buyer Activity Monitor</h1>
            <p className="text-gray-600 mt-2">
              Select a buyer to view their activity and performance
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search buyers by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Buyers List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Buyers</h2>
          <p className="text-sm text-gray-600">
            {filteredBuyers.length} buyer{filteredBuyers.length !== 1 ? 's' : ''} found
          </p>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading buyers...</span>
            </div>
          ) : filteredBuyers.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No buyers found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBuyers.map((buyer) => (
                <Link
                  key={buyer.id}
                  href={`/buyer-activity/${buyer.id}`}
                  className="group p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                        {buyer.username}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">{buyer.email}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
