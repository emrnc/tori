import { ArrowLeft, ArrowRight, ChevronLeft, Database, LayoutGrid, PanelLeft } from 'lucide-react';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { Theme } from '../Layout/AppLayout';

type SettingsProps = {
  theme: Theme;
  setTheme: Dispatch<SetStateAction<Theme>>;
  onBackToApp: () => void;
};

const themeOptions: Theme[] = ['dark', 'light', 'system'];
const emptyStorageStats = {
  total: 0,
  images: 0,
  videos: 0,
  audio: 0,
  links: 0,
  sizeMB: 0,
};

function themeLabel(theme: Theme) {
  return theme.charAt(0).toUpperCase() + theme.slice(1);
}

export function Settings({ theme, setTheme, onBackToApp }: SettingsProps) {
  const [settingsView, setSettingsView] = useState<'general' | 'storage'>('general');
  const [storagePath, setStoragePath] = useState('');
  const [storageStats, setStorageStats] = useState(emptyStorageStats);

  useEffect(() => {
    if (settingsView !== 'storage' || !window.mikoshi) {
      return;
    }

    let cancelled = false;

    async function loadStorage() {
      const [path, stats] = await Promise.all([window.mikoshi.getStoragePath(), window.mikoshi.getStorageStats()]);

      if (!cancelled) {
        setStoragePath(path);
        setStorageStats(stats);
      }
    }

    void loadStorage();

    return () => {
      cancelled = true;
    };
  }, [settingsView]);

  async function handleChangeStoragePath() {
    if (!window.mikoshi) {
      return;
    }

    const newPath = await window.mikoshi.changeStoragePath();

    if (newPath) {
      setStoragePath(newPath);
      setStorageStats(await window.mikoshi.getStorageStats());
    }
  }

  return (
    <div className="settings-shell">
      <aside className="settings-sidebar">
        <header className="settings-sidebar-header" data-tauri-drag-region>
          <div className="traffic-light-spacer" aria-hidden="true" />
          <div className="sidebar-actions">
            <button className="icon-button" type="button" aria-label="Back" onClick={() => {}}>
              <ArrowLeft size={16} color="var(--text-secondary)" />
            </button>
            <button className="icon-button" type="button" aria-label="Forward" onClick={() => {}}>
              <ArrowRight size={16} color="var(--text-secondary)" />
            </button>
            <button className="icon-button" type="button" aria-label="Toggle sidebar" onClick={() => {}}>
              <PanelLeft size={16} color="var(--text-secondary)" />
            </button>
          </div>
        </header>

        <div className="settings-sidebar-body">
          <button className="settings-sidebar-item" type="button" onClick={onBackToApp}>
            <ChevronLeft size={16} strokeWidth={1.6} />
            <span>Back to App</span>
          </button>

          <nav className="settings-nav" aria-label="Settings">
            <button
              className={settingsView === 'general' ? 'settings-sidebar-item is-active' : 'settings-sidebar-item'}
              type="button"
              onClick={() => setSettingsView('general')}
            >
              <LayoutGrid size={16} strokeWidth={1.6} />
              <span>General</span>
            </button>
            <button
              className={settingsView === 'storage' ? 'settings-sidebar-item is-active' : 'settings-sidebar-item'}
              type="button"
              onClick={() => setSettingsView('storage')}
            >
              <Database size={16} strokeWidth={1.6} />
              <span>Storage</span>
            </button>
          </nav>
        </div>
      </aside>

      <main className="settings-main">
        <div className="settings-container">
          {settingsView === 'general' ? (
            <section>
              <h1 className="settings-section-title">General</h1>
              <div className="settings-row">
                <span className="settings-row-label">Appearance</span>
                <div className="theme-options" aria-label="Appearance">
                  {themeOptions.map((option) => (
                    <button
                      className={theme === option ? 'theme-option is-active' : 'theme-option'}
                      key={option}
                      type="button"
                      onClick={() => setTheme(option)}
                    >
                      {themeLabel(option)}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          ) : (
            <>
              <section>
                <h1 className="settings-section-title">Storage Location</h1>
                <div className="settings-row">
                  <span className="settings-row-label">Storage Folder</span>
                  <div className="storage-path-controls">
                    <span className="storage-path-text" title={storagePath}>
                      {storagePath}
                    </span>
                    <button className="storage-change-button" type="button" onClick={handleChangeStoragePath}>
                      Change
                    </button>
                  </div>
                </div>
              </section>

              <div className="settings-divider" />

              <section>
                <h1 className="settings-section-title">Library Stats</h1>
                <div className="storage-stats-grid">
                  <div className="storage-stat-card">
                    <span className="storage-stat-count">{storageStats.total}</span>
                    <span className="storage-stat-label">Total items</span>
                  </div>
                  <div className="storage-stat-card">
                    <span className="storage-stat-count">{storageStats.images}</span>
                    <span className="storage-stat-label">Images</span>
                  </div>
                  <div className="storage-stat-card">
                    <span className="storage-stat-count">{storageStats.videos}</span>
                    <span className="storage-stat-label">Videos</span>
                  </div>
                  <div className="storage-stat-card">
                    <span className="storage-stat-count">{storageStats.audio}</span>
                    <span className="storage-stat-label">Audio</span>
                  </div>
                  <div className="storage-stat-card">
                    <span className="storage-stat-count">{storageStats.links}</span>
                    <span className="storage-stat-label">Links</span>
                  </div>
                  <div className="storage-stat-card">
                    <span className="storage-stat-count">{storageStats.sizeMB}</span>
                    <span className="storage-stat-label">MB stored</span>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
