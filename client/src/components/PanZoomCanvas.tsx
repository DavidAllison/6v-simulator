import React, { useRef, useEffect, useState, useCallback } from 'react';
import './PanZoomCanvas.css';

interface PanZoomCanvasProps {
  /** A single canvas element. Its width/height/style are managed by this wrapper. */
  children: React.ReactElement<React.CanvasHTMLAttributes<HTMLCanvasElement>, 'canvas'>;
  /** Natural (unscaled) pixel width of the canvas content. */
  width: number;
  /** Natural (unscaled) pixel height of the canvas content. */
  height: number;
  minZoom?: number;
  maxZoom?: number;
  enablePan?: boolean;
  enableZoom?: boolean;
  showControls?: boolean;
  label?: string;
  /** 'contain' fits the whole canvas with padding; 'fill' maximizes usage. */
  fitMode?: 'contain' | 'fill';
  /** Override the auto-computed initial scale. */
  initialScale?: number;
}

/**
 * Wraps a canvas in a pannable / zoomable viewport so large lattices (N≳32) stay
 * legible. The canvas is rendered once at its natural resolution; this component
 * applies a CSS transform for the view, and auto-fits the content to the viewport
 * on mount, on resize, and when the canvas dimensions change.
 *
 * Keyboard: `f` fits to screen, `r` resets the view (ignored while typing).
 */
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
  // Ref mirror so fitToScreen can fire the one-shot init without taking
  // isInitialized as a dependency (which would churn the fit/resize effects).
  const isInitializedRef = useRef(false);

  // Mouse wheel zoom, anchored at the cursor.
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!enableZoom) return;
      e.preventDefault();

      const viewport = containerRef.current?.querySelector('.pan-zoom-viewport');
      if (!viewport) return;

      const rect = viewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(Math.max(zoom * delta, minZoom), maxZoom);

      // With transform-origin at 0 0, keep the point under the cursor fixed.
      const canvasX = (mouseX - pan.x) / zoom;
      const canvasY = (mouseY - pan.y) / zoom;
      const newPanX = mouseX - canvasX * newZoom;
      const newPanY = mouseY - canvasY * newZoom;

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    },
    [zoom, pan, minZoom, maxZoom, enableZoom],
  );

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

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Recenter the (newly scaled) canvas within the viewport.
  const recenter = useCallback(
    (newZoom: number) => {
      const viewport = containerRef.current?.querySelector(
        '.pan-zoom-viewport',
      ) as HTMLElement | null;
      if (!viewport) return;
      const viewportWidth = viewport.offsetWidth || viewport.clientWidth;
      const viewportHeight = viewport.offsetHeight || viewport.clientHeight;
      setPan({
        x: (viewportWidth - width * newZoom) / 2,
        y: (viewportHeight - height * newZoom) / 2,
      });
    },
    [width, height],
  );

  const zoomIn = useCallback(() => {
    setZoom((z) => {
      const newZoom = Math.min(z * 1.2, maxZoom);
      recenter(newZoom);
      return newZoom;
    });
  }, [maxZoom, recenter]);

  const zoomOut = useCallback(() => {
    setZoom((z) => {
      const newZoom = Math.max(z / 1.2, minZoom);
      recenter(newZoom);
      return newZoom;
    });
  }, [minZoom, recenter]);

  const fitToScreen = useCallback(() => {
    const container = containerRef.current;
    const viewport = container?.querySelector('.pan-zoom-viewport') as HTMLElement | null;
    if (!container || !viewport) return;

    // Prefer computed/bounding dimensions; fall back through offset/client/parent.
    let containerWidth = 0;
    let containerHeight = 0;

    const rect = viewport.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      containerWidth = rect.width;
      containerHeight = rect.height;
    }
    if (containerWidth <= 0 || containerHeight <= 0) {
      if (viewport.clientWidth > 0 && viewport.clientHeight > 0) {
        containerWidth = viewport.clientWidth;
        containerHeight = viewport.clientHeight;
      }
    }
    if (containerWidth <= 0 || containerHeight <= 0) {
      const parentRect = container.getBoundingClientRect();
      if (parentRect.width > 0 && parentRect.height > 0) {
        containerWidth = parentRect.width - 20;
        containerHeight = parentRect.height - 60; // account for controls/label
      }
    }

    if (containerWidth <= 0 || containerHeight <= 0) return;

    const padding = fitMode === 'fill' ? 2 : 10;
    const availableWidth = containerWidth - padding * 2;
    const availableHeight = containerHeight - padding * 2;

    const scaleX = availableWidth / width;
    const scaleY = availableHeight / height;
    let scale =
      fitMode === 'fill' ? Math.min(scaleX, scaleY) * 0.95 : Math.min(scaleX, scaleY) * 0.85;

    if (initialScale !== undefined) {
      scale = initialScale;
    }
    scale = Math.min(Math.max(scale, minZoom), maxZoom);

    // transform-origin is top-left, so center by adjusting pan.
    const panX = (containerWidth - width * scale) / 2;
    const panY = (containerHeight - height * scale) / 2;

    setZoom(scale);
    setPan({ x: panX, y: panY });

    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      setTimeout(() => setIsInitialized(true), 100);
    }
  }, [width, height, fitMode, initialScale, minZoom, maxZoom]);

  const resetView = useCallback(() => {
    fitToScreen();
  }, [fitToScreen]);

  // Wheel listener (non-passive so preventDefault works).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // Release drag even if the mouse goes up outside the viewport.
  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  // Keyboard shortcuts: f = fit, r = reset (ignored while typing).
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'f') {
        e.preventDefault();
        fitToScreen();
      } else if (e.key === 'r') {
        e.preventDefault();
        resetView();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [fitToScreen, resetView]);

  // Fit on mount and whenever the canvas dimensions change, retrying until the
  // viewport reports usable dimensions (layout may not have settled yet).
  useEffect(() => {
    let isMounted = true;
    let attemptCount = 0;
    const maxAttempts = 5;
    let fitTimeout: ReturnType<typeof setTimeout>;

    const attemptFit = () => {
      if (!isMounted || attemptCount >= maxAttempts) return;
      attemptCount++;

      const viewport = containerRef.current?.querySelector(
        '.pan-zoom-viewport',
      ) as HTMLElement | null;
      if (!viewport) return;

      const hasValidDimensions = viewport.offsetWidth > 100 && viewport.offsetHeight > 100;
      if (hasValidDimensions) {
        requestAnimationFrame(() => {
          if (isMounted) fitToScreen();
        });
      } else {
        const delay = Math.min(100 * Math.pow(1.5, attemptCount), 2000);
        fitTimeout = setTimeout(() => {
          if (isMounted) attemptFit();
        }, delay);
      }
    };

    fitTimeout = setTimeout(() => attemptFit(), 50);

    return () => {
      isMounted = false;
      clearTimeout(fitTimeout);
    };
  }, [fitToScreen, width, height]);

  // Refit when the viewport itself resizes (debounced, ignores tiny changes).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let lastWidth = 0;
    let lastHeight = 0;
    let resizeTimeout: ReturnType<typeof setTimeout>;

    const resizeObserver = new ResizeObserver((entries) => {
      clearTimeout(resizeTimeout);
      for (const entry of entries) {
        const { width: newWidth, height: newHeight } = entry.contentRect;
        const widthChanged = Math.abs(newWidth - lastWidth) > 10;
        const heightChanged = Math.abs(newHeight - lastHeight) > 10;
        if ((widthChanged || heightChanged) && newWidth > 100 && newHeight > 100) {
          lastWidth = newWidth;
          lastHeight = newHeight;
          resizeTimeout = setTimeout(() => {
            requestAnimationFrame(() => fitToScreen());
          }, 150);
        }
      }
    });

    const viewport = container.querySelector('.pan-zoom-viewport');
    resizeObserver.observe(viewport ?? container);

    return () => {
      clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
    };
  }, [fitToScreen]);

  const childStyle = children.props.style ?? {};

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
            width: `${width}px`,
            height: `${height}px`,
          }}
        >
          <div
            className="canvas-container"
            style={{
              position: 'relative',
              width: `${width}px`,
              height: `${height}px`,
              display: 'block',
            }}
          >
            {React.cloneElement(children, {
              width,
              height,
              style: {
                ...childStyle,
                position: 'absolute',
                top: 0,
                left: 0,
                display: 'block',
                width: `${width}px`,
                height: `${height}px`,
              },
            })}
          </div>
        </div>
      </div>

      {label && <div className="pan-zoom-label">{label}</div>}

      {showControls && (
        <div className="pan-zoom-controls">
          <button onClick={zoomIn} title="Zoom In" aria-label="Zoom in" className="control-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
            </svg>
          </button>
          <button onClick={zoomOut} title="Zoom Out" aria-label="Zoom out" className="control-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35M8 11h6" />
            </svg>
          </button>
          <button
            onClick={resetView}
            title="Reset View (R key)"
            aria-label="Reset view"
            className="control-btn"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
          <button
            onClick={fitToScreen}
            title="Fit to Screen (F key)"
            aria-label="Fit to screen"
            className="control-btn"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
          <span className="zoom-indicator" aria-live="polite">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
