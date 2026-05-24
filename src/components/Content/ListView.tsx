import { Archive, Check, Film, FolderInput, ImageIcon, Link, MessageCircle, MoreHorizontal, Music } from 'lucide-react';
import { useState } from 'react';
import type { MouseEvent } from 'react';
import type { Item, ItemType } from '../../lib/storage';

type ListViewProps = {
  items: Item[];
  activeView: 'library' | 'favorites' | 'archive';
  onContextMenu: (event: MouseEvent<HTMLElement>, item: Item) => void;
  onContextMenuAtPosition: (x: number, y: number, item: Item) => void;
  onArchiveItem: (id: string) => Promise<void>;
};

const iconsByType: Record<ItemType, typeof ImageIcon> = {
  image: ImageIcon,
  video: Film,
  audio: Music,
  link: Link,
  tweet: MessageCircle,
};

function fileUrl(filePath: string) {
  return `mikoshi://${encodeURI(filePath)}`;
}

function ListRowThumbnail({
  item,
  icon: Icon,
  isSelected,
  showCheckbox,
}: {
  item: Item;
  icon: typeof ImageIcon;
  isSelected: boolean;
  showCheckbox: boolean;
}) {
  const [faviconFailed, setFaviconFailed] = useState(false);

  if (showCheckbox) {
    return (
      <div className={isSelected ? 'list-row-checkbox checked' : 'list-row-checkbox'}>
        {isSelected ? <Check size={10} strokeWidth={2.4} /> : null}
      </div>
    );
  }

  if (item.type === 'link') {
    if (item.favicon && !faviconFailed) {
      return (
        <img
          className="list-row-thumbnail"
          src={item.favicon}
          alt=""
          onError={() => setFaviconFailed(true)}
        />
      );
    }

    return <Link size={16} color="var(--text-secondary)" strokeWidth={1.6} />;
  }

  if (item.type === 'image' && item.filename) {
    return <img className="list-row-thumbnail" src={fileUrl(item.filename)} alt={item.title} />;
  }

  return (
    <span className="list-row-thumbnail">
      <Icon size={20} color="var(--text-secondary)" strokeWidth={1.6} />
    </span>
  );
}

export function ListView({ items, activeView, onContextMenu, onContextMenuAtPosition, onArchiveItem }: ListViewProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelected = (id: string) => {
    setSelectedIds((currentSelectedIds) =>
      currentSelectedIds.includes(id)
        ? currentSelectedIds.filter((selectedId) => selectedId !== id)
        : [...currentSelectedIds, id],
    );
  };

  return (
    <div
      className="list-view"
      data-active-view={activeView}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        height: '100%',
        overflowY: 'auto',
      }}
    >
      {items.map((item) => {
        const Icon = iconsByType[item.type];
        const isHovered = hoveredId === item.id;
        const isSelected = selectedIds.includes(item.id);
        const showCheckbox = isHovered || isSelected;
        const rowClassName = `list-row${isHovered ? ' is-hovered' : ''}${isSelected ? ' is-selected' : ''}`;

        return (
          <div
            className={rowClassName}
            key={item.id}
            onClick={() => toggleSelected(item.id)}
            onContextMenu={(event) => onContextMenu(event, item)}
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div className="list-row-left-slot">
              <ListRowThumbnail item={item} icon={Icon} isSelected={isSelected} showCheckbox={showCheckbox} />
            </div>
            <div className="list-row-left">
              <span className="list-row-title">{item.title}</span>
            </div>
            <div className="list-row-actions">
              <button
                className="list-action-btn"
                type="button"
                aria-label="Move to"
                onClick={(event) => {
                  event.stopPropagation();
                }}
              >
                <FolderInput size={16} strokeWidth={1.6} />
              </button>
              <button
                className="list-action-btn"
                type="button"
                aria-label="Archive"
                onClick={(event) => {
                  event.stopPropagation();
                  void onArchiveItem(item.id);
                }}
              >
                <Archive size={16} strokeWidth={1.6} />
              </button>
              <button
                className="list-action-btn"
                type="button"
                aria-label="More"
                onClick={(event) => {
                  event.stopPropagation();
                  const rect = event.currentTarget.getBoundingClientRect();
                  onContextMenuAtPosition(rect.left, rect.bottom + 4, item);
                }}
              >
                <MoreHorizontal size={16} strokeWidth={1.6} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
