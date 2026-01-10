'use client';

import React, { useState } from 'react';
import { Button } from '../atoms/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface VehiclePhotoGalleryProps {
  images: string[];
}

export const VehiclePhotoGallery: React.FC<VehiclePhotoGalleryProps> = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return null;
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const goToImage = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className="flex flex-col gap-6 rounded-xl border overflow-hidden bg-[#1a1d29] border-gray-700/50">
      <div className="relative aspect-[4/3] bg-gray-900">
        <img
          src={images[currentIndex]}
          alt={`Vehicle photo ${currentIndex + 1}`}
          className="w-full h-full object-cover"
        />
        {images.length > 1 && (
          <>
            <Button
              onClick={goToPrevious}
              variant="ghost"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-gray-800/80 hover:bg-gray-700/80 text-white size-9 rounded-md"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              onClick={goToNext}
              variant="ghost"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-800/80 hover:bg-gray-700/80 text-white size-9 rounded-md"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 p-3 bg-[#1a1d29] overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => goToImage(index)}
              className={`flex-shrink-0 aspect-video w-20 rounded overflow-hidden border transition-all ${
                index === currentIndex
                  ? 'border-blue-500 ring-1 ring-blue-400'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <img
                src={image}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
