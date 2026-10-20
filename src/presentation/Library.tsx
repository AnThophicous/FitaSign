import { useState } from 'react';
import { robloxCatalog } from '../domain/native';
import { Modal } from './components';
import { RoundedIcon } from './RoundedIcon';

export function Library({ close, insert }: { close: () => void; insert: (type: string) => void }) {
  const [query, setQuery] = useState('');
  const classes = Object.entries(robloxCatalog.classes).filter(
    ([name]) => name !== 'ScreenGui' && name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Modal title="Inserir" wide close={close}>
      <input
        autoFocus
        aria-label="Buscar elemento Roblox"
        placeholder="Buscar elemento"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="class-grid">
        {classes.map(([name, entry]) => (
          <button
            key={name}
            onClick={() => {
              insert(name);
              close();
            }}
          >
            <RoundedIcon name="library" />
            <strong>{name}</strong>
            <span>{Object.keys(entry.properties).length} propriedades</span>
            <small>
              {entry.visual
                ? 'Elemento'
                : name.includes('Layout') || name === 'UIPadding'
                  ? 'Layout'
                  : 'Modificador'}
            </small>
          </button>
        ))}
      </div>
      <footer className="library-footer">
        Roblox Studio API · {Object.keys(robloxCatalog.classes).length} classes
      </footer>
    </Modal>
  );
}
