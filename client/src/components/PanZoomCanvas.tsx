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
    console.log('🔍 fitToScreen called');

    if (!containerRef.current) {
      console.warn('❌ containerRef.current is null');
      return;
    }

    const container = containerRef.current;
    console.log('📦 Container element:', container);

    const viewport = container.querySelector('.pan-zoom-viewport');
    if (!viewport) {
      console.warn('❌ Viewport not found');
      return;
    }
    console.log('🖼️ Viewport element:', viewport);

    // Get various dimension measurements for debugging
    const containerRect = container.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    const containerStyles = window.getComputedStyle(container);
    const viewportStyles = window.getComputedStyle(viewport as Element);

    console.log('📏 Container getBoundingClientRect:', {
      width: containerRect.width,
      height: containerRect.height,
      top: containerRect.top,
      left: containerRect.left,
    });

    console.log('📏 Viewport getBoundingClientRect:', {
      width: viewportRect.width,
      height: viewportRect.height,
      top: viewportRect.top,
      left: viewportRect.left,
    });

    console.log('🎨 Container computed styles:', {
      width: containerStyles.width,
      height: containerStyles.height,
      padding: containerStyles.padding,
      position: containerStyles.position,
    });

    console.log('🎨 Viewport computed styles:', {
      width: viewportStyles.width,
      height: viewportStyles.height,
      padding: viewportStyles.padding,
      position: viewportStyles.position,
      overflow: viewportStyles.overflow,
    });

    const containerWidth = viewportRect.width;
    const containerHeight = viewportRect.height;

    // Early return if dimensions are invalid
    if (containerWidth <= 0 || containerHeight <= 0) {
      console.warn('❌ Invalid viewport dimensions:', containerWidth, containerHeight);
      return;
    }

    // Adjust padding based on fit mode - minimal padding for fill mode
    const padding = fitMode === 'fill' ? 2 : 10;
    const availableWidth = containerWidth - padding * 2;
    const availableHeight = containerHeight - padding * 2;

    console.log('📐 Sizing calculations:', {
      padding,
      availableWidth,
      availableHeight,
      canvasWidth: width,
      canvasHeight: height,
    });

    // Calculate scale to fit within available space
    const scaleX = availableWidth / width;
    const scaleY = availableHeight / height;

    console.log('⚖️ Scale calculations:', {
      scaleX: scaleX.toFixed(4),
      scaleY: scaleY.toFixed(4),
      minScale: Math.min(scaleX, scaleY).toFixed(4),
    });

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
      console.log('🔄 Overriding scale with initialScale:', initialScale);
      scale = initialScale;
    }

    // Clamp scale to never exceed 100% for better centering
    scale = Math.min(scale, 1.0);

    console.log('✅ Final scale:', scale.toFixed(4));

    // Calculate pan to center the canvas
    // Since we're using transformOrigin: '0 0', the canvas scales from top-left
    // After scaling, the canvas dimensions become width*scale and height*scale
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;

    // To center: translate by half the difference between container and scaled canvas
    // This will always be positive when scale <= 1
    const panX = Math.max(0, (containerWidth - scaledWidth) / 2);
    const panY = Math.max(0, (containerHeight - scaledHeight) / 2);

    console.log('🎯 Centering calculations:', {
      scaledWidth: scaledWidth.toFixed(2),
      scaledHeight: scaledHeight.toFixed(2),
      containerWidth,
      containerHeight,
      panX: panX.toFixed(2),
      panY: panY.toFixed(2),
      'diff X': (containerWidth - scaledWidth).toFixed(2),
      'diff Y': (containerHeight - scaledHeight).toFixed(2),
    });

    console.log(
      `📊 FitToScreen Summary [${fitMode}]: viewport ${containerWidth}x${containerHeight}, ` +
        `canvas ${width}x${height}, scale ${scale.toFixed(2)} (${Math.round(scale * 100)}%)`,
    );
    console.log(
      `📍 Position: scaled ${scaledWidth.toFixed(1)}x${scaledHeight.toFixed(1)}, ` +
        `pan: (${panX.toFixed(1)}, ${panY.toFixed(1)})`,
    );

    // Log the actual state update
    console.log('🔄 Setting state:', {
      zoom: scale,
      pan: { x: panX, y: panY },
    });

    setZoom(scale);
    setPan({ x: panX, y: panY });

    // Mark as initialized after first successful fit
    if (!isInitialized) {
      console.log('✨ Marking as initialized');
      setTimeout(() => setIsInitialized(true), 100);
    }

    console.log('✅ fitToScreen completed');
    console.log('════════════════════════════════════');
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
          ref={(el) => {
            if (el) {
              // Log the actual computed transform
              const computedStyle = window.getComputedStyle(el);
              const transform = computedStyle.transform;
              const transformOrigin = computedStyle.transformOrigin;

              // Only log if we have meaningful values
              if (pan.x !== 0 || pan.y !== 0 || zoom !== 1) {
                console.log('🎭 Applied transform:', {
                  expectedTransform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  actualTransform: transform,
                  transformOrigin: transformOrigin,
                  pan: { x: pan.x, y: pan.y },
                  zoom: zoom,
                });
              }
            }
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
