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

      // With transform-origin at 0 0, adjust pan to zoom towards mouse position
      const zoomRatio = newZoom / zoom;
      // Calculate the point in canvas space
      const canvasX = (mouseX - pan.x) / zoom;
      const canvasY = (mouseY - pan.y) / zoom;
      // Calculate new pan to keep the same point under the mouse
      const newPanX = mouseX - canvasX * newZoom;
      const newPanY = mouseY - canvasY * newZoom;

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
    setZoom((z) => {
      const newZoom = Math.min(z * 1.2, maxZoom);
      // Recenter when zooming with controls
      if (containerRef.current) {
        const viewport = containerRef.current.querySelector('.pan-zoom-viewport') as HTMLElement;
        if (viewport) {
          const viewportWidth = viewport.offsetWidth || viewport.clientWidth;
          const viewportHeight = viewport.offsetHeight || viewport.clientHeight;
          const scaledWidth = width * newZoom;
          const scaledHeight = height * newZoom;
          setPan({
            x: (viewportWidth - scaledWidth) / 2,
            y: (viewportHeight - scaledHeight) / 2,
          });
        }
      }
      return newZoom;
    });
  }, [maxZoom, width, height]);

  const zoomOut = useCallback(() => {
    setZoom((z) => {
      const newZoom = Math.max(z / 1.2, minZoom);
      // Recenter when zooming with controls
      if (containerRef.current) {
        const viewport = containerRef.current.querySelector('.pan-zoom-viewport') as HTMLElement;
        if (viewport) {
          const viewportWidth = viewport.offsetWidth || viewport.clientWidth;
          const viewportHeight = viewport.offsetHeight || viewport.clientHeight;
          const scaledWidth = width * newZoom;
          const scaledHeight = height * newZoom;
          setPan({
            x: (viewportWidth - scaledWidth) / 2,
            y: (viewportHeight - scaledHeight) / 2,
          });
        }
      }
      return newZoom;
    });
  }, [minZoom, width, height]);

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

    // Force layout recalculation in VM environments
    // This helps with virtual display drivers that report incorrect dimensions
    viewportElement.style.display = 'none';
    viewportElement.offsetHeight; // Force reflow
    viewportElement.style.display = '';

    // Multiple strategies for getting dimensions, optimized for VM environments
    let containerWidth = 0;
    let containerHeight = 0;

    // Strategy 1: Computed styles (most reliable in VMs)
    const computedStyle = window.getComputedStyle(viewportElement);
    const computedWidth = parseFloat(computedStyle.width);
    const computedHeight = parseFloat(computedStyle.height);
    
    if (computedWidth > 0 && computedHeight > 0) {
      containerWidth = computedWidth;
      containerHeight = computedHeight;
    }

    // Strategy 2: getBoundingClientRect (fallback)
    if (containerWidth <= 0 || containerHeight <= 0) {
      const viewportRect = viewportElement.getBoundingClientRect();
      if (viewportRect.width > 0 && viewportRect.height > 0) {
        containerWidth = viewportRect.width;
        containerHeight = viewportRect.height;
      }
    }

    // Strategy 3: Offset dimensions
    if (containerWidth <= 0 || containerHeight <= 0) {
      if (viewportElement.offsetWidth > 0 && viewportElement.offsetHeight > 0) {
        containerWidth = viewportElement.offsetWidth;
        containerHeight = viewportElement.offsetHeight;
      }
    }

    // Strategy 4: Client dimensions
    if (containerWidth <= 0 || containerHeight <= 0) {
      if (viewportElement.clientWidth > 0 && viewportElement.clientHeight > 0) {
        containerWidth = viewportElement.clientWidth;
        containerHeight = viewportElement.clientHeight;
      }
    }

    // Strategy 5: Parent container as last resort
    if (containerWidth <= 0 || containerHeight <= 0) {
      const parentRect = container.getBoundingClientRect();
      if (parentRect.width > 0 && parentRect.height > 0) {
        // Account for potential padding/borders
        containerWidth = parentRect.width - 20;
        containerHeight = parentRect.height - 60; // Account for controls/label
      }
    }

    // Early return if dimensions are still invalid
    if (containerWidth <= 0 || containerHeight <= 0) {
      console.warn('FitToScreen: Unable to determine container dimensions', { 
        containerWidth, 
        containerHeight,
        viewport: viewportElement,
        computed: { computedWidth, computedHeight }
      });
      // Schedule a retry in VM environments
      setTimeout(() => fitToScreen(), 500);
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
      // For fill mode, use 95% of available space for better visibility
      // This ensures the matrix fills most of the viewport
      scale = Math.min(scaleX, scaleY) * 0.95;
    } else {
      // 'contain' mode - ensure entire canvas fits with more padding
      scale = Math.min(scaleX, scaleY) * 0.85;
    }

    // Override with initial scale if provided
    if (initialScale !== undefined) {
      scale = initialScale;
    }

    // Apply reasonable scale limits but allow scaling above 100% if needed
    scale = Math.min(Math.max(scale, minZoom), maxZoom);

    // Calculate pan to center the canvas
    // Since transform-origin is at top-left (0 0), we need to center manually
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    const panX = (containerWidth - scaledWidth) / 2;
    const panY = (containerHeight - scaledHeight) / 2;

    console.log('FitToScreen calculations:', {
      containerDimensions: { width: containerWidth, height: containerHeight },
      canvasDimensions: { width, height },
      scaledDimensions: { width: scaledWidth, height: scaledHeight },
      scales: { scaleX, scaleY, finalScale: scale },
      pan: { x: panX, y: panY },
      transformOrigin: '0 0',
      computedStyle: { width: computedWidth, height: computedHeight },
    });

    setZoom(scale);
    setPan({ x: panX, y: panY });

    // Mark as initialized after first successful fit
    if (!isInitialized) {
      setTimeout(() => setIsInitialized(true), 100);
    }
  }, [width, height, fitMode, initialScale, isInitialized, minZoom, maxZoom]);

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

  // Keyboard shortcuts for VM environment support
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Press 'f' to fit to screen (useful in VMs with display issues)
      if (e.key === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        // Don't trigger if typing in an input field
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          fitToScreen();
        }
      }
      // Press 'r' to reset view
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          resetView();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [fitToScreen, resetView]);

  // Initial fit to screen and when dimensions change
  useEffect(() => {
    let isMounted = true;
    let attemptCount = 0;
    const maxAttempts = 5; // More attempts for VM environments
    let fitTimeout: NodeJS.Timeout;

    // Enhanced retry mechanism for VM environments
    const attemptFit = () => {
      if (!isMounted || attemptCount >= maxAttempts) return;
      attemptCount++;

      // Only attempt if container exists
      if (containerRef.current) {
        const viewport = containerRef.current.querySelector('.pan-zoom-viewport') as HTMLElement;
        if (viewport) {
          // Force style recalculation in VM
          const computedStyle = window.getComputedStyle(viewport);
          const computedWidth = parseFloat(computedStyle.width);
          const computedHeight = parseFloat(computedStyle.height);

          // Try multiple dimension sources
          const offsetWidth = viewport.offsetWidth;
          const offsetHeight = viewport.offsetHeight;
          const hasValidDimensions = 
            (offsetWidth > 100 && offsetHeight > 100) ||
            (computedWidth > 100 && computedHeight > 100);

          if (hasValidDimensions) {
            requestAnimationFrame(() => {
              if (isMounted) {
                fitToScreen();
              }
            });
          } else if (attemptCount < maxAttempts) {
            // Exponential backoff for retries in VM environments
            const delay = Math.min(100 * Math.pow(1.5, attemptCount), 2000);
            fitTimeout = setTimeout(() => {
              if (isMounted) {
                attemptFit();
              }
            }, delay);
          }
        }
      }
    };

    // Start with a small delay to ensure DOM is ready
    fitTimeout = setTimeout(() => attemptFit(), 50);

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
            transformOrigin: '0 0', // Use top-left origin for more predictable centering
            width: `${width}px`,
            height: `${height}px`,
          }}
          data-debug={`pan: ${pan.x.toFixed(1)}, ${pan.y.toFixed(1)} | zoom: ${zoom.toFixed(2)}`}
        >
          {/* Canvas wrapper div to ensure proper positioning */}
          <div 
            className="canvas-container"
            style={{
              position: 'relative',
              width: `${width}px`,
              height: `${height}px`,
              display: 'block',
            }}
          >
            {React.isValidElement(children) && children.type === 'canvas' ? (
              // For canvas elements, ensure proper positioning
              React.cloneElement(children as React.ReactElement<HTMLCanvasElement>, {
                width,
                height,
                style: {
                  ...children.props.style,
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  display: 'block',
                  // Ensure canvas fills its container
                  width: `${width}px`,
                  height: `${height}px`,
                },
              })
            ) : (
              // For other elements, just pass through with width/height
              React.cloneElement(children, {
                width,
                height,
                style: {
                  ...children.props.style,
                  display: 'block',
                },
              })
            )}
          </div>
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
          <button onClick={resetView} title="Reset View (R key)" className="control-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
          <button onClick={fitToScreen} title="Fit to Screen (F key)" className="control-btn">
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
