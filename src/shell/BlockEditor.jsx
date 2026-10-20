import { useEffect, useRef, useState } from 'react';
import { filterCommands, livingBlocks, slashQuery } from '../lib/pages';

function FitText({ value, onChange, placeholder, onKeyDown, labelledBy, blockId, autoFocus }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);
  return (
    <textarea
      ref={ref}
      rows={1}
      data-block={blockId}
      value={value}
      placeholder={placeholder}
      aria-label={labelledBy}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      className="block-edit"
    />
  );
}

export function BlockEditor({ pageId, blocks, onAdd, onUpdate, onDelete, onReorder, onMove, autoFocus = false }) {
  const list = livingBlocks(blocks, pageId);
  const [menu, setMenu] = useState(null);
  const [active, setActive] = useState(0);
  const [focusId, setFocusId] = useState(null);

  useEffect(() => {
    setFocusId(null);
    setMenu(null);
  }, [pageId]);

  const choose = (block, type) => {
    const query = slashQuery(block.content);
    const content = query == null ? block.content : '';
    onUpdate(block.id, { type, content, props: type === 'callout' ? { icon: '💡' } : block.props || {} });
    setMenu(null);
  };

  const onKeyDown = (block, index) => (event) => {
    const query = slashQuery(block.content);
    const commands = query == null ? [] : filterCommands(query);
    if (query != null && commands.length) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActive((n) => (n + 1) % commands.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActive((n) => (n - 1 + commands.length) % commands.length);
        return;
      }
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        choose(block, commands[active]?.type || commands[0].type);
        return;
      }
      if (event.key === 'Escape') {
        setMenu(null);
        return;
      }
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onAdd(pageId, { position: index + 1 });
    }
    if (event.key === 'Backspace' && block.content === '' && block.type !== 'divider') {
      event.preventDefault();
      onDelete(block.id);
    }
  };

  const focusEditor = (event) => {
    if (event.target.closest('textarea, button, .slash-menu, input')) return;
    const areas = [...document.querySelectorAll('textarea.block-edit')];
    if (areas.length) {
      areas[areas.length - 1].focus();
      return;
    }
    const created = onAdd(pageId);
    if (created?.id) setFocusId(created.id);
  };

  return (
    <div className="blocks" onMouseDown={focusEditor}>
      {list.map((block, index) => {
        const query = menu === block.id ? slashQuery(block.content) : null;
        const commands = query == null ? [] : filterCommands(query);
        return (
          <div
            key={block.id}
            className={`block is-${block.type} ${block.checked ? 'is-checked' : ''}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const id = event.dataTransfer.getData('text/plain');
              if (id) onReorder(pageId, id, block.id);
            }}
          >
            <div className="block-tools">
              <button
                type="button"
                className="handle"
                draggable
                aria-label="Drag to reorder"
                onDragStart={(event) => {
                  event.dataTransfer.setData('text/plain', block.id);
                  event.dataTransfer.effectAllowed = 'move';
                }}
              >
                ⋮⋮
              </button>
              <button type="button" className="mini" aria-label="Move up" onClick={() => onMove(pageId, block.id, -1)}>↑</button>
              <button type="button" className="mini" aria-label="Move down" onClick={() => onMove(pageId, block.id, 1)}>↓</button>
            </div>
            {block.type === 'todo' && (
              <button
                type="button"
                className="check-box"
                aria-label={block.checked ? 'Mark not done' : 'Mark done'}
                aria-pressed={block.checked}
                onClick={() => onUpdate(block.id, { checked: !block.checked })}
              >
                {block.checked ? '✓' : ''}
              </button>
            )}
            {block.type === 'bullet' && <span className="bullet-dot" aria-hidden="true" />}
            {block.type === 'toggle' && (
              <button
                type="button"
                className="mini"
                aria-expanded={!!block.props?.open}
                aria-label="Toggle"
                onClick={() => onUpdate(block.id, { props: { ...block.props, open: !block.props?.open } })}
              >
                {block.props?.open ? '▾' : '▸'}
              </button>
            )}
            {block.type === 'callout' && (
              <button
                type="button"
                className="mini"
                aria-label="Callout icon"
                onClick={() => {
                  const icon = window.prompt('Emoji for this callout', block.props?.icon || '💡') || '💡';
                  onUpdate(block.id, { props: { ...block.props, icon } });
                }}
              >
                {block.props?.icon || '💡'}
              </button>
            )}
            <div className="block-main">
              {block.type === 'divider' ? (
                <div className="divider" role="separator" />
              ) : (
                <FitText
                  blockId={block.id}
                  autoFocus={focusId === block.id || (autoFocus && index === 0 && list.length === 1 && !block.content)}
                  value={block.content}
                  labelledBy="Block"
                  placeholder={index === 0 && !block.content ? "Write, or type / for headings, to-dos, lists…" : "Type / for blocks"}
                  onChange={(content) => {
                    onUpdate(block.id, { content });
                    setMenu(content.startsWith('/') ? block.id : null);
                    setActive(0);
                  }}
                  onKeyDown={onKeyDown(block, index)}
                />
              )}
              {block.type === 'toggle' && block.props?.open && (
                <textarea
                  className="block-edit toggle-body"
                  value={block.props?.body || ''}
                  placeholder="Hidden text"
                  aria-label="Toggle contents"
                  onChange={(event) => onUpdate(block.id, { props: { ...block.props, body: event.target.value, open: true } })}
                />
              )}
              {commands.length > 0 && (
                <div className="slash-menu" role="listbox" aria-label="Insert block">
                  {commands.map((item, itemIndex) => (
                    <button
                      key={item.type}
                      type="button"
                      role="option"
                      aria-selected={itemIndex === active}
                      className={itemIndex === active ? 'is-on' : ''}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        choose(block, item.type);
                      }}
                    >
                      <strong>{item.label}</strong>
                      <small>{item.hint}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
      <button
        type="button"
        className="add-block"
        onClick={() => {
          const created = onAdd(pageId);
          if (created?.id) setFocusId(created.id);
        }}
      >
        Click to add a block, or press Enter
      </button>
    </div>
  );
}
