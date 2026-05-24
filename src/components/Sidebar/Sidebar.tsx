import {
  Archive,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Crosshair,
  GalleryVerticalEnd,
  Library,
  Lightbulb,
  MessageSquare,
  PanelLeft,
  Plus,
  Search,
  Settings,
  Star,
  SwatchBook,
} from 'lucide-react';
import { useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Item } from '../../lib/storage';
import { NewItemMenu } from '../Menu/NewItemMenu';
import { SidebarItem } from './SidebarItem';
import { SidebarSection } from './SidebarSection';

type SidebarProps = {
  activeItem: string;
  sidebarOpen: boolean;
  sidebarWidth: number;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
  onItemsImported?: (items: Item[]) => void;
  onNavClick: () => void;
  onLibraryClick: () => void;
  onFavoritesClick: () => void;
  onArchiveClick: () => void;
  onSettingsClick: () => void;
  onSearchClick: () => void;
  onLinkClick: () => void;
  showNewItemMenu: boolean;
  setShowNewItemMenu: Dispatch<SetStateAction<boolean>>;
};

export function Sidebar({
  activeItem,
  sidebarOpen,
  sidebarWidth,
  setSidebarOpen,
  onItemsImported,
  onNavClick,
  onLibraryClick,
  onFavoritesClick,
  onArchiveClick,
  onSettingsClick,
  onSearchClick,
  onLinkClick,
  showNewItemMenu,
  setShowNewItemMenu,
}: SidebarProps) {
  const newItemRef = useRef<HTMLDivElement>(null);

  return (
    <aside
      className="sidebar"
      style={{
        flexBasis: sidebarOpen ? `${sidebarWidth}px` : '0px',
        width: sidebarOpen ? `${sidebarWidth}px` : '0px',
        overflow: 'hidden',
      }}
    >
      <header className="sidebar-header">
        <div className="traffic-light-spacer" aria-hidden="true" />
        <div className="sidebar-actions">
          <button className="icon-button" type="button" aria-label="Back" onClick={() => {}}>
            <ArrowLeft size={16} color="var(--text-secondary)" />
          </button>
          <button className="icon-button" type="button" aria-label="New" onClick={() => {}}>
            <ArrowRight size={16} color="var(--text-secondary)" />
          </button>
          {sidebarOpen ? (
            <button
              className="icon-button"
              type="button"
              aria-label="Toggle sidebar"
              onClick={() => setSidebarOpen(false)}
            >
              <PanelLeft size={16} color="var(--text-secondary)" />
            </button>
          ) : null}
        </div>
      </header>

      <div className="sidebar-body">
        <nav className="sidebar-nav" aria-label="Primary">
          <SidebarItem
            ref={newItemRef}
            icon={<Plus size={16} />}
            label="New Item"
            isActive={showNewItemMenu}
            onClick={() => setShowNewItemMenu((prev) => !prev)}
          />
          {showNewItemMenu ? (
            <NewItemMenu
              anchorRef={newItemRef}
              onClose={() => setShowNewItemMenu(false)}
              onMediaClick={async () => {
                setShowNewItemMenu(false);

                if (!window.mikoshi) {
                  return;
                }

                onNavClick();

                const result = await window.mikoshi.openFileDialog();
                if (!result.canceled && result.filePaths.length > 0) {
                  console.log('Importing files from New Item', result.filePaths);
                  const imported = await window.mikoshi.importFiles(result.filePaths);
                  if (onItemsImported) onItemsImported(imported);
                }
              }}
              onLinkClick={() => {
                setShowNewItemMenu(false);
                onLinkClick();
              }}
            />
          ) : null}
          <SidebarItem icon={<Search size={16} strokeWidth={1.6} />} label="Search" onClick={onSearchClick} />
          <SidebarItem icon={<GalleryVerticalEnd size={16} strokeWidth={1.6} />} label="Library" active={activeItem === 'Library'} onClick={onLibraryClick} />
          <SidebarItem icon={<Star size={16} strokeWidth={1.6} />} label="Favorites" active={activeItem === 'Favorites'} onClick={onFavoritesClick} />
          <SidebarItem icon={<Archive size={16} strokeWidth={1.6} />} label="Archive" active={activeItem === 'Archive'} onClick={onArchiveClick} />
        </nav>

        <SidebarSection title="Spaces" actionIcon={ChevronDown}>
          <SidebarItem icon={<Library size={16} strokeWidth={1.6} />} label="References" onClick={onNavClick} />
          <SidebarItem icon={<SwatchBook size={16} strokeWidth={1.6} />} label="Mood" onClick={onNavClick} />
          <SidebarItem icon={<Lightbulb size={16} strokeWidth={1.6} />} label="Ideas" onClick={onNavClick} />
          <SidebarItem icon={<Crosshair size={16} strokeWidth={1.6} />} label="Current" onClick={onNavClick} />
        </SidebarSection>
      </div>

      <footer className="sidebar-footer">
        <SidebarItem icon={<MessageSquare size={16} strokeWidth={1.6} />} label="Feedback" onClick={onNavClick} />
        <SidebarItem icon={<Settings size={16} strokeWidth={1.6} />} label="Settings" active={activeItem === 'Settings'} onClick={onSettingsClick} />
      </footer>
    </aside>
  );
}
