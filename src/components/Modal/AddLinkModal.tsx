import { Link } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Item } from '../../lib/storage';

type AddLinkModalProps = {
  onClose: () => void;
  onSave: (item: Item) => void;
  refreshItems: () => Promise<void>;
};

const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'fbclid',
  'gclid',
  'gclsrc',
  'dclid',
  'ref',
  'source',
  'mc_cid',
  'mc_eid',
  '_ga',
  '_gl',
  'igshid',
  'twclid',
  'si',
  'feature',
  'pp',
];

function normalizeURL(input: string): string {
  const trimmed = input.trim();

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

function cleanURL(url: string): string {
  try {
    const parsedUrl = new URL(url);
    TRACKING_PARAMS.forEach((param) => parsedUrl.searchParams.delete(param));
    return parsedUrl.toString();
  } catch {
    return url;
  }
}

function getDomain(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function AddLinkModal({ onClose, onSave, refreshItems }: AddLinkModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');

  const trimmedUrl = url.trim();
  const canAdd = trimmedUrl.length > 0;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const addLink = async () => {
    if (!canAdd || !window.mikoshi) {
      return;
    }

    const cleanedUrl = cleanURL(normalizeURL(trimmedUrl));

    const savedItem = await window.mikoshi.saveLink({
      url: cleanedUrl,
      title: getDomain(cleanedUrl),
    });

    onSave(savedItem);
    onClose();

    window.mikoshi.fetchOG(cleanedUrl).then((og) => {
      if (og.error) {
        return;
      }

      window.mikoshi
        .updateOG(savedItem.id, {
          title: og.title,
          image: og.image,
          favicon: og.favicon,
          description: og.description,
        })
        .then(() => refreshItems());
    });
  };

  return createPortal(
    <div className="add-link-modal-root">
      <div className="add-link-backdrop" onClick={onClose} />
      <section className="add-link-modal" role="dialog" aria-modal="true" aria-labelledby="add-link-title">
        <header className="add-link-header">
          <h2 id="add-link-title">Add Link</h2>
        </header>

        <div className="add-link-input-row">
          <input
            ref={inputRef}
            value={url}
            placeholder="https://"
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void addLink();
              }
            }}
          />
          <button type="button" disabled={!canAdd} onClick={() => void addLink()}>
            Add
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
