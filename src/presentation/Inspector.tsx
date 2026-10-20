import { CopyIcon, TrashIcon } from '@phosphor-icons/react';
import type { DesignDocument, NodeProperties } from '../domain/document';
import type { Command } from '../application/commands';
import { ColorField, IconButton, NumberField, TextField } from './components';
import { NativeInspector } from './NativeInspector';
import { isVisualClass } from '../domain/native';

export function Inspector({
  document,
  selectedId,
  commit,
  duplicate,
  remove,
  busy,
}: {
  document: DesignDocument;
  selectedId: string | null;
  commit: (commands: Command[]) => void;
  duplicate: () => void;
  remove: () => void;
  busy: boolean;
}) {
  const node = selectedId ? document.nodes[selectedId] : undefined;
  const isRoot = !node || node.type === 'ScreenGui';
  const p = node?.properties;
  if (node && !isRoot && !isVisualClass(node.type))
    return (
      <aside className="inspector">
        <div className="panel-title">{node.type}</div>
        <fieldset disabled={busy}>
          <section>
            <TextField
              label="Nome"
              value={node.name}
              commit={(name) => commit([{ kind: 'update', id: node.id, name }])}
            />
            <div className="row">
              <IconButton label="Duplicar camada (Ctrl+D)" onClick={duplicate}>
                <CopyIcon />
              </IconButton>
              <IconButton label="Excluir camada (Delete)" onClick={remove}>
                <TrashIcon />
              </IconButton>
            </div>
          </section>
          <NativeInspector
            key={node.id}
            node={node}
            update={(native) => commit([{ kind: 'update', id: node.id, properties: { native } }])}
          />
        </fieldset>
      </aside>
    );
  function update(properties: Partial<NodeProperties>) {
    if (node) commit([{ kind: 'update', id: node.id, properties }]);
  }
  function viewport(key: 'width' | 'height' | 'background', value: number | string) {
    commit([{ kind: 'viewport', ...document.viewport, [key]: value }]);
  }
  return (
    <aside className="inspector">
      <div className="panel-title">
        {isRoot ? 'Documento' : 'Propriedades'}
        <span>{isRoot ? 'ScreenGui' : node.type}</span>
      </div>
      <fieldset disabled={busy}>
        {node?.type === 'ScreenGui' && (
          <NativeInspector
            node={node}
            update={(native) => commit([{ kind: 'update', id: node.id, properties: { native } }])}
          />
        )}
        {isRoot ? (
          <>
            <section>
              <TextField
                label="Nome"
                value={document.name}
                commit={(name) => commit([{ kind: 'rename', name }])}
              />
              <h3>Viewport</h3>
              <div className="field-pair">
                <NumberField
                  label="Largura"
                  value={document.viewport.width}
                  min={64}
                  max={7680}
                  commit={(value) => viewport('width', value)}
                />
                <NumberField
                  label="Altura"
                  value={document.viewport.height}
                  min={64}
                  max={4320}
                  commit={(value) => viewport('height', value)}
                />
              </div>
              <ColorField
                label="Fundo do preview"
                value={document.viewport.background}
                commit={(value) => viewport('background', value)}
              />
            </section>
            <p className="inspector-hint">Selecione uma camada</p>
          </>
        ) : (
          p && (
            <>
              <section className="node-heading">
                <TextField
                  label="Nome"
                  value={node.name}
                  commit={(name) => commit([{ kind: 'update', id: node.id, name }])}
                />
                <div className="row">
                  <IconButton label="Duplicar camada (Ctrl+D)" onClick={duplicate}>
                    <CopyIcon />
                  </IconButton>
                  <IconButton label="Excluir camada (Delete)" onClick={remove}>
                    <TrashIcon />
                  </IconButton>
                </div>
              </section>
              <section>
                <h3>Posição</h3>
                <div className="unit-heading">
                  <span>Offset</span>
                  <span>Scale</span>
                </div>
                <div className="field-pair">
                  <NumberField
                    label="X"
                    value={p.position.xOffset}
                    commit={(value) => update({ position: { ...p.position, xOffset: value } })}
                  />
                  <NumberField
                    label="X scale"
                    value={p.position.xScale}
                    step={0.01}
                    min={-10}
                    max={10}
                    commit={(value) => update({ position: { ...p.position, xScale: value } })}
                  />
                  <NumberField
                    label="Y"
                    value={p.position.yOffset}
                    commit={(value) => update({ position: { ...p.position, yOffset: value } })}
                  />
                  <NumberField
                    label="Y scale"
                    value={p.position.yScale}
                    step={0.01}
                    min={-10}
                    max={10}
                    commit={(value) => update({ position: { ...p.position, yScale: value } })}
                  />
                </div>
                <h3>Tamanho</h3>
                <div className="field-pair">
                  <NumberField
                    label="W"
                    value={p.size.xOffset}
                    commit={(value) => update({ size: { ...p.size, xOffset: value } })}
                  />
                  <NumberField
                    label="W scale"
                    value={p.size.xScale}
                    step={0.01}
                    min={-10}
                    max={10}
                    commit={(value) => update({ size: { ...p.size, xScale: value } })}
                  />
                  <NumberField
                    label="H"
                    value={p.size.yOffset}
                    commit={(value) => update({ size: { ...p.size, yOffset: value } })}
                  />
                  <NumberField
                    label="H scale"
                    value={p.size.yScale}
                    step={0.01}
                    min={-10}
                    max={10}
                    commit={(value) => update({ size: { ...p.size, yScale: value } })}
                  />
                </div>
                <h3>Âncora e rotação</h3>
                <div className="field-pair">
                  <NumberField
                    label="Âncora X"
                    value={p.anchor.x}
                    min={0}
                    max={1}
                    step={0.1}
                    commit={(value) => update({ anchor: { ...p.anchor, x: value } })}
                  />
                  <NumberField
                    label="Âncora Y"
                    value={p.anchor.y}
                    min={0}
                    max={1}
                    step={0.1}
                    commit={(value) => update({ anchor: { ...p.anchor, y: value } })}
                  />
                </div>
                <NumberField
                  label="Rotação"
                  value={p.rotation}
                  min={-360}
                  max={360}
                  commit={(value) => update({ rotation: value })}
                />
              </section>
              <section>
                <h3>Aparência</h3>
                <ColorField
                  label="Preenchimento"
                  value={p.fill}
                  commit={(fill) => update({ fill })}
                />
                <div className="field-pair">
                  <NumberField
                    label="Opacidade %"
                    value={Math.round((1 - p.transparency) * 100)}
                    min={0}
                    max={100}
                    commit={(value) => update({ transparency: 1 - value / 100 })}
                  />
                  <NumberField
                    label="Raio"
                    value={p.corner}
                    min={0}
                    max={10000}
                    commit={(corner) => update({ corner })}
                  />
                </div>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={p.stroke !== null}
                    onChange={(event) =>
                      update({
                        stroke: event.target.checked
                          ? { color: '#a0a0a0', thickness: 1, transparency: 0 }
                          : null,
                      })
                    }
                  />
                  Borda
                </label>
                {p.stroke && (
                  <>
                    <ColorField
                      label="Cor da borda"
                      value={p.stroke.color}
                      commit={(color) => update({ stroke: { ...p.stroke!, color } })}
                    />
                    <div className="field-pair">
                      <NumberField
                        label="Espessura"
                        value={p.stroke.thickness}
                        min={0}
                        max={100}
                        commit={(thickness) => update({ stroke: { ...p.stroke!, thickness } })}
                      />
                      <NumberField
                        label="Borda %"
                        value={Math.round((1 - p.stroke.transparency) * 100)}
                        min={0}
                        max={100}
                        commit={(value) =>
                          update({ stroke: { ...p.stroke!, transparency: 1 - value / 100 } })
                        }
                      />
                    </div>
                  </>
                )}
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={p.gradient !== null}
                    onChange={(event) =>
                      update({
                        gradient: event.target.checked
                          ? { from: '#ffffff', to: '#808080', rotation: 90 }
                          : null,
                      })
                    }
                  />
                  Gradiente
                </label>
                {p.gradient && (
                  <>
                    <ColorField
                      label="Início"
                      value={p.gradient.from}
                      commit={(from) => update({ gradient: { ...p.gradient!, from } })}
                    />
                    <ColorField
                      label="Fim"
                      value={p.gradient.to}
                      commit={(to) => update({ gradient: { ...p.gradient!, to } })}
                    />
                    <NumberField
                      label="Ângulo"
                      value={p.gradient.rotation}
                      min={-360}
                      max={360}
                      commit={(rotation) => update({ gradient: { ...p.gradient!, rotation } })}
                    />
                  </>
                )}
              </section>
              {(node.type === 'TextLabel' || node.type === 'TextButton') && (
                <section>
                  <h3>Texto</h3>
                  <TextField
                    label="Conteúdo"
                    value={p.text}
                    commit={(text) => update({ text })}
                    multiline
                  />
                  <ColorField
                    label="Cor do texto"
                    value={p.textColor}
                    commit={(textColor) => update({ textColor })}
                  />
                  <div className="field-pair">
                    <label className="field">
                      <span>Fonte</span>
                      <select
                        aria-label="Fonte"
                        value={p.font}
                        onChange={(event) =>
                          update({ font: event.target.value as NodeProperties['font'] })
                        }
                      >
                        {['Gotham', 'GothamMedium', 'GothamBold', 'SourceSans', 'Arial'].map(
                          (font) => (
                            <option key={font}>{font}</option>
                          ),
                        )}
                      </select>
                    </label>
                    <NumberField
                      label="Tamanho do texto"
                      value={p.textSize}
                      min={1}
                      max={100}
                      commit={(textSize) => update({ textSize })}
                    />
                  </div>
                  <label className="field">
                    <span>Alinhamento</span>
                    <select
                      aria-label="Alinhamento"
                      value={p.textAlign}
                      onChange={(event) =>
                        update({ textAlign: event.target.value as NodeProperties['textAlign'] })
                      }
                    >
                      <option value="Left">Esquerda</option>
                      <option value="Center">Centro</option>
                      <option value="Right">Direita</option>
                    </select>
                  </label>
                  <label className="check-field">
                    <input
                      type="checkbox"
                      checked={p.textWrapped}
                      onChange={(event) => update({ textWrapped: event.target.checked })}
                    />
                    Quebrar linha
                  </label>
                </section>
              )}
              {node.type === 'ImageLabel' && (
                <section>
                  <h3>Imagem</h3>
                  <TextField
                    label="Asset ID"
                    value={p.image}
                    commit={(image) => update({ image })}
                  />
                  <label className="field">
                    <span>Ajuste</span>
                    <select
                      aria-label="Ajuste da imagem"
                      value={p.imageFit}
                      onChange={(event) =>
                        update({ imageFit: event.target.value as NodeProperties['imageFit'] })
                      }
                    >
                      <option>Fit</option>
                      <option>Crop</option>
                      <option>Stretch</option>
                    </select>
                  </label>
                  <small>Prévia do asset no Roblox Studio.</small>
                </section>
              )}
              <section>
                <h3>Animação</h3>
                <label className="field">
                  <span>Entrada</span>
                  <select
                    aria-label="Animação de entrada"
                    value={p.tween?.effect ?? ''}
                    onChange={(event) =>
                      update({
                        tween: event.target.value
                          ? {
                              effect: event.target.value as 'Fade' | 'SlideUp',
                              duration: 0.4,
                              delay: 0,
                              easing: 'Sine',
                            }
                          : null,
                      })
                    }
                  >
                    <option value="">Nenhuma</option>
                    <option value="Fade">Fade</option>
                    <option value="SlideUp">Deslizar para cima</option>
                  </select>
                </label>
                {p.tween && (
                  <>
                    <div className="field-pair">
                      <NumberField
                        label="Duração (s)"
                        value={p.tween.duration}
                        step={0.1}
                        min={0.01}
                        max={60}
                        commit={(duration) => update({ tween: { ...p.tween!, duration } })}
                      />
                      <NumberField
                        label="Atraso (s)"
                        value={p.tween.delay}
                        step={0.1}
                        min={0}
                        max={60}
                        commit={(delay) => update({ tween: { ...p.tween!, delay } })}
                      />
                    </div>
                    <label className="field">
                      <span>Curva</span>
                      <select
                        aria-label="Curva"
                        value={p.tween.easing}
                        onChange={(event) =>
                          update({
                            tween: {
                              ...p.tween!,
                              easing: event.target.value as 'Quad' | 'Sine' | 'Cubic',
                            },
                          })
                        }
                      >
                        <option>Quad</option>
                        <option>Sine</option>
                        <option>Cubic</option>
                      </select>
                    </label>
                  </>
                )}
              </section>
              <section>
                <div className="field-pair">
                  <NumberField
                    label="ZIndex"
                    value={p.zIndex}
                    min={1}
                    max={10000}
                    commit={(zIndex) => update({ zIndex })}
                  />
                </div>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={p.visible}
                    onChange={(event) => update({ visible: event.target.checked })}
                  />
                  Visível
                </label>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={p.clip}
                    onChange={(event) => update({ clip: event.target.checked })}
                  />
                  Recortar conteúdo
                </label>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={p.locked}
                    onChange={(event) => update({ locked: event.target.checked })}
                  />
                  Bloquear no canvas
                </label>
              </section>
            </>
          )
        )}
        {node && isVisualClass(node.type) && (
          <NativeInspector key={node.id} node={node} update={(native) => update({ native })} />
        )}
      </fieldset>
    </aside>
  );
}
