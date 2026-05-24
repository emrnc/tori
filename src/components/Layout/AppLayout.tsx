import { useCallback, useEffect, useRef, useState } from 'react';
import type { Item } from '../../lib/storage';
import { CommandMenu } from '../CommandMenu/CommandMenu';
import { ContentArea } from '../Content/ContentArea';
import { AddLinkModal } from '../Modal/AddLinkModal';
import { Settings } from '../Settings/Settings';
import { Sidebar } from '../Sidebar/Sidebar';

export type Theme = 'dark' | 'light' | 'system';
type View = 'library' | 'favorites' | 'archive';
const DEFAULT_SIDEBAR_WIDTH = 240;
const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 256;
const SIDEBAR_WIDTH_STORAGE_KEY = 'tori-sidebar-width';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    const initial = saved ? parseInt(saved, 10) : DEFAULT_SIDEBAR_WIDTH;

    if (Number.isNaN(initial) || initial < MIN_SIDEBAR_WIDTH || initial > MAX_SIDEBAR_WIDTH) {
      return DEFAULT_SIDEBAR_WIDTH;
    }

    return initial;
  });
  const [items, setItems] = useState<Item[]>([]);
  const [activeView, setActiveView] = useState<View>('library');
  const [showSettings, setShowSettings] = useState(false);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [showNewItemMenu, setShowNewItemMenu] = useState(false);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [resizing, setResizing] = useState(false);
  const isResizing = useRef(false);
  const sidebarOpenRef = useRef(sidebarOpen);
  const sidebarWidthRef = useRef(sidebarWidth);
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('tori-theme') as Theme) || 'dark';
  });

  useEffect(() => {
    sidebarOpenRef.current = sidebarOpen;
  }, [sidebarOpen]);

  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  const stopResize = () => {
    isResizing.current = false;
    setResizing(false);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', stopResize);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidthRef.current));
  };

  const onMouseMove = (event: MouseEvent) => {
    if (!isResizing.current) {
      return;
    }

    const newWidth = event.clientX;

    if (newWidth < MIN_SIDEBAR_WIDTH) {
      const wasOpen = sidebarOpenRef.current;
      sidebarOpenRef.current = false;
      setSidebarOpen(false);
      if (wasOpen) {
        stopResize();
      }
      return;
    }

    if (newWidth > MAX_SIDEBAR_WIDTH) {
      sidebarWidthRef.current = MAX_SIDEBAR_WIDTH;
      setSidebarWidth(MAX_SIDEBAR_WIDTH);
      return;
    }

    sidebarWidthRef.current = newWidth;
    setSidebarWidth(newWidth);
    sidebarOpenRef.current = true;
    setSidebarOpen(true);
  };

  const startResize = () => {
    isResizing.current = true;
    setResizing(true);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', stopResize);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const refreshItems = useCallback(async () => {
    if (!window.mikoshi) {
      return;
    }

    setItems(await window.mikoshi.initStorage());
  }, []);

  useEffect(() => {
    if (!window.mikoshi) {
      return;
    }

    window.mikoshi.onItemRemoved((id: string) => {
      setItems((prevItems) => prevItems.filter((item) => item.id !== id));
    });

    window.mikoshi.onItemsChanged(() => {
      void refreshItems();
    });
  }, [refreshItems]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'k' && event.metaKey) {
        event.preventDefault();
        setShowCommandMenu((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const apply = (themeToApply: Theme) => {
      if (themeToApply === 'dark') {
        document.documentElement.removeAttribute('data-theme');
      } else if (themeToApply === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (isDark) {
          document.documentElement.removeAttribute('data-theme');
        } else {
          document.documentElement.setAttribute('data-theme', 'light');
        }
      }
    };

    apply(theme);
    localStorage.setItem('tori-theme', theme);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (theme === 'system') {
        apply('system');
      }
    };

    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const visibleItems = items.filter((item) => {
    if (activeView === 'library') {
      return !item.archived;
    }

    if (activeView === 'favorites') {
      return item.favourite && !item.archived;
    }

    if (activeView === 'archive') {
      return item.archived;
    }

    return true;
  });
  const viewTitle = activeView === 'library' ? 'Library' : activeView === 'favorites' ? 'Favorites' : 'Archive';

  return (
    <>
      {showSettings ? (
        <Settings theme={theme} setTheme={setTheme} onBackToApp={() => setShowSettings(false)} />
      ) : (
        <div className="app-shell">
          <Sidebar
            activeItem={viewTitle}
            sidebarOpen={sidebarOpen}
            sidebarWidth={sidebarWidth}
            setSidebarOpen={setSidebarOpen}
            onItemsImported={() => {
              void refreshItems();
            }}
            onNavClick={() => setShowSettings(false)}
            onLibraryClick={() => {
              setActiveView('library');
              setShowSettings(false);
            }}
            onFavoritesClick={() => {
              setActiveView('favorites');
              setShowSettings(false);
            }}
            onArchiveClick={() => {
              setActiveView('archive');
              setShowSettings(false);
            }}
            onSettingsClick={() => setShowSettings(true)}
            onSearchClick={() => setShowCommandMenu(true)}
            onLinkClick={() => setShowAddLinkModal(true)}
            showNewItemMenu={showNewItemMenu}
            setShowNewItemMenu={setShowNewItemMenu}
          />
          <div
            className={resizing ? 'sidebar-resize-handle is-resizing' : 'sidebar-resize-handle'}
            onMouseDown={startResize}
          />
          <main className="main-shell">
            <ContentArea
              activeView={activeView}
              viewTitle={viewTitle}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              items={visibleItems}
              setItems={setItems}
              refreshItems={refreshItems}
            />
          </main>
        </div>
      )}
      {showCommandMenu ? (
        <CommandMenu
          items={items}
          theme={theme}
          setTheme={setTheme}
          onClose={() => setShowCommandMenu(false)}
          onNavigate={(view) => {
            setActiveView(view);
            setShowSettings(false);
          }}
          onOpenSettings={() => setShowSettings(true)}
          onNewItem={() => {
            setShowSettings(false);
            setShowNewItemMenu(true);
          }}
        />
      ) : null}
      {showAddLinkModal ? (
        <AddLinkModal
          onClose={() => setShowAddLinkModal(false)}
          onSave={(item) => {
            setItems((prevItems) => [...prevItems, item]);
            setShowAddLinkModal(false);
          }}
          refreshItems={refreshItems}
        />
      ) : null}
    </>
  );
}
