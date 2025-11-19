'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Listing } from '../../lib/types/listing';

interface VehicleInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing?: Listing;
}

export const VehicleInfoModal: React.FC<VehicleInfoModalProps> = ({
  isOpen,
  onClose,
  listing
}) => {
  // Prevent background scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatCurrency = (value?: number) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value?: number) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US').format(value);
  };

  const isValidUrl = (string?: string): boolean => {
    if (!string) return false;
    // Check if it's already a valid URL with protocol
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      // Check if it looks like a URL (contains domain-like patterns)
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
      return urlPattern.test(string);
    }
  };

  const formatUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.href;
    } catch (_) {
      // If it's not a complete URL, try to make it one
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      return `https://${url}`;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-gray-900">Vehicle Information</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!listing ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No vehicle information available</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Basic Vehicle Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <p className="text-sm text-gray-900">{listing.year || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                    <p className="text-sm text-gray-900">{listing.make || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                    <p className="text-sm text-gray-900">{listing.model || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trim</label>
                    <p className="text-sm text-gray-900">{listing.trim || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
                    <p className="text-sm text-gray-900 font-mono">{listing.vin || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Key</label>
                    <p className="text-sm text-gray-900 font-mono">{listing.vehicle_key || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Pricing & Mileage */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing & Mileage</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                    <p className="text-sm text-gray-900">{formatCurrency(listing.price)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Buy Max</label>
                    <p className="text-sm text-gray-900">{formatCurrency(listing.buyMax)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Miles</label>
                    <p className="text-sm text-gray-900">{formatNumber(listing.miles)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Score</label>
                    <p className="text-sm text-gray-900">{listing.score || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Vehicle Details */}
              {(listing.condition_rating || listing.interior_color || listing.exterior_color || 
                listing.transmission || listing.fuel_type || listing.drivetrain || 
                listing.engine_size || listing.body_style) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {listing.condition_rating && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Condition Rating</label>
                        <p className="text-sm text-gray-900">{listing.condition_rating}/10</p>
                      </div>
                    )}
                    {listing.interior_color && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Interior Color</label>
                        <p className="text-sm text-gray-900">{listing.interior_color}</p>
                      </div>
                    )}
                    {listing.exterior_color && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Exterior Color</label>
                        <p className="text-sm text-gray-900">{listing.exterior_color}</p>
                      </div>
                    )}
                    {listing.transmission && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Transmission</label>
                        <p className="text-sm text-gray-900">{listing.transmission}</p>
                      </div>
                    )}
                    {listing.fuel_type && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Type</label>
                        <p className="text-sm text-gray-900">{listing.fuel_type}</p>
                      </div>
                    )}
                    {listing.drivetrain && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Drivetrain</label>
                        <p className="text-sm text-gray-900">{listing.drivetrain}</p>
                      </div>
                    )}
                    {listing.engine_size && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Engine Size</label>
                        <p className="text-sm text-gray-900">{listing.engine_size}</p>
                      </div>
                    )}
                    {listing.body_style && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Body Style</label>
                        <p className="text-sm text-gray-900">{listing.body_style}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Listing Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Listing Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <p className="text-sm text-gray-900">{listing.location || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                    {listing.source && isValidUrl(listing.source) ? (
                      <a
                        href={formatUrl(listing.source)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 underline cursor-pointer"
                      >
                        {listing.source}
                      </a>
                    ) : (
                      <p className="text-sm text-gray-900">{listing.source || 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Days on Market</label>
                    <p className="text-sm text-gray-900">{listing.dom || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <p className="text-sm text-gray-900">{listing.status || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {listing.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{listing.notes}</p>
                </div>
              )}

              {/* Images */}
              {listing.images && listing.images.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Images</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {listing.images.map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`Vehicle image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-md"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

