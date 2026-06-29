'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '../atoms/Button';
import { ChevronLeft, ChevronRight, X, Image as ImageIcon } from 'lucide-react';
import { DamageOverlay, damagesForImage } from '../molecules/DamageOverlay';
import type { DamageAreaItem } from '../../lib/agents/agentControl';

interface ImageCarouselProps {
  images: string[];
  showPlaceholder?: boolean;
  /** AI-detected damages (from the damage-detection agent report); markers are
   *  drawn as red circles on the image each damage was localized in. */
  damages?: DamageAreaItem[];
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({ images, showPlaceholder = true, damages }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  const currentImage = useMemo(() => images[currentIndex], [images, currentIndex]);
  const currentDamages = useMemo(
    () => damagesForImage(damages, currentIndex),
    [damages, currentIndex],
  );

  if (images.length === 0) {
    if (!showPlaceholder) return null;
    
    return (
      <div className="w-full bg-claude-surface dark:bg-coal-850 rounded-lg shadow-md overflow-hidden border border-claude-border dark:border-coal-700">
        <div className="relative h-64 md:h-96 flex items-center justify-center bg-claude-sand dark:bg-coal-700">
          <div className="flex flex-col items-center justify-center text-claude-subtle dark:text-coal-400">
            <ImageIcon className="h-16 w-16 mb-4" />
            <p className="text-lg font-medium text-claude-muted dark:text-coal-300">No images Available</p>
          </div>
        </div>
      </div>
    );
  }

  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === images.length - 1 ? 0 : prevIndex + 1));
  }, [images.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? images.length - 1 : prevIndex - 1));
  }, [images.length]);

  // Fullscreen navigation resets zoom/pan so the next image starts framed.
  const viewerNext = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    goToNext();
  }, [goToNext]);

  const viewerPrevious = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    goToPrevious();
  }, [goToPrevious]);

  const openViewer = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setIsViewerOpen(true);
  };

  const closeViewer = useCallback(() => {
    setIsViewerOpen(false);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  // Fullscreen keyboard controls: Esc closes, ←/→ navigate.
  useEffect(() => {
    if (!isViewerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeViewer();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        viewerNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        viewerPrevious();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isViewerOpen, closeViewer, viewerNext, viewerPrevious]);

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
    <div className="w-full bg-claude-surface dark:bg-coal-850 rounded-lg shadow-md overflow-hidden border border-claude-border dark:border-coal-700">
      {/* Main Carousel Image */}
      <div className="relative h-64 md:h-96 flex items-center justify-center bg-claude-sand dark:bg-coal-700">
        {/* relative wrapper shrinks to the painted image so the damage
            overlay's normalized coordinates line up exactly */}
        <div className="relative max-h-full max-w-full">
          <img
            src={currentImage}
            alt={`Vehicle image ${currentIndex + 1}`}
            className="max-h-64 md:max-h-96 max-w-full object-contain cursor-zoom-in"
            onClick={openViewer}
          />
          <DamageOverlay damages={currentDamages} />
        </div>
        {currentDamages.length > 0 && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[11px] font-medium text-white bg-red-500/90 shadow">
            {currentDamages.length} damage marker{currentDamages.length > 1 ? 's' : ''} — hover circles for details
          </span>
        )}
        {images.length > 1 && (
          <>
            <Button
              onClick={goToPrevious}
              variant="ghost"
            //   size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 text-claude-ink dark:text-coal-200 bg-claude-surface dark:bg-coal-600 bg-opacity-75 dark:bg-opacity-90 hover:bg-opacity-100 dark:hover:bg-opacity-100 rounded-full p-2 shadow-md"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              onClick={goToNext}
              variant="ghost"
            //   size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-claude-ink dark:text-coal-200 bg-claude-surface dark:bg-coal-600 bg-opacity-75 dark:bg-opacity-90 hover:bg-opacity-100 dark:hover:bg-opacity-100 rounded-full p-2 shadow-md"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 0 && (
        <div className="p-2 bg-claude-cream dark:bg-coal-700 flex flex-nowrap justify-start gap-2 overflow-x-auto border-t border-claude-border dark:border-coal-600">
          {images.map((image, index) => (
            <div key={index} className="relative shrink-0">
              <img
                src={image}
                alt={`Thumbnail ${index + 1}`}
                className={`w-16 h-16 object-cover rounded-md cursor-pointer border-2 ${
                  index === currentIndex ? 'border-blue-500 dark:border-blue-400' : 'border-transparent'
                }`}
                onClick={() => setCurrentIndex(index)}
              />
              {damagesForImage(damages, index).length > 0 && (
                <span
                  className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-coal-800 pointer-events-none"
                  title="Damage detected in this photo"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Fullscreen zoomable viewer */}
    {isViewerOpen && (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col">
        <div className="flex justify-end p-4">
          <Button variant="ghost" onClick={closeViewer} className="text-coal-100 hover:text-coal-200">
            <X className="h-6 w-6" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center overflow-auto relative">
          {images.length > 1 && (
            <>
              <Button
                onClick={viewerPrevious}
                variant="ghost"
                aria-label="Previous image"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-coal-100 bg-white/10 hover:bg-white/25 rounded-full p-2 shadow-md"
              >
                <ChevronLeft className="h-7 w-7" />
              </Button>
              <Button
                onClick={viewerNext}
                variant="ghost"
                aria-label="Next image"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-coal-100 bg-white/10 hover:bg-white/25 rounded-full p-2 shadow-md"
              >
                <ChevronRight className="h-7 w-7" />
              </Button>
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-md text-[12px] text-coal-100 bg-black/50">
                {currentIndex + 1} / {images.length}
              </span>
            </>
          )}
          <div
            className="relative"
            onWheel={handleWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            style={{ cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'zoom-in' }}
          >
            {/* transform lives on the wrapper so damage markers track zoom/pan */}
            <div
              className="relative"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                transition: isPanning ? 'none' : 'transform 80ms ease-out',
              }}
            >
              <img
                src={currentImage}
                alt={`Vehicle image zoomed ${currentIndex + 1}`}
                className="max-h-[90vh] max-w-[90vw] object-contain select-none"
                draggable={false}
              />
              <DamageOverlay damages={currentDamages} showOutline />
            </div>
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
