'use client';

import React, { useState } from 'react';
import { Button } from '../atoms/Button';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface VehiclePhotoGalleryProps {
  images: string[];
  className?: string;
}

export const VehiclePhotoGallery: React.FC<VehiclePhotoGalleryProps> = ({ images, className = '' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

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

  const handleViewerKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      closeViewer();
    } else if (event.key === 'ArrowLeft') {
      goToPrevious();
    } else if (event.key === 'ArrowRight') {
      goToNext();
    }
  };

  return (
    <>
      <div className={`flex flex-col h-full min-h-0 rounded-xl border overflow-hidden bg-claude-surface dark:bg-[#1a1d29] border-claude-border dark:border-coal-700/50 ${className}`.trim()}>
        {/* Fill available height to match sibling column */}
        <div className="relative flex-1 min-h-0 w-full bg-claude-sand dark:bg-coal-900">
          <img
            src={images[currentIndex]}
            alt={`Vehicle photo ${currentIndex + 1}`}
            className="absolute inset-0 w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
            onClick={openViewer}
          />
          {images.length > 1 && (
            <>
              <Button
                onClick={goToPrevious}
                variant="ghost"
                className="!absolute !left-2 !top-1/2 !-translate-y-1/2 !bg-claude-surface/90 dark:!bg-coal-850 hover:!bg-claude-sand dark:hover:!bg-coal-700 !text-black dark:!text-coal-100 !size-9 !rounded-md !z-10 !p-0"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                onClick={goToNext}
                variant="ghost"
                className="!absolute !right-2 !top-1/2 !-translate-y-1/2 !bg-claude-surface/90 dark:!bg-coal-850 hover:!bg-claude-sand dark:hover:!bg-coal-700 !text-black dark:!text-coal-100 !size-9 !rounded-md !z-10 !p-0"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
              {/* Thumbnails overlay at bottom of image */}
              <div className="absolute bottom-0 left-0 right-0 z-10 flex gap-2 p-2 overflow-x-auto overflow-y-hidden flex-nowrap w-full gallery-scrollbar bg-black/50 dark:bg-black/60 backdrop-blur-sm">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      goToImage(index);
                    }}
                    className={`flex-shrink-0 aspect-video w-16 rounded overflow-hidden border-2 transition-all ${
                      index === currentIndex
                        ? 'border-blue-400 ring-1 ring-blue-300'
                        : 'border-white/40 hover:border-white/70'
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
            </>
          )}
        </div>
      </div>

      {/* Fullscreen zoomable viewer */}
      {isViewerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col"
          onKeyDown={handleViewerKeyDown}
          tabIndex={-1}
        >
          <div className="flex justify-between items-center p-4">
            <div className="text-coal-100 text-sm">
              Image {currentIndex + 1} of {images.length}
            </div>
            <Button
              variant="ghost"
              onClick={closeViewer}
              className="text-coal-100 hover:text-coal-200 hover:bg-coal-850"
            >
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
              style={{
                cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'zoom-in',
              }}
            >
              <img
                src={images[currentIndex]}
                alt={`Vehicle photo zoomed ${currentIndex + 1}`}
                className="max-h-[80vh] max-w-[90vw] object-contain select-none"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  transition: isPanning ? 'none' : 'transform 80ms ease-out',
                }}
                draggable={false}
              />
            </div>
          </div>
          <div className="flex justify-center items-center gap-3 p-4">
            <Button
              onClick={zoomOut}
              variant="secondary"
              className="px-4 py-2 bg-claude-sand dark:bg-coal-850 hover:bg-claude-divider dark:hover:bg-coal-700 text-black dark:text-coal-100"
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
            <Button
              onClick={resetZoom}
              variant="secondary"
              className="px-4 py-2 bg-claude-sand dark:bg-coal-850 hover:bg-claude-divider dark:hover:bg-coal-700 text-black dark:text-coal-100"
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
            <Button
              onClick={zoomIn}
              variant="secondary"
              className="px-4 py-2 bg-claude-sand dark:bg-coal-850 hover:bg-claude-divider dark:hover:bg-coal-700 text-black dark:text-coal-100"
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
            {images.length > 1 && (
              <>
                <div className="w-px h-6 bg-claude-divider dark:bg-coal-600 mx-2" />
                <Button
                  onClick={goToPrevious}
                  variant="secondary"
                  className="px-4 py-2 bg-claude-sand dark:bg-coal-850 hover:bg-claude-divider dark:hover:bg-coal-700 text-black dark:text-coal-100"
                  disabled={images.length === 1}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  onClick={goToNext}
                  variant="secondary"
                  className="px-4 py-2 bg-claude-sand dark:bg-coal-850 hover:bg-claude-divider dark:hover:bg-coal-700 text-black dark:text-coal-100"
                  disabled={images.length === 1}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
