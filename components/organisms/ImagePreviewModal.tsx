import React from 'react';
import { Button } from '../atoms/Button'; // Adjust path based on actual file location
import { X } from 'lucide-react'; // Assuming lucide-react is installed and X icon is available
import { Icon } from '../atoms/Icon';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  images,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Image Preview</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Scrollable image grid */}
        <div className="p-4 overflow-y-auto flex-1">
          {images.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No images to display.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {images.map((imageUrl, index) => (
                <div
                  key={index}
                  className="relative w-full aspect-square rounded-md overflow-hidden bg-gray-100 flex items-center justify-center"
                >
                  <img
                    src={imageUrl}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to a placeholder image if the original fails to load
                      e.currentTarget.src = 'https://via.placeholder.com/150?text=Image+Error';
                      e.currentTarget.onerror = null; // Prevent infinite loop if fallback also fails
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
