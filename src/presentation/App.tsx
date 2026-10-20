import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  ArrowUDownLeftIcon,
  ArrowUDownRightIcon,
  CheckIcon,
  CheckCircleIcon,
  CopyIcon,
  DownloadSimpleIcon,
  FolderOpenIcon,
  MagnifyingGlassIcon,
  PlayIcon,
  PlugIcon,
  PlusIcon,
  StopIcon,
  TrashIcon,
  XIcon,
} from '@phosphor-icons/react';
import type { Command, ConnectionInfo, ProjectState, ProjectSummary } from '../shared/bridge';
import { duplicateCommands } from '../application/duplicate';
import { exampleDocument } from '../application/examples';
import { exportLuau } from '../application/export-luau';
import type { NodeType } from '../domain/document';
import { Canvas } from './Canvas';
import { Layers } from './Layers';
import { Inspector } from './Inspector';
import { IconButton, Modal, TextField } from './components';
import { Scene } from './Scene';
import { Library } from './Library';
import { RoundedIcon } from './RoundedIcon';
import { isVisualClass } from '../domain/native';
import mark from '../../build/icon.svg';

const example = exampleDocument('example-preview');
type Page = 'home' | 'editor' | 'connections';
export function App() {
  const [page, setPage] = useState<Page>('home');
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [state, setState] = useState<ProjectState | null>(null);
  const current = useRef(state);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [deleting, setDeleting] = useState<ProjectSummary | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [preview, setPreview] = useState(false);
  const [search, setSearch] = useState('');
  const [connection, setConnection] = useState<ConnectionInfo | null>(null);
  const [copied, setCopied] = useState(false);
  function accept(next: ProjectState, open = false) {
    if (
      current.current &&
      next.document.id === current.current.document.id &&
      next.document.revision < current.current.document.revision
    )
      return;
    current.current = next;
    setState(next);
    setSelectedId((selected) => (selected && next.document.nodes[selected] ? selected : null));
    if (open) {
      setPage('editor');
      setPreview(false);
      setSelectedId(null);
    }
  }
  async function refresh() {
    setProjects(await window.fitasign.listProjects());
  }
  async function run<T>(operation: () => Promise<T>, success?: (result: T) => void): Promise<void> {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await operation();
      success?.(result);
    } catch (failure) {
      setError(
        (failure instanceof Error ? failure.message : 'Não foi possível concluir.').replace(
          /^Error invoking remote method '[^']+': Error: /,
          '',
        ),
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!window.fitasign) {
      setError('Abra este projeto pelo aplicativo FitaSign.');
      setLoading(false);
      return;
    }
    void refresh()
      .catch((failure: unknown) => setError(String(failure)))
      .finally(() => setLoading(false));
    const changed = window.fitasign.onProjectChanged((next) => {
      if (current.current?.document.id === next.document.id) accept(next);
      setProjects((previous) => {
        const summary = {
          id: next.document.id,
          name: next.document.name,
          document: next.document,
          modifiedAt: new Date().toISOString(),
        };
        return [summary, ...previous.filter((entry) => entry.id !== next.document.id)];
      });
    });
    const opened = window.fitasign.onProjectOpened((next) => accept(next, true));
    return () => {
      changed();
      opened();
    };
  }, []);
  useEffect(() => {
    if (page !== 'connections') return;
    void window.fitasign
      .connectionInfo()
      .then(setConnection)
      .catch((failure: unknown) => setError(String(failure)));
    const interval = window.setInterval(() => {
      void window.fitasign
        .connectionInfo()
        .then(setConnection)
        .catch(() => setConnection(null));
    }, 10000);
    return () => window.clearInterval(interval);
  }, [page]);
  async function commit(commands: Command[], revision?: number) {
    const active = current.current;
    if (!active) return;
    await run(
      () =>
        window.fitasign.changeProject(
          active.document.id,
          commands,
          revision ?? active.document.revision,
        ),
      (next) => accept(next),
    );
  }
  function add(type: Exclude<NodeType, 'ScreenGui'>) {
    const active = current.current;
    if (!active) return;
    const selected = selectedId ? active.document.nodes[selectedId] : undefined;
    const parentId =
      selected &&
      (isVisualClass(selected.type) || selected.type === 'ScreenGui') &&
      !selected.type.startsWith('Text') &&
      !selected.type.startsWith('Image')
        ? selected.id
        : (selected?.parentId ?? active.document.rootId);
    const id = crypto.randomUUID();
    void commit([
      {
        kind: 'add',
        id,
        parentId,
        type,
        name:
          (
            {
              Frame: 'Frame',
              TextLabel: 'Texto',
              TextButton: 'Botão',
              ImageLabel: 'Imagem',
            } as Record<string, string>
          )[type] ?? type,
      },
    ]).then(() => {
      if (current.current?.document.nodes[id]) setSelectedId(id);
    });
  }
  function duplicate() {
    if (!current.current || !selectedId || selectedId === current.current.document.rootId) return;
    const commands = duplicateCommands(current.current.document, selectedId, () =>
      crypto.randomUUID(),
    );
    void commit(commands).then(() => {
      const first = commands[0];
      if (first?.kind === 'add' && current.current?.document.nodes[first.id])
        setSelectedId(first.id);
    });
  }
  function remove() {
    const node = selectedId ? current.current?.document.nodes[selectedId] : undefined;
    if (node?.parentId && !node.properties.locked) void commit([{ kind: 'remove', id: node.id }]);
  }
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (
        (event.target as HTMLElement).closest('input, textarea, select, dialog') ||
        createOpen ||
        exportOpen ||
        helpOpen ||
        libraryOpen ||
        deleting ||
        page !== 'editor' ||
        !current.current
      )
        return;
      const modifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (modifier && key === 'z') {
        event.preventDefault();
        void run(
          () =>
            event.shiftKey
              ? window.fitasign.redo(current.current!.document.id)
              : window.fitasign.undo(current.current!.document.id),
          (next) => accept(next),
        );
      } else if (modifier && key === 'y') {
        event.preventDefault();
        void run(
          () => window.fitasign.redo(current.current!.document.id),
          (next) => accept(next),
        );
      } else if (modifier && key === 'd') {
        event.preventDefault();
        if (!preview) duplicate();
      } else if (modifier && key === 'e') {
        event.preventDefault();
        setExportOpen(true);
      } else if (modifier && key === 's') {
        event.preventDefault();
        if (event.shiftKey)
          void run(() => window.fitasign.saveProjectCopy(current.current!.document.id));
      } else if (key === 'escape') {
        setPreview(false);
        setSelectedId(null);
      } else if (!modifier && !preview) {
        if (key === 'delete' || key === 'backspace') {
          event.preventDefault();
          remove();
        } else if (key === 'f') add('Frame');
        else if (key === 't') add('TextLabel');
        else if (key === 'b') add('TextButton');
        else if (key === 'i') add('ImageLabel');
      }
    }
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  });
  function open(id: string) {
    void run(
      () => window.fitasign.openProject(id),
      (next) => accept(next, true),
    );
  }
  function create(isExample = false) {
    void run(
      () =>
        window.fitasign.createProject(
          isExample ? 'Menu principal' : name.trim() || 'Sem título',
          isExample,
        ),
      (next) => {
        accept(next, true);
        setCreateOpen(false);
        setName('');
        void refresh();
      },
    );
  }
  const filtered = projects.filter((project) =>
    project.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')),
  );
  const config = connection
    ? JSON.stringify(
        {
          mcpServers: {
            fitasign: {
              command: connection.command,
              args: connection.args,
              env: { FITASIGN_CONNECTION_FILE: connection.connectionFile },
            },
          },
        },
        null,
        2,
      )
    : '';
  return (
    <div
      className={`app ${page === 'editor' ? 'editor-page' : ''} ${preview ? 'preview-mode' : ''}`}
    >
      <nav className="navigation" aria-label="Navegação">
        <img className="brand-mark" src={mark} alt="FitaSign" />
        <div className="nav-items">
          <IconButton
            label="Projetos"
            active={page === 'home'}
            onClick={() => {
              setPage('home');
              setPreview(false);
              void refresh().catch((failure: unknown) => setError(String(failure)));
            }}
          >
            <RoundedIcon name="home" />
          </IconButton>
          <IconButton
            label="Conexões"
            active={page === 'connections'}
            onClick={() => {
              setPage('connections');
              setPreview(false);
            }}
          >
            <RoundedIcon name="plug" />
          </IconButton>
          {page === 'editor' && (
            <IconButton label="Inserir elementos Roblox" onClick={() => setLibraryOpen(true)}>
              <RoundedIcon name="library" />
            </IconButton>
          )}
        </div>
        <div className="nav-bottom">
          <IconButton label="Atalhos" onClick={() => setHelpOpen(true)}>
            <RoundedIcon name="help" />
          </IconButton>
          <span className="version" title="FitaSign 0.1.0-beta.1">
            0.1
          </span>
        </div>
      </nav>
      {page === 'editor' && state ? (
        <div className="editor-shell">
          <header className="editor-header">
            <IconButton
              label="Voltar aos projetos"
              onClick={() => {
                setPage('home');
                setPreview(false);
              }}
            >
              <ArrowLeftIcon />
            </IconButton>
            <div className="project-title">
              <TextField
                label="Nome do projeto"
                value={state.document.name}
                commit={(name) => void commit([{ kind: 'rename', name }])}
              />
              <span className="save-state" title={busy ? 'Salvando' : 'Salvo no dispositivo'}>
                {busy ? <span className="saving-dot" /> : <CheckIcon size={12} />}
                {busy ? 'Salvando' : 'Salvo'}
              </span>
            </div>
            <span className="beta-label">beta</span>
            <div className="header-actions">
              <div className="history-actions">
                <IconButton
                  label="Desfazer (Ctrl+Z)"
                  disabled={!state.canUndo || busy}
                  onClick={() =>
                    void run(
                      () => window.fitasign.undo(state.document.id),
                      (next) => accept(next),
                    )
                  }
                >
                  <ArrowUDownLeftIcon />
                </IconButton>
                <IconButton
                  label="Refazer (Ctrl+Shift+Z)"
                  disabled={!state.canRedo || busy}
                  onClick={() =>
                    void run(
                      () => window.fitasign.redo(state.document.id),
                      (next) => accept(next),
                    )
                  }
                >
                  <ArrowUDownRightIcon />
                </IconButton>
              </div>
              <button
                className={`button ghost ${preview ? 'selected' : ''}`}
                onClick={() => setPreview((value) => !value)}
              >
                {preview ? <StopIcon weight="fill" /> : <PlayIcon weight="fill" />}
                {preview ? 'Editar' : 'Preview'}
              </button>
              <button className="button primary" onClick={() => setExportOpen(true)}>
                <ArrowSquareOutIcon />
                Exportar
              </button>
            </div>
          </header>
          <div className="workspace">
            {!preview && (
              <Layers
                document={state.document}
                selectedId={selectedId}
                select={setSelectedId}
                commit={(commands) => void commit(commands)}
                busy={busy}
              />
            )}
            <Canvas
              document={state.document}
              selectedId={selectedId}
              select={setSelectedId}
              commit={commit}
              add={add}
              preview={preview}
              busy={busy}
            />
            {!preview && (
              <Inspector
                document={state.document}
                selectedId={selectedId}
                commit={(commands) => void commit(commands)}
                duplicate={duplicate}
                remove={remove}
                busy={busy}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="page-shell">
          <header className="app-header">
            <span>FitaSign</span>
            <span className="subtle">0.1.0 beta</span>
          </header>
          {page === 'home' ? (
            <main className="home">
              <div className="page-heading">
                <div>
                  <span className="eyebrow">Seu espaço</span>
                  <h1>Projetos</h1>
                </div>
                <div className="row">
                  <button
                    className="button ghost"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        () => window.fitasign.importProject(),
                        (next) => {
                          if (next) accept(next, true);
                        },
                      )
                    }
                  >
                    <FolderOpenIcon />
                    Abrir arquivo
                  </button>
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() => {
                      setName('');
                      setCreateOpen(true);
                    }}
                  >
                    <PlusIcon />
                    Novo projeto
                  </button>
                </div>
              </div>
              {projects.length > 0 && (
                <div className="project-filter">
                  <label className="search">
                    <MagnifyingGlassIcon />
                    <input
                      aria-label="Buscar projetos"
                      placeholder="Buscar projetos"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </label>
                  <span>
                    {projects.length} {projects.length === 1 ? 'projeto' : 'projetos'}
                  </span>
                </div>
              )}
              {loading ? (
                <div className="empty-state">Carregando projetos…</div>
              ) : projects.length === 0 ? (
                <div className="first-project">
                  <button
                    className="new-project-card"
                    onClick={() => setCreateOpen(true)}
                    disabled={busy}
                  >
                    <span className="plus-box">
                      <PlusIcon size={24} />
                    </span>
                    <strong>Novo projeto</strong>
                    <span>Uma tela em branco.</span>
                  </button>
                  <div className="example-card">
                    <button
                      className="example-preview"
                      aria-label="Abrir exemplo Menu principal"
                      onClick={() => create(true)}
                      disabled={busy}
                    >
                      <div className="thumbnail-stage">
                        <Scene document={example} miniature />
                      </div>
                    </button>
                    <div className="example-caption">
                      <div>
                        <span className="eyebrow">Exemplo</span>
                        <strong>Menu principal</strong>
                      </div>
                      <button className="button ghost" onClick={() => create(true)} disabled={busy}>
                        Abrir <ArrowSquareOutIcon />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="project-grid">
                    {filtered.map((project) => (
                      <article className="project-card" key={project.id}>
                        <button
                          className="project-preview"
                          onClick={() => open(project.id)}
                          aria-label={`Abrir ${project.name}`}
                          disabled={busy}
                        >
                          <div
                            className="thumbnail-viewport"
                            style={{ background: project.document.viewport.background }}
                          >
                            <div
                              className="thumbnail-stage"
                              style={{
                                width: project.document.viewport.width,
                                height: project.document.viewport.height,
                                transform: `scale(${300 / project.document.viewport.width})`,
                              }}
                            >
                              <Scene document={project.document} miniature />
                            </div>
                          </div>
                        </button>
                        <div className="project-caption">
                          <button onClick={() => open(project.id)} disabled={busy}>
                            <strong>{project.name}</strong>
                            <span>
                              {new Intl.DateTimeFormat('pt-BR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              }).format(new Date(project.modifiedAt))}
                            </span>
                          </button>
                          <IconButton
                            label={`Excluir projeto ${project.name}`}
                            disabled={busy}
                            onClick={() => setDeleting(project)}
                          >
                            <TrashIcon />
                          </IconButton>
                        </div>
                      </article>
                    ))}
                  </div>
                  {filtered.length === 0 && (
                    <div className="empty-state">Nenhum projeto encontrado.</div>
                  )}
                </>
              )}
              <footer className="home-footer">
                <span>Salvos neste dispositivo</span>
                <button onClick={() => setPage('connections')}>
                  <PlugIcon />
                  Conectar agente
                </button>
              </footer>
            </main>
          ) : (
            <main className="connections">
              <div className="page-heading">
                <div>
                  <span className="eyebrow">Integrações</span>
                  <h1>Conexões</h1>
                </div>
              </div>
              <section className="connection-card">
                <div className="connection-heading">
                  <div className="connection-symbol">
                    <PlugIcon size={24} />
                  </div>
                  <div>
                    <h2>MCP local</h2>
                    <span>
                      {connection?.connected
                        ? 'Disponível neste dispositivo'
                        : 'Conexão indisponível'}
                    </span>
                  </div>
                  {connection?.connected && (
                    <CheckCircleIcon className="connection-status" size={20} />
                  )}
                </div>
                <p>Use a configuração no seu cliente MCP.</p>
                <pre aria-label="Configuração MCP">{config || 'Carregando…'}</pre>
                <div className="connection-footer">
                  <span>{connection?.clients ?? 0} agentes recentes</span>
                  <button
                    className="button secondary"
                    disabled={!config}
                    onClick={() =>
                      void run(
                        () => window.fitasign.copyConnectionConfig(),
                        () => {
                          setCopied(true);
                          window.setTimeout(() => setCopied(false), 2000);
                        },
                      )
                    }
                  >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                    {copied ? 'Copiado' : 'Copiar configuração'}
                  </button>
                </div>
              </section>
              <p className="connection-note">
                Node.js 24 · Aplicativo aberto durante a conexão
                <br />
                Skill: <code>skills/fitasign-ui/SKILL.md</code>
              </p>
            </main>
          )}
        </div>
      )}
      {error && (
        <div className="error-notice" role="alert">
          <span>{error}</span>
          <IconButton label="Fechar erro" onClick={() => setError('')}>
            <XIcon />
          </IconButton>
        </div>
      )}
      {createOpen && (
        <Modal title="Novo projeto" close={() => setCreateOpen(false)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              create();
            }}
          >
            <label className="field">
              <span>Nome</span>
              <input
                aria-label="Nome"
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                placeholder="Sem título"
              />
            </label>
            <footer className="modal-actions">
              <button type="button" className="button ghost" onClick={() => setCreateOpen(false)}>
                Cancelar
              </button>
              <button className="button primary" disabled={busy}>
                Criar projeto
              </button>
            </footer>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal title="Excluir projeto?" close={() => setDeleting(null)}>
          <p>“{deleting.name}” será excluído deste dispositivo.</p>
          <footer className="modal-actions">
            <button className="button ghost" onClick={() => setDeleting(null)}>
              Cancelar
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={() =>
                void run(
                  () => window.fitasign.deleteProject(deleting.id),
                  () => {
                    setDeleting(null);
                    void refresh();
                  },
                )
              }
            >
              Excluir
            </button>
          </footer>
        </Modal>
      )}
      {exportOpen && state && (
        <Modal title="Exportar" wide close={() => setExportOpen(false)}>
          <div className="export-meta">
            <span>ModuleScript · Luau</span>
            <span>{Object.keys(state.document.nodes).length} instâncias de UI</span>
          </div>
          <pre className="code-preview" aria-label="Código Luau">
            {exportLuau(state.document)}
          </pre>
          <footer className="modal-actions split">
            <button
              className="button ghost"
              disabled={busy}
              onClick={() => void run(() => window.fitasign.saveProjectCopy(state.document.id))}
            >
              <DownloadSimpleIcon />
              Projeto .fitasign
            </button>
            <div className="row">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => window.fitasign.copyLuau(state.document.id),
                    () => {
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 2000);
                    },
                  )
                }
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? 'Copiado' : 'Copiar Luau'}
              </button>
              <button
                className="button primary"
                disabled={busy}
                onClick={() => void run(() => window.fitasign.exportProject(state.document.id))}
              >
                <DownloadSimpleIcon />
                Salvar .luau
              </button>
            </div>
          </footer>
        </Modal>
      )}
      {libraryOpen && <Library close={() => setLibraryOpen(false)} insert={add} />}
      {helpOpen && (
        <Modal title="Atalhos" close={() => setHelpOpen(false)}>
          <dl className="shortcuts">
            {[
              ['Frame', 'F'],
              ['Texto', 'T'],
              ['Botão', 'B'],
              ['Imagem', 'I'],
              ['Mover canvas', 'Espaço + arrastar'],
              ['Zoom', 'Ctrl + scroll'],
              ['Alinhar ao grid', 'Shift + arrastar'],
              ['Duplicar', 'Ctrl + D'],
              ['Desfazer', 'Ctrl + Z'],
              ['Refazer', 'Ctrl + Shift + Z'],
              ['Exportar', 'Ctrl + E'],
              ['Salvar cópia', 'Ctrl + Shift + S'],
            ].map(([label, shortcut]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  <kbd>{shortcut}</kbd>
                </dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}
    </div>
  );
}
