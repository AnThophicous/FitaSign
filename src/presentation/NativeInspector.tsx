import { useEffect, useState } from 'react';
import { PlusIcon, XIcon } from '@phosphor-icons/react';
import {
  corePropertyNames,
  defaultNativeValue,
  isVisualClass,
  robloxCatalog,
  validateNativeValue,
} from '../domain/native';
import type { NativeProperty, NativeValue } from '../domain/native';
import type { DesignNode } from '../domain/document';
import { ColorField, IconButton, NumberField, TextField } from './components';

function StructuredValue({
  name,
  definition,
  value,
  commit,
}: {
  name: string;
  definition: NativeProperty;
  value: NativeValue;
  commit: (value: NativeValue) => void;
}) {
  const [draft, setDraft] = useState(JSON.stringify(value, null, 2));
  const [error, setError] = useState('');
  useEffect(() => setDraft(JSON.stringify(value, null, 2)), [value]);
  const fields: Record<string, string[]> = {
    Vector2: ['x', 'y'],
    Vector3: ['x', 'y', 'z'],
    UDim: ['scale', 'offset'],
    UDim2: ['xScale', 'xOffset', 'yScale', 'yOffset'],
  };
  if (fields[definition.type])
    return (
      <div className="native-structured">
        <span>{name}</span>
        <div className="field-pair">
          {fields[definition.type]!.map((key) => (
            <NumberField
              key={key}
              label={key}
              value={(value as Record<string, number>)[key]!}
              step={key.toLowerCase().includes('scale') ? 0.01 : 1}
              commit={(next) => commit({ ...(value as Record<string, NativeValue>), [key]: next })}
            />
          ))}
        </div>
      </div>
    );
  return (
    <label className="field">
      <span>
        {name} <small>{definition.type}</small>
      </span>
      <textarea
        aria-label={name}
        rows={4}
        value={draft}
        spellCheck={false}
        onChange={(event) => {
          setDraft(event.target.value);
          setError('');
        }}
        onBlur={() => {
          try {
            const next = JSON.parse(draft) as NativeValue;
            validateNativeValue(definition, next);
            if (JSON.stringify(next) !== JSON.stringify(value)) commit(next);
          } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Valor inválido.');
          }
        }}
      />
      {error && (
        <small className="field-error" role="alert">
          {error}
        </small>
      )}
    </label>
  );
}

export function NativeInspector({
  node,
  update,
}: {
  node: DesignNode;
  update: (native: Record<string, NativeValue>) => void;
}) {
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const definitions = robloxCatalog.classes[node.type]?.properties ?? {};
  const values = node.properties.native;
  const available = Object.entries(definitions).filter(
    ([name]) =>
      !Object.hasOwn(values, name) &&
      !(isVisualClass(node.type) && corePropertyNames.has(name)) &&
      name.toLowerCase().includes(query.toLowerCase()),
  );
  function set(name: string, value: NativeValue) {
    update({ ...values, [name]: value });
  }
  return (
    <section className="native-inspector">
      <div className="native-section-heading">
        <h3>Roblox</h3>
        <IconButton
          label="Adicionar propriedade Roblox"
          active={adding}
          onClick={() => setAdding((value) => !value)}
        >
          <PlusIcon size={15} />
        </IconButton>
      </div>
      {Object.entries(values).map(([name, value]) => {
        const definition = definitions[name]!;
        return (
          <div className="native-property" key={name}>
            <div className="native-property-remove">
              <IconButton
                label={`Restaurar ${name}`}
                onClick={() => {
                  const next = { ...values };
                  delete next[name];
                  update(next);
                }}
              >
                <XIcon size={12} />
              </IconButton>
            </div>
            {definition.type === 'bool' ? (
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={value as boolean}
                  onChange={(event) => set(name, event.target.checked)}
                />
                {name}
              </label>
            ) : definition.type === 'enum' ? (
              <label className="field">
                <span>{name}</span>
                <select
                  aria-label={name}
                  value={String(value)}
                  onChange={(event) => set(name, event.target.value)}
                >
                  {robloxCatalog.enums[definition.enum!]!.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            ) : definition.type === 'Color3' ? (
              <ColorField label={name} value={String(value)} commit={(next) => set(name, next)} />
            ) : typeof value === 'number' ? (
              <NumberField
                label={name}
                value={value}
                step={definition.type.startsWith('int') ? 1 : 0.1}
                commit={(next) => set(name, next)}
              />
            ) : ['string', 'Content', 'ContentId', 'ref'].includes(definition.type) ? (
              <TextField
                label={name}
                value={value === null ? '' : String(value)}
                commit={(next) => set(name, definition.type === 'ref' && !next ? null : next)}
              />
            ) : (
              <StructuredValue
                name={name}
                definition={definition}
                value={value}
                commit={(next) => set(name, next)}
              />
            )}
          </div>
        );
      })}
      {adding && (
        <div className="native-property-picker">
          <input
            aria-label="Buscar propriedade Roblox"
            placeholder="Buscar propriedade"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div>
            {available.map(([name, definition]) => (
              <button
                key={name}
                onClick={() => {
                  set(name, defaultNativeValue(definition));
                  setAdding(false);
                  setQuery('');
                }}
              >
                <span>{name}</span>
                <small>{definition.type === 'enum' ? definition.enum : definition.type}</small>
              </button>
            ))}
            {available.length === 0 && <small>Nenhuma propriedade</small>}
          </div>
        </div>
      )}
      <small className="native-preview-note">Propriedades nativas · validar no Studio</small>
    </section>
  );
}
