'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '../atoms/Button';
import { ChevronLeft, ChevronRight, X, Image as ImageIcon } from 'lucide-react';

interface ImageCarouselProps {
  images: string[];
  showPlaceholder?: boolean;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({ images, showPlaceholder = true }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  const currentImage = useMemo(() => images[currentIndex], [images, currentIndex]);

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

  const openViewer = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setIsViewerOpen(true);
  };

  const closeViewer = () => {
    setIsViewerOpen(false);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.min(4, Math.max(1, Number((prev + delta).toFixed(2)))));
  };

  const zoomIn = () => setZoom((prev) => Math.min(4, Number((prev + 0.2).toFixed(2))));
  const zoomOut = () => setZoom((prev) => Math.max(1, Number((prev - 0.2).toFixed(2))));
  const resetZoom = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const onMouseDown = (event: React.MouseEvent) => {
    // Only allow panning when zoomed in
    if (zoom <= 1) return;
    event.preventDefault();
    setIsPanning(true);
    setStartPan({ x: event.clientX - offset.x, y: event.clientY - offset.y });
  };

  const onMouseMove = (event: React.MouseEvent) => {
    if (!isPanning) return;
    event.preventDefault();
    setOffset({
      x: event.clientX - startPan.x,
      y: event.clientY - startPan.y,
    });
  };

  const onMouseUp = () => {
    setIsPanning(false);
  };

  return (
    <>
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Main Carousel Image */}
      <div className="relative h-64 md:h-96 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
        <img
          src={currentImage}
          alt={`Vehicle image ${currentIndex + 1}`}
          className="max-h-full max-w-full object-contain cursor-zoom-in"
          onClick={openViewer}
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

    {/* Fullscreen zoomable viewer */}
    {isViewerOpen && (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col">
        <div className="flex justify-end p-4">
          <Button variant="ghost" onClick={closeViewer} className="text-white hover:text-gray-200">
            <X className="h-6 w-6" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center overflow-auto">
          <div
            className="relative"
            onWheel={handleWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            style={{ cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'zoom-in' }}
          >
            <img
              src={currentImage}
              alt={`Vehicle image zoomed ${currentIndex + 1}`}
              className="max-h-[90vh] max-w-[90vw] object-contain select-none"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                transition: isPanning ? 'none' : 'transform 80ms ease-out',
              }}
              draggable={false}
            />
          </div>
        </div>
        <div className="flex justify-center gap-3 p-4">
          <Button onClick={zoomOut} variant="secondary" className="px-3">-</Button>
          <Button onClick={resetZoom} variant="secondary" className="px-3">Reset</Button>
          <Button onClick={zoomIn} variant="secondary" className="px-3">+</Button>
        </div>
      </div>
    )}
    </>
  );
};
