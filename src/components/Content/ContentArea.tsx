import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Check,
  FileAudio,
  GalleryVerticalEnd,
  Image,
  Inbox,
  Link,
  LayoutGrid,
  List,
  ListFilter,
  PanelLeft,
  Star,
  Trash,
  Video,
} from 'lucide-react';
import { useEffect, useState, type Dispatch, type DragEvent, type MouseEvent, type SetStateAction } from 'react';
import type { Item } from '../../lib/storage';
import { SelectionTab } from '../Tab/SelectionTab';
import { EmptyState } from './EmptyState';
import { ListView } from './ListView';

type DroppedFile = File & {
  path?: string;
};

type ContentAreaProps = {
  activeView: 'library' | 'favorites' | 'archive';
  viewTitle: string;
  sidebarOpen: boolean;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
  items: Item[];
  setItems: Dispatch<SetStateAction<Item[]>>;
  refreshItems: () => Promise<void>;
};

type ContextMenuState = {
  item: Item;
  x: number;
  y: number;
};

function getBoundedContextMenuPosition(x: number, y: number) {
  const menuWidth = 200;
  const menuHeight = 170;

  if (x + menuWidth > window.innerWidth) {
    x = window.innerWidth - menuWidth - 8;
  }

  if (y + menuHeight > window.innerHeight) {
    y = window.innerHeight - menuHeight - 8;
  }

  return { x, y };
}

function fileUrl(filePath: string) {
  return `mikoshi://${encodeURI(filePath)}`;
}

