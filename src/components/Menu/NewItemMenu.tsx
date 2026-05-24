import { ImageIcon, Link } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { RefObject } from 'react';

type NewItemMenuProps = {
  anchorRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onMediaClick: () => void;
  onLinkClick: () => void;
};

export function NewItemMenu({ anchorRef, onClose, onMediaClick, onLinkClick }: NewItemMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 12 });

  useEffect(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({
        top: rect.bottom + 4,
        left: 12,
      });
    }
  }, [anchorRef]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (menuRef.current?.contains(target) || anchorRef.current?.contains(target)) {
        return;
      }

      onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [anchorRef, onClose]);

  return createPortal(
    <div ref={menuRef} className="new-item-menu" style={position}>
      <div className="new-item-menu-item" onClick={onMediaClick}>
        <ImageIcon size={16} />
        <span>Media</span>
      </div>
      <div className="new-item-menu-item" onClick={onLinkClick}>
        <Link size={16} />
        <span>Link</span>
      </div>
    </div>,
    document.body,
  );
}
