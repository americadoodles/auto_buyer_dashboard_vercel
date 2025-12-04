'use client';

import React, { useState } from 'react';
import { Button } from '../atoms/Button';
import { ChevronLeft, ChevronRight, X, Image as ImageIcon } from 'lucide-react';

interface ImageCarouselProps {
  images: string[];
  showPlaceholder?: boolean;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({ images, showPlaceholder = true }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (images.length === 0) {
    if (!showPlaceholder) return null;
    
    return (
      <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="relative h-64 md:h-96 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
          <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <ImageIcon className="h-16 w-16 mb-4" />
            <p className="text-lg font-medium text-gray-600 dark:text-gray-300">No images Available</p>
          </div>
        </div>
      </div>
    );
  }

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex === images.length - 1 ? 0 : prevIndex + 1));
  };

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? images.length - 1 : prevIndex - 1));
  };

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Main Carousel Image */}
      <div className="relative h-64 md:h-96 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
        <img
          src={images[currentIndex]}
          alt={`Vehicle image ${currentIndex + 1}`}
          className="max-h-full max-w-full object-contain"
        />
        {images.length > 1 && (
          <>
            <Button
              onClick={goToPrevious}
              variant="ghost"
            //   size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-600 bg-opacity-75 dark:bg-opacity-90 hover:bg-opacity-100 dark:hover:bg-opacity-100 rounded-full p-2 shadow-md"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              onClick={goToNext}
              variant="ghost"
            //   size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-600 bg-opacity-75 dark:bg-opacity-90 hover:bg-opacity-100 dark:hover:bg-opacity-100 rounded-full p-2 shadow-md"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 0 && (
        <div className="p-2 bg-gray-50 dark:bg-gray-700 flex flex-nowrap justify-start gap-2 overflow-x-auto border-t border-gray-200 dark:border-gray-600">
          {images.map((image, index) => (
            <img
              key={index}
              src={image}
              alt={`Thumbnail ${index + 1}`}
              className={`w-16 h-16 object-cover rounded-md cursor-pointer border-2 ${
                index === currentIndex ? 'border-blue-500 dark:border-blue-400' : 'border-transparent'
              }`}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
