/**
 * "Copy share link" button (issue #60).
 *
 * Encodes the current simulator config into the URL, copies that link to the
 * clipboard, and reflects it in the address bar so the page itself is shareable.
 * The lattice state is not encoded — a config + seed reproduces the run.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { buildShareUrl, encodeConfig, type ShareableConfig } from '../lib/six-vertex/configUrl';
import './SaveLoadPanel.css';

interface ShareConfigButtonProps {
  /** Returns the current config to encode at click time (always up to date). */
  getConfig: () => ShareableConfig;
}

export const ShareConfigButton: React.FC<ShareConfigButtonProps> = ({ getConfig }) => {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const flash = useCallback((next: 'copied' | 'error') => {
    setStatus(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setStatus('idle'), 2000);
  }, []);

  const handleShare = useCallback(async () => {
    const config = getConfig();
    const url = buildShareUrl(config, window.location.href);

    // Reflect the config in the address bar without reloading or adding history.
    window.history.replaceState(null, '', `?${encodeConfig(config).toString()}`);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        flash('copied');
      } else {
        // Older browsers / insecure contexts: the URL is at least in the bar.
        flash('error');
      }
    } catch {
      flash('error');
    }
  }, [getConfig, flash]);

  const label =
    status === 'copied'
      ? 'Link copied!'
      : status === 'error'
        ? 'Copied to address bar'
        : 'Copy share link';

  return (
    <div className="save-load-section">
      <div className="save-load-panel">
        <div className="save-load-panel__section">
          <h4>Share</h4>
          <p className="save-load-panel__hint">
            Copy a link that reproduces this exact configuration and seed.
          </p>
          <button
            type="button"
            className="save-load-panel__button save-load-panel__button--primary"
            onClick={handleShare}
            aria-live="polite"
          >
            {label}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareConfigButton;
