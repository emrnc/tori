import { Archive, FolderInput, X } from 'lucide-react';

type SelectionTabProps = {
  selectedCount: number;
  onArchive: () => void;
  onReset: () => void;
};

export function SelectionTab({ selectedCount, onArchive, onReset }: SelectionTabProps) {
  return (
    <div className="selection-tab">
      <span className="selection-tab-count">{selectedCount} Selected</span>
      <div className="selection-tab-divider" />
      <button className="selection-tab-btn" type="button" onClick={() => {}}>
        <FolderInput size={16} strokeWidth={1.6} />
        <span>Move to</span>
      </button>
      <button className="selection-tab-btn" type="button" onClick={onArchive}>
        <Archive size={16} strokeWidth={1.6} />
        <span>Archive</span>
      </button>
      <button className="selection-tab-btn" type="button" onClick={onReset}>
        <X size={16} strokeWidth={1.6} />
        <span>Reset</span>
      </button>
    </div>
  );
}
