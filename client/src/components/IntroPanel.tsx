import { useCallback, useEffect, useState } from 'react';
import './IntroPanel.css';

const STORAGE_KEY = '6v.introDismissed';

function readDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function IntroPanel() {
  const [dismissed, setDismissed] = useState<boolean>(readDismissed);
  const [expanded, setExpanded] = useState<boolean>(false);

  // Persist dismissal so the intro stays closed across reloads.
  useEffect(() => {
    try {
      if (dismissed) {
        localStorage.setItem(STORAGE_KEY, 'true');
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore storage failures (e.g. private mode); intro simply won't persist.
    }
  }, [dismissed]);

  const handleDismiss = useCallback(() => setDismissed(true), []);
  const handleReopen = useCallback(() => setDismissed(false), []);
  const handleToggle = useCallback(() => setExpanded((prev) => !prev), []);

  if (dismissed) {
    return (
      <div className="intro-reopen">
        <button
          type="button"
          className="intro-reopen__button"
          onClick={handleReopen}
          aria-label="Show the introduction: what am I looking at?"
        >
          What is this?
        </button>
      </div>
    );
  }

  return (
    <section className="intro-panel" aria-labelledby="intro-panel-heading">
      <div className="intro-panel__bar">
        <p className="intro-panel__lede" id="intro-panel-heading">
          <span className="intro-panel__title">You&rsquo;re looking at square ice.</span>{' '}
          <span className="intro-panel__tagline">
            Every junction obeys the ice rule &mdash; two bonds in, two out.
          </span>
        </p>
        <div className="intro-panel__actions">
          <button
            type="button"
            className="intro-panel__more"
            onClick={handleToggle}
            aria-expanded={expanded}
            aria-controls="intro-panel-detail"
          >
            {expanded ? 'Less' : 'Learn more'}
          </button>
          <button
            type="button"
            className="intro-panel__dismiss"
            onClick={handleDismiss}
            aria-label="Dismiss the introduction"
          >
            &times;
          </button>
        </div>
      </div>
      {expanded && (
        <div id="intro-panel-detail" className="intro-panel__detail">
          <p className="intro-panel__body">
            Picture water molecules frozen on a grid where every junction obeys one rule &mdash; the
            ice rule: exactly two bonds point in and two point out. There are only six ways a
            junction can do this: the six vertex types. Each picture is one valid arrangement out of
            an astronomical number, and the simulator nudges it at random, one local move (a
            &lsquo;flip&rsquo;) at a time. With the default domain-wall boundary, the corners freeze
            into rigid order while a circular central region stays liquid-like and random &mdash;
            the famous Arctic circle.
          </p>
          <p className="intro-panel__hint">New here? Try a preset below to see it.</p>
        </div>
      )}
    </section>
  );
}

export default IntroPanel;
