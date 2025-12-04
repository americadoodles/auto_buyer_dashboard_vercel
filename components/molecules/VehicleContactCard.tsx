import React from 'react';

interface VehicleInfo {
  year?: number | string;
  make?: string;
  model?: string;
  trim?: string;
  vin?: string;
  mileage?: number | string;
  price_range?: string;
}

interface ContactInfo {
  first_name: string;
  last_name: string;
  company?: string;
  email?: string;
  phone?: string;
  mobile?: string;
}

interface VehicleContactCardProps {
  title?: string;
  vehicle?: VehicleInfo | null;
  contact?: ContactInfo | null;
}

export const VehicleContactCard: React.FC<VehicleContactCardProps> = ({
  title,
  vehicle,
  contact
}) => {
  if (!vehicle && !contact) {
    return null;
  }

  return (
    <div className="space-y-2">
      {title && (
        <h4 className="text-md font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">{title}</h4>
      )}
      <div className="flex flex-col gap-4">
        {/* Vehicle Information */}
        {vehicle && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
            <div className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Vehicle Information</div>
            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              {vehicle.year && (
                <div><span className="font-medium">Year:</span> {vehicle.year}</div>
              )}
              {vehicle.make && (
                <div><span className="font-medium">Make:</span> {vehicle.make}</div>
              )}
              {vehicle.model && (
                <div><span className="font-medium">Model:</span> {vehicle.model}</div>
              )}
              {vehicle.trim && (
                <div><span className="font-medium">Trim:</span> {vehicle.trim}</div>
              )}
              {vehicle.vin && (
                <div><span className="font-medium">VIN:</span> {vehicle.vin}</div>
              )}
              {vehicle.mileage && (
                <div><span className="font-medium">Mileage:</span> {vehicle.mileage}</div>
              )}
              {vehicle.price_range && (
                <div><span className="font-medium">Price Range:</span> {vehicle.price_range}</div>
              )}
              {!vehicle.year && 
               !vehicle.make && 
               !vehicle.model && (
                <div className="text-blue-600 dark:text-blue-400 italic">Vehicle requirements specified</div>
              )}
            </div>
          </div>
        )}
        
        {/* Contact Information */}
        {contact && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
            <div className="text-sm font-medium text-green-900 dark:text-green-300 mb-2">Contact Information</div>
            <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
              <div>
                <span className="font-medium">Name:</span> {contact.first_name} {contact.last_name}
              </div>
              {contact.company && (
                <div><span className="font-medium">Company:</span> {contact.company}</div>
              )}
              {contact.email && (
                <div>
                  <span className="font-medium">Email:</span>{' '}
                  <a 
                    href={`mailto:${contact.email}`}
                    className="text-green-600 dark:text-green-400 hover:underline"
                  >
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.phone && (
                <div>
                  <span className="font-medium">Phone:</span>{' '}
                  <a 
                    href={`tel:${contact.phone}`}
                    className="text-green-600 dark:text-green-400 hover:underline"
                  >
                    {contact.phone}
                  </a>
                </div>
              )}
              {contact.mobile && (
                <div>
                  <span className="font-medium">Mobile:</span>{' '}
                  <a 
                    href={`tel:${contact.mobile}`}
                    className="text-green-600 dark:text-green-400 hover:underline"
                  >
                    {contact.mobile}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