function getDomain(url: string | null) {
  if (!url) {
    return '';
  }

  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function ItemCard({
  item,
  isSelected,
  onClick,
  onContextMenu,
}: {
  item: Item;
  isSelected: boolean;
  onClick: () => void;
  onContextMenu: (event: MouseEvent<HTMLElement>, item: Item) => void;
}) {
  const Icon = item.type === 'video' ? Video : item.type === 'audio' ? FileAudio : item.type === 'link' ? Link : Image;
  const mediaSrc = item.filename ? fileUrl(item.filename) : null;
  const [isHovered, setIsHovered] = useState(false);
  const [faviconFailed, setFaviconFailed] = useState(false);
  const showCheckbox = isHovered || isSelected;
  const linkDomain = getDomain(item.source_url);

  return (
    <article
      className={isSelected ? 'library-card is-selected' : 'library-card'}
      onClick={onClick}
      onContextMenu={(event) => onContextMenu(event, item)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="library-card-preview">
        {showCheckbox ? (
          <div className={isSelected ? 'card-checkbox checked' : 'card-checkbox'}>
            {isSelected ? <Check size={10} color="var(--bg-1)" /> : null}
          </div>
        ) : null}
        {item.type === 'image' && mediaSrc ? <img src={mediaSrc} alt={item.title} /> : null}
        {item.type === 'video' && mediaSrc ? <video src={mediaSrc} muted playsInline /> : null}
        {item.type === 'audio' ? <FileAudio size={28} strokeWidth={1.6} /> : null}
        {item.type === 'link' && item.thumbnail ? <img src={item.thumbnail} alt={item.title} /> : null}
        {item.type === 'link' && !item.thumbnail ? (
          <div className="link-card-placeholder">
            <Link size={24} strokeWidth={1.6} />
            <span>{linkDomain}</span>
          </div>
        ) : null}
      </div>
      <footer className="library-card-footer">
        {item.type === 'link' && item.favicon && !faviconFailed ? (
          <img
            className="link-card-favicon"
            src={item.favicon}
            alt=""
            onError={() => setFaviconFailed(true)}
          />
        ) : (
          <Icon size={14} strokeWidth={1.6} />
        )}
        <span>{item.title}</span>
      </footer>
    </article>
  );
}

export function ContentArea({ activeView, viewTitle, sidebarOpen, setSidebarOpen, items, refreshItems }: ContentAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    void refreshItems();
  }, [refreshItems]);

  useEffect(() => {
    setSelectedIds([]);
  }, [activeView, viewMode]);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    const closeContextMenu = () => setContextMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeContextMenu();
      }
    };

    window.addEventListener('click', closeContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', closeContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu]);

  const emptyState =
    activeView === 'favorites'
      ? { icon: <Star size={24} />, title: 'No favourites yet', subtitle: 'Star items to find them here' }
      : activeView === 'archive'
        ? { icon: <Archive size={24} />, title: 'Nothing in archive', subtitle: 'Archived items appear here' }
        : { icon: <Inbox size={24} />, title: 'Nothing in Library', subtitle: 'Add your first item to get started' };
  const headerIcon = {
    library: <GalleryVerticalEnd size={16} strokeWidth={1.6} color="var(--text-secondary)" />,
    favorites: <Star size={16} strokeWidth={1.6} color="var(--text-secondary)" />,
    archive: <Archive size={16} strokeWidth={1.6} color="var(--text-secondary)" />,
  }[activeView];

  const handleContextMenu = (event: MouseEvent<HTMLElement>, item: Item) => {
    event.preventDefault();
    setContextMenu({ item, ...getBoundedContextMenuPosition(event.clientX, event.clientY) });
  };

  const handleContextMenuAtPosition = (x: number, y: number, item: Item) => {
    setContextMenu({ item, ...getBoundedContextMenuPosition(x, y) });
  };

  const runItemAction = async (action: () => Promise<unknown>) => {
    if (!window.mikoshi) {
      return;
    }

    setContextMenu(null);
    await action();
    await refreshItems();
    setSelectedIds([]);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((currentSelectedIds) =>
      currentSelectedIds.includes(id)
        ? currentSelectedIds.filter((selectedId) => selectedId !== id)
        : [...currentSelectedIds, id],
    );
  };

  const handleToggleFavourite = async (id: string) => {
    console.log('toggleFavourite', id);

    if (!window.mikoshi.toggleFavourite) {
      console.error('toggleFavourite not exposed');
      return;
    }

    const updated = await window.mikoshi.toggleFavourite(id);
    console.log('result', updated);
    await refreshItems();
    setSelectedIds([]);
  };

  const handleArchiveItem = async (id: string) => {
    console.log('archiveItem', id);

    if (!window.mikoshi.archiveItem) {
      console.error('archiveItem not exposed');
      return;
    }

    const updated = await window.mikoshi.archiveItem(id);
    console.log('result', updated);
    await refreshItems();
    setSelectedIds([]);
  };

  const handleArchiveSelected = async () => {
    if (!window.mikoshi?.archiveItem) {
      return;
    }

    for (const id of selectedIds) {
      await window.mikoshi.archiveItem(id);
    }

    setSelectedIds([]);
    await refreshItems();
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget === event.target) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const filePaths = Array.from(event.dataTransfer.files as ArrayLike<DroppedFile>)
      .map((file) => file.path)
      .filter((filePath): filePath is string => Boolean(filePath));

    if (filePaths.length === 0) {
      return;
    }

    if (!window.mikoshi) {
      return;
    }

    console.log('Importing dropped files', filePaths);
    await window.mikoshi.importFiles(filePaths);
    await refreshItems();
  };

  return (
    <section className="content-panel">
      <header className="content-header">
        <div className="content-title">
          {!sidebarOpen ? (
            <>
              <div className="traffic-light-spacer" aria-hidden="true" />
              <button
                className="icon-button"
                type="button"
                aria-label="Toggle sidebar"
                onClick={() => setSidebarOpen(true)}
              >
                <PanelLeft size={16} color="var(--text-secondary)" />
              </button>
              <button className="icon-button" type="button" aria-label="Back" onClick={() => window.history.back()}>
                <ArrowLeft size={16} color="var(--text-secondary)" />
              </button>
              <button className="icon-button" type="button" aria-label="Forward" onClick={() => window.history.forward()}>
                <ArrowRight size={16} color="var(--text-secondary)" />
              </button>
              <div
                aria-hidden="true"
                style={{
                  width: '1px',
                  height: '16px',
                  flexShrink: 0,
                  borderRadius: '100px',
                  background: 'var(--border)',
                }}
              />
            </>
          ) : null}
          {headerIcon}
          <span>{viewTitle}</span>
        </div>
        <div className="content-actions">
          <button className="icon-button" type="button" aria-label="Filter" onClick={() => {}}>
            <ListFilter size={16} color="var(--text-secondary)" />
          </button>
          <button className="icon-button" type="button" aria-label="Sort" onClick={() => {}}>
            <ArrowUpDown size={16} color="var(--text-secondary)" />
          </button>
          <button
            className="icon-button is-active"
            type="button"
            aria-label={viewMode === 'grid' ? 'Grid view' : 'List view'}
            onClick={() => setViewMode((currentViewMode) => (currentViewMode === 'grid' ? 'list' : 'grid'))}
          >
            {viewMode === 'grid' ? (
              <LayoutGrid size={16} color="var(--text-secondary)" />
            ) : (
              <List size={16} color="var(--text-secondary)" />
            )}
          </button>
        </div>
      </header>
      <div
        className={isDragging ? 'content-body is-dragging' : 'content-body'}
        onClick={(event) => {
          if (event.currentTarget === event.target) {
            setSelectedIds([]);
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {items.length === 0 ? (
          <EmptyState icon={emptyState.icon} title={emptyState.title} subtitle={emptyState.subtitle} />
        ) : viewMode === 'list' ? (
          <ListView
            items={items}
            activeView={activeView}
            onContextMenu={handleContextMenu}
            onContextMenuAtPosition={handleContextMenuAtPosition}
            onArchiveItem={handleArchiveItem}
          />
        ) : (
          <div
            className="library-grid"
            onClick={(event) => {
              if (event.currentTarget === event.target) {
                setSelectedIds([]);
              }
            }}
          >
            {items.map((item) => (
              <ItemCard
                item={item}
                key={item.id}
                isSelected={selectedIds.includes(item.id)}
                onClick={() => toggleSelected(item.id)}
                onContextMenu={handleContextMenu}
              />
            ))}
          </div>
        )}
        {viewMode === 'grid' && selectedIds.length > 0 ? (
          <SelectionTab
            selectedCount={selectedIds.length}
            onArchive={() => {
              void handleArchiveSelected();
            }}
            onReset={() => setSelectedIds([])}
          />
        ) : null}
      </div>
      {contextMenu ? (
        <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(event) => event.stopPropagation()}>
          {activeView === 'archive' ? (
            <>
              <button
                className="context-menu-item"
                type="button"
                onClick={() => runItemAction(() => window.mikoshi.unarchiveItem(contextMenu.item.id))}
              >
                <ArchiveRestore size={15} strokeWidth={1.7} />
                <span>Restore from Archive</span>
              </button>
              <div className="context-menu-divider" />
              <button
                className="context-menu-item context-menu-item-danger"
                type="button"
                onClick={() => runItemAction(() => window.mikoshi.deleteItem(contextMenu.item.id))}
              >
                <Trash size={15} strokeWidth={1.7} />
                <span>Delete</span>
              </button>
            </>
          ) : (
            <>
              <button
                className="context-menu-item"
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  void handleToggleFavourite(contextMenu.item.id);
                }}
              >
                <Star size={15} strokeWidth={1.7} />
                <span>
                  {activeView === 'favorites' || contextMenu.item.favourite ? 'Remove from Favourites' : 'Add to Favourites'}
                </span>
              </button>
              <button
                className="context-menu-item"
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  void handleArchiveItem(contextMenu.item.id);
                }}
              >
                <Archive size={15} strokeWidth={1.7} />
                <span>Move to Archive</span>
              </button>
              <div className="context-menu-divider" />
              <button
                className="context-menu-item context-menu-item-danger"
                type="button"
                onClick={() => runItemAction(() => window.mikoshi.deleteItem(contextMenu.item.id))}
              >
                <Trash size={15} strokeWidth={1.7} />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
