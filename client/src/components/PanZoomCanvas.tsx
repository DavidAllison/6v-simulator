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
    if (!containerRef.current) return;
    const container = containerRef.current;
    const viewport = container.querySelector('.pan-zoom-viewport');
    if (!viewport) {
      console.warn('Viewport not found');
      return;
    }

    // Use getBoundingClientRect to get actual rendered dimensions
    const viewportRect = viewport.getBoundingClientRect();
    const containerWidth = viewportRect.width;
    const containerHeight = viewportRect.height;

    // Early return if dimensions are invalid
    if (containerWidth <= 0 || containerHeight <= 0) {
      console.warn('Invalid viewport dimensions:', containerWidth, containerHeight);
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
      // Use 98% to maximize space usage while ensuring visibility
      scale = Math.min(scaleX, scaleY) * 0.98;
    } else {
      // 'contain' mode - ensure entire canvas fits with more padding
      scale = Math.min(scaleX, scaleY) * 0.9;
    }

    // Override with initial scale if provided
    if (initialScale !== undefined) {
      scale = initialScale;
    }

    // Calculate pan to center the canvas
    // Since we're using transformOrigin: '0 0', the canvas scales from top-left
    // After scaling, the canvas dimensions become width*scale and height*scale
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;

    // To center: translate by half the difference between container and scaled canvas
    // Allow negative values when canvas is larger than viewport (scale > 1)
    const panX = (containerWidth - scaledWidth) / 2;
    const panY = (containerHeight - scaledHeight) / 2;

    console.log(
      `FitToScreen [${fitMode}]: viewport ${containerWidth}x${containerHeight}, ` +
        `canvas ${width}x${height}, scale ${scale.toFixed(2)}`,
    );
    console.log(
      `Scaled dimensions: ${scaledWidth.toFixed(1)}x${scaledHeight.toFixed(1)}, ` +
        `pan: (${panX.toFixed(1)}, ${panY.toFixed(1)})`,
    );

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
    // Multiple attempts to ensure proper initialization
    const attemptFit = () => {
      // Only attempt if container exists
      if (containerRef.current) {
        const viewport = containerRef.current.querySelector('.pan-zoom-viewport');
        if (viewport) {
          requestAnimationFrame(() => {
            fitToScreen();
          });
        }
      }
    };

    // Use mutation observer to detect when viewport is added
    const mutationObserver = new MutationObserver(() => {
      attemptFit();
    });

    if (containerRef.current) {
      mutationObserver.observe(containerRef.current, {
        childList: true,
        subtree: true,
      });
    }

    // First attempt: immediate (might work if already rendered)
    attemptFit();

    // Second attempt: after a short delay
    const timeout1 = setTimeout(attemptFit, 50);

    // Third attempt: after layout should be complete
    const timeout2 = setTimeout(attemptFit, 150);

    // Fourth attempt: failsafe
    const timeout3 = setTimeout(attemptFit, 300);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
      mutationObserver.disconnect();
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

        // Check if size changed significantly (more than 5px difference)
        const widthChanged = Math.abs(newWidth - lastWidth) > 5;
        const heightChanged = Math.abs(newHeight - lastHeight) > 5;

        if ((widthChanged || heightChanged) && newWidth > 10 && newHeight > 10) {
          lastWidth = newWidth;
          lastHeight = newHeight;

          // Debounce resize calls
          resizeTimeout = setTimeout(() => {
            requestAnimationFrame(() => {
              fitToScreen();
            });
          }, 100);
        }
      }
    });

    resizeObserver.observe(containerRef.current);
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
