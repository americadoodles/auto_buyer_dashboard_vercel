'use client';

import React, { useState } from 'react';
import { Button } from '../atoms/Button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ImageCarouselProps {
  images: string[];
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (images.length === 0) return null;

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex === images.length - 1 ? 0 : prevIndex + 1));
  };

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? images.length - 1 : prevIndex - 1));
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-md overflow-hidden">
      {/* Main Carousel Image */}
      <div className="relative h-64 md:h-96 flex items-center justify-center bg-gray-100">
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
              className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-800 bg-white bg-opacity-75 hover:bg-opacity-100 rounded-full p-2 shadow-md"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              onClick={goToNext}
              variant="ghost"
            //   size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-800 bg-white bg-opacity-75 hover:bg-opacity-100 rounded-full p-2 shadow-md"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 0 && (
        <div className="p-2 bg-gray-50 flex flex-nowrap justify-start gap-2 overflow-x-auto border-t border-gray-200">
          {images.map((image, index) => (
            <img
              key={index}
              src={image}
              alt={`Thumbnail ${index + 1}`}
              className={`w-16 h-16 object-cover rounded-md cursor-pointer border-2 ${
                index === currentIndex ? 'border-blue-500' : 'border-transparent'
              }`}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
