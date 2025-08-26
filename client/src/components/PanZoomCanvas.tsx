import React, { useRef, useEffect, useState, useCallback } from 'react';
import './PanZoomCanvas.css';

interface PanZoomCanvasProps {
  children: React.ReactElement<HTMLCanvasElement>;
  width: number;
  height: number;
  minZoom?: number;
  maxZoom?: number;
  enablePan?: boolean;
  enableZoom?: boolean;
  showControls?: boolean;
  label?: string;
  fitMode?: 'contain' | 'fill'; // 'contain' fits entire canvas, 'fill' maximizes usage
  initialScale?: number; // Override initial scale
}

export function PanZoomCanvas({
  children,
  width,
  height,
  minZoom = 0.1,
  maxZoom = 5,
  enablePan = true,
  enableZoom = true,
  showControls = true,
  label,
  fitMode = 'fill',
  initialScale,
}: PanZoomCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastPan, setLastPan] = useState({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false);

  // Handle mouse wheel zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!enableZoom) return;
      e.preventDefault();

      const viewport = containerRef.current?.querySelector('.pan-zoom-viewport');
      if (!viewport) return;

      const rect = viewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Calculate zoom
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(Math.max(zoom * delta, minZoom), maxZoom);

      // Adjust pan to zoom towards mouse position
      const zoomRatio = newZoom / zoom;
      const newPanX = mouseX - (mouseX - pan.x) * zoomRatio;
      const newPanY = mouseY - (mouseY - pan.y) * zoomRatio;

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    },
    [zoom, pan, minZoom, maxZoom, enableZoom],
  );

  // Handle mouse down for pan
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!enablePan) return;
      if (e.button !== 0) return; // Only left click

      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setLastPan(pan);
      e.preventDefault();
    },
    [pan, enablePan],
  );

  // Handle mouse move for pan
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !enablePan) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      setPan({
        x: lastPan.x + deltaX,
        y: lastPan.y + deltaY,
      });
    },
    [isDragging, dragStart, lastPan, enablePan],
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Control functions
  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(z * 1.2, maxZoom));
  }, [maxZoom]);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(z / 1.2, minZoom));
  }, [minZoom]);

  const fitToScreen = useCallback(() => {
    if (!containerRef.current) {
      return;
    }

    const container = containerRef.current;
    const viewport = container.querySelector('.pan-zoom-viewport');
    if (!viewport) {
      return;
    }

    const viewportElement = viewport as HTMLElement;

    // Get dimension measurements
    const viewportRect = viewport.getBoundingClientRect();

    // Get the correct dimensions - prioritize offsetWidth/Height as most reliable
    let containerWidth = viewportElement.offsetWidth;
    let containerHeight = viewportElement.offsetHeight;

    // Fallback to getBoundingClientRect if offset dimensions are zero
    if (containerWidth <= 0 || containerHeight <= 0) {
      containerWidth = viewportRect.width;
      containerHeight = viewportRect.height;
    }

    // Final fallback to client dimensions
    if (containerWidth <= 0 || containerHeight <= 0) {
      containerWidth = viewportElement.clientWidth;
      containerHeight = viewportElement.clientHeight;
    }

    // Early return if dimensions are invalid
    if (containerWidth <= 0 || containerHeight <= 0) {
      return;
    }

    // Adjust padding based on fit mode - minimal padding for fill mode
    const padding = fitMode === 'fill' ? 2 : 10;
    const availableWidth = containerWidth - padding * 2;
    const availableHeight = containerHeight - padding * 2;

    // Calculate scale to fit within available space
    const scaleX = availableWidth / width;
    const scaleY = availableHeight / height;

    // Choose scale based on fit mode
    let scale: number;
    if (fitMode === 'fill') {
      // For fill mode, maximize the canvas size while keeping it fully visible
      // Never exceed 100% scale to avoid centering issues
      scale = Math.min(scaleX, scaleY, 1.0);
    } else {
      // 'contain' mode - ensure entire canvas fits with more padding
      scale = Math.min(scaleX, scaleY) * 0.85;
    }

    // Override with initial scale if provided
    if (initialScale !== undefined) {
      scale = initialScale;
    }

    // Clamp scale to never exceed 100% for better centering
    scale = Math.min(scale, 1.0);

    // Calculate pan to center the canvas
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    const panX = (containerWidth - scaledWidth) / 2;
    const panY = (containerHeight - scaledHeight) / 2;

    setZoom(scale);
    setPan({ x: panX, y: panY });

    // Mark as initialized after first successful fit
    if (!isInitialized) {
      setTimeout(() => setIsInitialized(true), 100);
    }
  }, [width, height, fitMode, initialScale, isInitialized]);

  const resetView = useCallback(() => {
    // Reset to default view
    fitToScreen();
  }, [fitToScreen]);

  // Setup wheel event listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // Global mouse up listener
  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  // Initial fit to screen and when dimensions change
  useEffect(() => {
    let isMounted = true;
    let hasAttempted = false;
    let fitTimeout: NodeJS.Timeout;

    // Simple single attempt with minimal retries
    const attemptFit = () => {
      if (!isMounted || hasAttempted) return;

      // Only attempt if container exists
      if (containerRef.current) {
        const viewport = containerRef.current.querySelector('.pan-zoom-viewport') as HTMLElement;
        if (viewport) {
          const offsetWidth = viewport.offsetWidth;
          const offsetHeight = viewport.offsetHeight;

          // Only fit if we have valid dimensions
          if (offsetWidth > 100 && offsetHeight > 100) {
            hasAttempted = true;
            requestAnimationFrame(() => {
              if (isMounted) {
                fitToScreen();
              }
            });
          } else {
            // Single retry after a delay if dimensions aren't ready
            fitTimeout = setTimeout(() => {
              if (isMounted && !hasAttempted) {
                attemptFit();
              }
            }, 100);
          }
        }
      }
    };

    // Attempt once after a small delay to ensure DOM is ready
    fitTimeout = setTimeout(() => attemptFit(), 10);

    return () => {
      isMounted = false;
      clearTimeout(fitTimeout);
    };
  }, [fitToScreen, width, height]);

  // Also fit to screen when container resizes
  useEffect(() => {
    if (!containerRef.current) return;

    let lastWidth = 0;
    let lastHeight = 0;
    let resizeTimeout: NodeJS.Timeout;

    const resizeObserver = new ResizeObserver((entries) => {
      // Clear any pending resize timeout
      clearTimeout(resizeTimeout);

      // Only refit if size actually changed significantly (avoid infinite loops)
      for (const entry of entries) {
        const { width: newWidth, height: newHeight } = entry.contentRect;

        // Check if size changed significantly (more than 10px difference)
        const widthChanged = Math.abs(newWidth - lastWidth) > 10;
        const heightChanged = Math.abs(newHeight - lastHeight) > 10;

        if ((widthChanged || heightChanged) && newWidth > 100 && newHeight > 100) {
          lastWidth = newWidth;
          lastHeight = newHeight;

          // Debounce resize calls with longer delay
          resizeTimeout = setTimeout(() => {
            requestAnimationFrame(() => {
              fitToScreen();
            });
          }, 150);
        }
      }
    });

    // Observe the viewport element if it exists, otherwise observe container
    const viewport = containerRef.current.querySelector('.pan-zoom-viewport');
    if (viewport) {
      resizeObserver.observe(viewport);
    } else {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
    };
  }, [fitToScreen]);

  return (
    <div className="pan-zoom-container" ref={containerRef}>
      <div
        className="pan-zoom-viewport"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          cursor: isDragging ? 'grabbing' : enablePan ? 'grab' : 'default',
        }}
      >
        <div
          className={`pan-zoom-content ${isDragging ? 'dragging' : ''} ${isInitialized ? 'initialized' : ''}`}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {React.cloneElement(children, {
            width,
            height,
          })}
        </div>
      </div>

      {label && <div className="pan-zoom-label">{label}</div>}

      {showControls && (
        <div className="pan-zoom-controls">
          <button onClick={zoomIn} title="Zoom In" className="control-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
            </svg>
          </button>
          <button onClick={zoomOut} title="Zoom Out" className="control-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35M8 11h6" />
            </svg>
          </button>
          <button onClick={resetView} title="Reset View" className="control-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
          <button onClick={fitToScreen} title="Fit to Screen" className="control-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
          <span className="zoom-indicator">{Math.round(zoom * 100)}%</span>
        </div>
      )}
    </div>
  );
}
