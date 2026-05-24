import {
  Archive,
  FileAudio,
  Film,
  GalleryVerticalEnd,
  ImageIcon,
  Link,
  MessageCircle,
  Moon,
  Plus,
  Search,
  Settings,
  Star,
  Sun,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Dispatch, KeyboardEvent, ReactNode, SetStateAction } from 'react';
import type { Item, ItemType } from '../../lib/storage';
import type { Theme } from '../Layout/AppLayout';
import './CommandMenu.css';

type View = 'library' | 'favorites' | 'archive';

type CommandMenuProps = {
  items: Item[];
  theme: Theme;
  setTheme: Dispatch<SetStateAction<Theme>>;
  onClose: () => void;
  onNavigate: (view: View) => void;
  onOpenSettings: () => void;
  onNewItem: () => void;
};

type CommandRow = {
  id: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  rightLabel?: string;
  action: () => void;
};

type CommandSection = {
  title: string;
  rows: CommandRow[];
};

const iconsByType: Record<ItemType, ReactNode> = {
  image: <ImageIcon size={16} strokeWidth={1.6} />,
  video: <Film size={16} strokeWidth={1.6} />,
  audio: <FileAudio size={16} strokeWidth={1.6} />,
  link: <Link size={16} strokeWidth={1.6} />,
  tweet: <MessageCircle size={16} strokeWidth={1.6} />,
};

function themeLabel(theme: Theme) {
  return theme.charAt(0).toUpperCase() + theme.slice(1);
}

function nextTheme(theme: Theme): Theme {
  if (theme === 'dark') {
    return 'light';
  }

  if (theme === 'light') {
    return 'system';
  }

  return 'dark';
}

export function CommandMenu({ items, theme, setTheme, onClose, onNavigate, onOpenSettings, onNewItem }: CommandMenuProps) {
  const [query, setQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const quickActions = useMemo<CommandRow[]>(
    () => [
      {
        id: 'new-item',
        label: 'New Item',
        hint: '⌘N',
        icon: <Plus size={16} strokeWidth={1.6} />,
        action: () => {
          onClose();
          onNewItem();
        },
      },
      {
        id: 'switch-theme',
        label: `Switch Theme (${themeLabel(theme)})`,
        icon: theme === 'light' ? <Sun size={16} strokeWidth={1.6} /> : <Moon size={16} strokeWidth={1.6} />,
        action: () => {
          setTheme(nextTheme(theme));
        },
      },
      {
        id: 'open-settings',
        label: 'Open Settings',
        hint: '⌘,',
        icon: <Settings size={16} strokeWidth={1.6} />,
        action: () => {
          onClose();
          onOpenSettings();
        },
      },
    ],
    [onClose, onNewItem, onOpenSettings, setTheme, theme],
  );

  const libraryActions = useMemo<CommandRow[]>(
    () => [
      {
        id: 'go-library',
        label: 'Go to Library',
        icon: <GalleryVerticalEnd size={16} strokeWidth={1.6} />,
        action: () => {
          onClose();
          onNavigate('library');
        },
      },
      {
        id: 'go-favorites',
        label: 'Go to Favorites',
        icon: <Star size={16} strokeWidth={1.6} />,
        action: () => {
          onClose();
          onNavigate('favorites');
        },
      },
      {
        id: 'go-archive',
        label: 'Go to Archive',
        icon: <Archive size={16} strokeWidth={1.6} />,
        action: () => {
          onClose();
          onNavigate('archive');
        },
      },
    ],
    [onClose, onNavigate],
  );

  const sections = useMemo<CommandSection[]>(() => {
    if (!normalizedQuery) {
      return [
        { title: 'QUICK ACTIONS', rows: quickActions },
        { title: 'LIBRARY', rows: libraryActions },
      ];
    }

    const itemRows = items
      .filter((item) => item.title.toLowerCase().includes(normalizedQuery))
      .map<CommandRow>((item) => ({
        id: `item-${item.id}`,
        label: item.title,
        icon: iconsByType[item.type],
        rightLabel: item.type,
        action: () => {
          onClose();
          onNavigate(item.archived ? 'archive' : 'library');
        },
      }));
    const commandRows = [...quickActions, ...libraryActions].filter((action) =>
      action.label.toLowerCase().includes(normalizedQuery),
    );
    const nextSections: CommandSection[] = [];

    if (itemRows.length > 0) {
      nextSections.push({ title: 'ITEMS', rows: itemRows });
    }

    if (commandRows.length > 0) {
      nextSections.push({ title: 'COMMANDS', rows: commandRows });
    }

    return nextSections;
  }, [items, libraryActions, normalizedQuery, onClose, onNavigate, quickActions]);

  const rows = sections.flatMap((section) => section.rows);

  useEffect(() => {
    setFocusedIndex(0);
  }, [query]);

  useEffect(() => {
    if (focusedIndex > Math.max(rows.length - 1, 0)) {
      setFocusedIndex(Math.max(rows.length - 1, 0));
    }
  }, [focusedIndex, rows.length]);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setFocusedIndex((current) => (rows.length === 0 ? 0 : (current + 1) % rows.length));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setFocusedIndex((current) => (rows.length === 0 ? 0 : (current - 1 + rows.length) % rows.length));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      rows[focusedIndex]?.action();
    }
  };

  return createPortal(
    <>
      <div className="command-menu-backdrop" onClick={onClose} />
      <div className="command-menu" role="dialog" aria-modal="true" onKeyDown={handleKeyDown}>
        <div className="command-menu-search">
          <Search size={16} strokeWidth={1.6} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search or type a command..."
          />
        </div>
        <div className="command-menu-results">
          {sections.length > 0 ? (
            sections.map((section) => (
              <div className="command-menu-section" key={section.title}>
                <div className="command-menu-section-header">{section.title}</div>
                {section.rows.map((row) => {
                  const rowIndex = rows.indexOf(row);

                  return (
                    <button
                      className={rowIndex === focusedIndex ? 'command-menu-row is-focused' : 'command-menu-row'}
                      type="button"
                      key={row.id}
                      onClick={row.action}
                      onMouseEnter={() => setFocusedIndex(rowIndex)}
                    >
                      <span className="command-menu-row-icon">{row.icon}</span>
                      <span className="command-menu-row-label">{row.label}</span>
                      {row.rightLabel || row.hint ? <span className="command-menu-row-hint">{row.rightLabel || row.hint}</span> : null}
                    </button>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="command-menu-no-results">No results for &quot;{query}&quot;</div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
