/**
 * UI component for saving and loading simulations
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  storageService,
  type SavedSimulation,
  type SimulationData,
  type SaveResult,
  type LoadResult,
} from '../lib/storage';
import {
  serializeToJson,
  simulationToCsv,
  deserializeSimulation,
  SixVParseError,
} from '../lib/six-vertex/serialization';
import './SaveLoadPanel.css';

interface SaveLoadPanelProps {
  /**
   * Get the current simulation data
   */
  getCurrentData: () => SimulationData | null;

  /**
   * Load simulation data into the simulator
   */
  onLoadData: (data: SimulationData) => void;

  /**
   * Optional callback when save completes
   */
  onSaveComplete?: (result: SaveResult) => void;

  /**
   * Optional callback when load completes
   */
  onLoadComplete?: (result: LoadResult) => void;
}

export const SaveLoadPanel: React.FC<SaveLoadPanelProps> = ({
  getCurrentData,
  onLoadData,
  onSaveComplete,
  onLoadComplete,
}) => {
  const [saves, setSaves] = useState<SavedSimulation[]>([]);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [selectedSaveId, setSelectedSaveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [storageStats, setStorageStats] = useState<{
    totalSaves: number;
    totalSize: string;
    usagePercent?: number;
  } | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);
  const [useCompression, setUseCompression] = useState(true);

  // Load saves on mount and after changes
  const loadSaves = useCallback(async () => {
    setIsLoading(true);
    try {
      const allSaves = await storageService.getAllSaves();
      setSaves(allSaves);

      // Update storage stats
      const stats = await storageService.getFormattedStats();
      setStorageStats(stats);
    } catch (err) {
      console.error('Failed to load saves:', err);
      setError('Failed to load saved simulations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSaves();
  }, [loadSaves]);

  // Handle save
  const handleSave = async () => {
    if (!saveName.trim()) {
      setError('Please enter a name for the save');
      return;
    }

    const data = getCurrentData();
    if (!data) {
      setError('No simulation data to save');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await storageService.save(data, {
        name: saveName.trim(),
        description: saveDescription.trim() || undefined,
        compress: useCompression,
        overwrite: false,
      });

      if (result.success) {
        setSuccess(`Simulation saved as "${saveName}"`);
        setSaveName('');
        setSaveDescription('');
        await loadSaves();
        onSaveComplete?.(result);
      } else {
        setError(result.error || 'Failed to save simulation');
      }
    } catch (err) {
      console.error('Save error:', err);
      setError('An error occurred while saving');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle load
  const handleLoad = async (id: string) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await storageService.load(id, {
        validateChecksum: true,
      });

      if (result.success && result.data) {
        onLoadData(result.data);
        setSuccess('Simulation loaded successfully');
        setSelectedSaveId(id);
        onLoadComplete?.(result);
      } else {
        setError(result.error || 'Failed to load simulation');
      }
    } catch (err) {
      console.error('Load error:', err);
      setError('An error occurred while loading');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setShowConfirmDelete(null);

    try {
      const success = await storageService.delete(id);
      if (success) {
        setSuccess('Save deleted successfully');
        if (selectedSaveId === id) {
          setSelectedSaveId(null);
        }
        await loadSaves();
      } else {
        setError('Failed to delete save');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError('An error occurred while deleting');
    } finally {
      setIsLoading(false);
    }
  };

  // Clear messages after a delay
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Format date for display
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // --- Import / Export (portable files, clipboard, CSV) ---
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerDownload = useCallback((contents: string, filename: string, mime: string) => {
    const blob = new Blob([contents], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportFile = useCallback(() => {
    const data = getCurrentData();
    if (!data) {
      setError('No simulation to export');
      return;
    }
    const n = data.latticeState.width;
    triggerDownload(serializeToJson(data), `6vertex-${n}x${n}.6v.json`, 'application/json');
    setSuccess('Exported configuration file');
  }, [getCurrentData, triggerDownload]);

  const handleCopyJson = useCallback(async () => {
    const data = getCurrentData();
    if (!data) {
      setError('No simulation to copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(serializeToJson(data));
      setSuccess('Configuration copied to clipboard');
    } catch {
      setError('Clipboard not available; use Export file instead');
    }
  }, [getCurrentData]);

  const handleExportCsv = useCallback(() => {
    const data = getCurrentData();
    if (!data) {
      setError('No simulation to export');
      return;
    }
    const n = data.latticeState.width;
    triggerDownload(simulationToCsv(data), `6vertex-${n}x${n}.csv`, 'text/csv');
    setSuccess('Exported vertex grid as CSV');
  }, [getCurrentData, triggerDownload]);

  const handleImportFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = ''; // allow re-importing the same file
      if (!file) return;
      try {
        const text = await file.text();
        const data = deserializeSimulation(text);
        onLoadData(data);
        setSuccess(`Imported ${data.latticeState.width}×${data.latticeState.height} lattice`);
      } catch (err) {
        setError(err instanceof SixVParseError ? err.message : 'Failed to import file');
      }
    },
    [onLoadData],
  );

  return (
    <div className="save-load-section">
      <div className="save-load-panel">
        <div className="save-load-panel__header">
          <h3>
            <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V2"
              />
            </svg>
            Save & Load
          </h3>
          {storageStats && (
            <div className="save-load-panel__stats">
              <span>{storageStats.totalSaves} saves</span>
              <span>{storageStats.totalSize}</span>
              {storageStats.usagePercent !== undefined && (
                <span>{storageStats.usagePercent}% used</span>
              )}
            </div>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="save-load-panel__message save-load-panel__message--error">{error}</div>
        )}
        {success && (
          <div className="save-load-panel__message save-load-panel__message--success">
            {success}
          </div>
        )}

        {/* Save Section */}
        <div className="save-load-panel__section">
          <h4>Save Current State</h4>
          <div className="save-load-panel__form">
            <input
              type="text"
              placeholder="Save name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              maxLength={50}
              disabled={isLoading}
            />
            <textarea
              placeholder="Description (optional)"
              value={saveDescription}
              onChange={(e) => setSaveDescription(e.target.value)}
              maxLength={200}
              rows={2}
              disabled={isLoading}
            />
            <div className="save-load-panel__options">
              <label className="save-load-panel__checkbox">
                <input
                  type="checkbox"
                  checked={useCompression}
                  onChange={(e) => setUseCompression(e.target.checked)}
                  disabled={isLoading}
                />
                <span>Use compression</span>
              </label>
            </div>
            <button
              onClick={handleSave}
              disabled={isLoading || !saveName.trim()}
              className="save-load-panel__button save-load-panel__button--primary"
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Import / Export Section */}
        <div className="save-load-panel__section">
          <h4>Import / Export</h4>
          <p className="save-load-panel__hint">
            Portable <code>.6v.json</code> files (any lattice size), or a CSV of the vertex grid.
          </p>
          <div className="save-load-panel__io-actions">
            <button
              onClick={handleExportFile}
              className="save-load-panel__button"
              title="Download a .6v.json file of the current lattice and parameters"
            >
              Export file
            </button>
            <button
              onClick={handleCopyJson}
              className="save-load-panel__button"
              title="Copy the configuration JSON to the clipboard"
            >
              Copy JSON
            </button>
            <button
              onClick={handleExportCsv}
              className="save-load-panel__button"
              title="Download the vertex-type grid as CSV"
            >
              Export CSV
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="save-load-panel__button save-load-panel__button--primary"
              title="Load a .6v.json file"
            >
              Import file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.6v.json,application/json"
              onChange={handleImportFile}
              style={{ display: 'none' }}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Load Section */}
        <div className="save-load-panel__section">
          <h4>Saved Simulations</h4>
          {saves.length === 0 ? (
            <div className="save-load-panel__empty">No saved simulations yet</div>
          ) : (
            <div className="save-load-panel__saves">
              {saves.map((save) => (
                <div
                  key={save.id}
                  className={`save-load-panel__save-item ${
                    selectedSaveId === save.id ? 'save-load-panel__save-item--selected' : ''
                  }`}
                >
                  <div className="save-load-panel__save-header">
                    <h5>{save.name}</h5>
                    <span className="save-load-panel__save-date">{formatDate(save.updatedAt)}</span>
                  </div>
                  {save.description && (
                    <p className="save-load-panel__save-description">{save.description}</p>
                  )}
                  <div className="save-load-panel__save-metadata">
                    <span>
                      {save.metadata.latticeSize.width}×{save.metadata.latticeSize.height}
                    </span>
                    <span>{save.metadata.totalSteps.toLocaleString()} steps</span>
                    {save.metadata.compression === 'lz-string' && <span>Compressed</span>}
                  </div>
                  <div className="save-load-panel__save-actions">
                    <button
                      onClick={() => handleLoad(save.id)}
                      disabled={isLoading}
                      className="save-load-panel__button"
                    >
                      Load
                    </button>
                    {showConfirmDelete === save.id ? (
                      <>
                        <button
                          onClick={() => handleDelete(save.id)}
                          disabled={isLoading}
                          className="save-load-panel__button save-load-panel__button--danger"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setShowConfirmDelete(null)}
                          disabled={isLoading}
                          className="save-load-panel__button"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setShowConfirmDelete(save.id)}
                        disabled={isLoading}
                        className="save-load-panel__button save-load-panel__button--danger"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
