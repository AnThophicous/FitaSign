import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { XIcon } from '@phosphor-icons/react';

export function IconButton({
  label,
  children,
  onClick,
  disabled,
  active,
  className = '',
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`icon-button ${active ? 'active' : ''} ${className}`}
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function Modal({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current!;
    const previous = document.activeElement as HTMLElement | null;
    element.showModal();
    return () => {
      element.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      className={wide ? 'modal wide' : 'modal'}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const box = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < box.left ||
            event.clientX > box.right ||
            event.clientY < box.top ||
            event.clientY > box.bottom
          )
            close();
        }
      }}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <IconButton label="Fechar" onClick={close}>
          <XIcon />
        </IconButton>
      </header>
      {children}
    </dialog>
  );
}

export function TextField({
  label,
  value,
  commit,
  multiline = false,
}: {
  label: string;
  value: string;
  commit: (value: string) => void;
  multiline?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const cancelled = useRef(false);
  useEffect(() => setDraft(value), [value]);
  const props = {
    'aria-label': label,
    value: draft,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft(event.target.value),
    onBlur: () => {
      if (cancelled.current) {
        cancelled.current = false;
        return;
      }
      if (draft !== value) commit(draft);
    },
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' && !multiline) (event.currentTarget as HTMLElement).blur();
      if (event.key === 'Escape') {
        cancelled.current = true;
        setDraft(value);
        (event.currentTarget as HTMLElement).blur();
      }
    },
  };
  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? <textarea {...props} rows={3} /> : <input {...props} />}
    </label>
  );
}

export function NumberField({
  label,
  value,
  commit,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  commit: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const [draft, setDraft] = useState(String(Math.round(value * 1000) / 1000));
  const cancelled = useRef(false);
  useEffect(() => setDraft(String(Math.round(value * 1000) / 1000)), [value]);
  function save() {
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    const next = Number(draft);
    if (
      !draft.trim() ||
      !Number.isFinite(next) ||
      (min !== undefined && next < min) ||
      (max !== undefined && next > max)
    ) {
      setDraft(String(value));
      return;
    }
    if (next !== value) commit(next);
  }
  return (
    <label className="number-field">
      <span>{label}</span>
      <input
        aria-label={label}
        type="number"
        value={draft}
        min={min}
        max={max}
        step={step}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') {
            cancelled.current = true;
            setDraft(String(value));
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

export function ColorField({
  label,
  value,
  commit,
}: {
  label: string;
  value: string;
  commit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <label className="color-field">
      <span>{label}</span>
      <div>
        <input
          aria-label={`${label} — seletor`}
          type="color"
          value={value}
          onChange={(event) => commit(event.target.value)}
        />
        <input
          aria-label={label}
          value={draft}
          maxLength={7}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (/^#[\da-f]{6}$/i.test(draft)) {
              if (draft !== value) commit(draft);
            } else setDraft(value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
        />
      </div>
    </label>
  );
}
