import { useEffect, useRef, useState } from 'react';
import {
  BLOCK_COLORS,
  DATABASE_SOURCES,
  applyMention,
  defaultProps,
  filterCommands,
  livingBlocks,
  markdownShortcut,
  mentionQuery,
  slashQuery,
  splitContent,
  withSystemPages,
} from '../lib/pages';
import { InlineDatabase } from './InlineDatabase';

function FitText({ value, onChange, placeholder, onKeyDown, blockId, autoFocus, className = 'block-edit' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.max(el.scrollHeight, 24)}px`;
  }, [value]);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus, blockId]);
  return (
    <textarea
      ref={ref}
      rows={1}
      data-block={blockId}
      value={value}
      placeholder={placeholder}
      aria-label="Block"
      onChange={(event) => onChange(event.target.value, event.target.selectionStart)}
      onKeyDown={onKeyDown}
      className={className}
    />
  );
}

function TokenText({ content, pages, onOpenPage }) {
  const parts = String(content || '').split(/(\[\[[^\]]+\]\]|@\d{4}-\d{2}-\d{2})/g);
  if (parts.length < 2) return null;
  return (
    <p className="tokens">
      {parts.map((part, index) => {
        const pageName = part.match(/^\[\[(.+)\]\]$/)?.[1];
        if (pageName) {
          const match = withSystemPages(pages).find((page) => page.title === pageName);
          return (
            <button key={index} type="button" className="token" onClick={() => match && onOpenPage?.(match.id)}>
              {match?.icon || '📄'} {pageName}
            </button>
          );
        }
        if (/^@\d{4}-\d{2}-\d{2}$/.test(part)) return <span key={index} className="token date">{part.slice(1)}</span>;
        return <span key={index}>{part}</span>;
      })}
    </p>
  );
}

export function BlockEditor({
  pageId,
  blocks,
  pages = [],
  onOpenPage,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
  autoFocus = false,
}) {
  const list = livingBlocks(blocks, pageId);
  const [active, setActive] = useState(0);
  const [focusId, setFocusId] = useState(null);
  const [handleFor, setHandleFor] = useState(null);

  useEffect(() => {
    setFocusId(null);
    setHandleFor(null);
  }, [pageId]);

  const turnInto = (block, type) => {
    onUpdate(block.id, {
      type,
      content: slashQuery(block.content) == null ? block.content : '',
      props: { ...defaultProps(type), color: block.props?.color, background: block.props?.background },
    });
    setHandleFor(null);
  };

  const insertAfter = (index, extra = {}) => {
    const created = onAdd(pageId, { position: index + 1, ...extra });
    if (created?.id) setFocusId(created.id);
    return created;
  };

  const onKeyDown = (block, index) => (event) => {
    const query = slashQuery(event.currentTarget.value);
    const commands = query == null ? [] : filterCommands(query);
    if (query != null && commands.length && ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(event.key)) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActive((n) => (n + 1) % commands.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActive((n) => (n - 1 + commands.length) % commands.length);
      } else if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        turnInto(block, commands[Math.min(active, commands.length - 1)].type);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onUpdate(block.id, { content: '' });
      }
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const { before, after } = splitContent(block.content, event.currentTarget.selectionStart);
      const nextType = ['bullet', 'numbered', 'todo'].includes(block.type) && before ? block.type : 'text';
      onUpdate(block.id, { content: before });
      insertAfter(index, { type: nextType, content: after });
    }
    if (event.key === 'Backspace' && event.currentTarget.selectionStart === 0 && !event.currentTarget.selectionEnd) {
      const previous = list[index - 1];
      if (!previous || previous.type === 'divider') {
        if (!block.content) {
          event.preventDefault();
          onDelete(block.id);
          if (previous) setFocusId(previous.id);
        }
        return;
      }
      event.preventDefault();
      onUpdate(previous.id, { content: `${previous.content || ''}${block.content || ''}` });
      onDelete(block.id);
      setFocusId(previous.id);
    }
  };

  const onChange = (block) => (content) => {
    const shortcut = markdownShortcut(content);
    if (shortcut) {
      onUpdate(block.id, { type: shortcut.type, content: '', props: { ...block.props, ...defaultProps(shortcut.type) } });
      setActive(0);
      return;
    }
    onUpdate(block.id, { content });
    setActive(0);
  };

  return (
    <div
      className="blocks"
      onMouseDown={(event) => {
        if (event.target.closest('textarea, button, input, .slash-menu, .pop')) return;
        const areas = [...document.querySelectorAll('textarea.block-edit')];
        if (areas.length) areas[areas.length - 1].focus();
        else {
          const created = onAdd(pageId);
          if (created?.id) setFocusId(created.id);
        }
      }}
    >
      {list.map((block, index) => {
        const number = list.slice(0, index + 1).filter((item) => item.type === 'numbered').length;
        const query = slashQuery(block.content);
        const commands = query == null ? [] : filterCommands(query).slice(0, 8);
        const mention = query == null ? mentionQuery(block.content) : null;
        const mentionPages = mention == null ? [] : withSystemPages(pages).filter((page) => page.title.toLowerCase().includes(mention.toLowerCase())).slice(0, 6);
        const tone = block.props?.color && block.props.color !== 'default' ? ` tone-${block.props.color}` : '';
        const wash = block.props?.background && block.props.background !== 'default' ? ` wash-${block.props.background}` : '';
        return (
          <div
            key={block.id}
            className={`block is-${block.type}${block.checked ? ' is-checked' : ''}${tone}${wash}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const id = event.dataTransfer.getData('text/plain');
              if (id) onReorder(pageId, id, block.id);
            }}
          >
            <div className="block-tools">
              <button type="button" className="plus" aria-label="Insert block" onClick={() => insertAfter(index - 1, { content: '/' })}>+</button>
              <button
                type="button"
                className="handle"
                draggable
                aria-label="Drag to reorder"
                onClick={() => setHandleFor(handleFor === block.id ? null : block.id)}
                onDragStart={(event) => {
                  event.dataTransfer.setData('text/plain', block.id);
                  event.dataTransfer.effectAllowed = 'move';
                }}
              >
                <i /><i /><i /><i /><i /><i />
              </button>
            </div>
            {handleFor === block.id && (
              <div className="pop handle-menu" role="menu">
                <p>Color</p>
                <div className="swatches">
                  {BLOCK_COLORS.map((color) => (
                    <button key={color} type="button" className={`dot tone-${color}`} aria-label={color} onClick={() => onUpdate(block.id, { props: { ...block.props, color } })} />
                  ))}
                </div>
                <p>Highlight</p>
                <div className="swatches">
                  {BLOCK_COLORS.map((color) => (
                    <button key={color} type="button" className={`dot wash-${color}`} aria-label={`${color} highlight`} onClick={() => onUpdate(block.id, { props: { ...block.props, background: color } })} />
                  ))}
                </div>
                <button type="button" onClick={() => insertAfter(index, { type: block.type, content: block.content, props: block.props })}>Duplicate</button>
                <button type="button" onClick={() => { onDelete(block.id); setHandleFor(null); }}>Delete</button>
              </div>
            )}
            {block.type === 'todo' && (
              <button type="button" className="check-box" aria-pressed={block.checked} aria-label={block.checked ? 'Mark not done' : 'Mark done'} onClick={() => onUpdate(block.id, { checked: !block.checked })}>
                {block.checked ? '✓' : ''}
              </button>
            )}
            {block.type === 'bullet' && <span className="bullet-dot" aria-hidden="true" />}
            {block.type === 'numbered' && <span className="num">{number}.</span>}
            {block.type === 'toggle' && (
              <button type="button" className="mini" aria-expanded={!!block.props?.open} aria-label="Toggle" onClick={() => onUpdate(block.id, { props: { ...block.props, open: !block.props?.open } })}>
                {block.props?.open ? '▾' : '▸'}
              </button>
            )}
            <div className="block-main">
              {block.type === 'divider' && <div className="divider" role="separator" />}
              {block.type === 'image' && (
                <div className="media">
                  {block.props?.url ? <img src={block.props.url} alt={block.content || ''} /> : null}
                  <input className="quiet-input" placeholder="Image link" aria-label="Image link" value={block.props?.url || ''} onChange={(event) => onUpdate(block.id, { props: { ...block.props, url: event.target.value } })} />
                </div>
              )}
              {block.type === 'bookmark' && (
                <a className="bookmark" href={block.props?.url || undefined}>
                  <strong>{block.content || 'Bookmark'}</strong>
                  <input className="quiet-input" placeholder="https://" aria-label="Bookmark link" value={block.props?.url || ''} onChange={(event) => onUpdate(block.id, { props: { ...block.props, url: event.target.value } })} />
                </a>
              )}
              {block.type === 'embed' && (
                <div className="media">
                  {/^https?:\/\//i.test(block.props?.url || '') ? <iframe title="Embed" src={block.props.url} sandbox="" /> : null}
                  <input className="quiet-input" placeholder="Embed link" aria-label="Embed link" value={block.props?.url || ''} onChange={(event) => onUpdate(block.id, { props: { ...block.props, url: event.target.value } })} />
                </div>
              )}
              {block.type === 'table' && (
                <div className="mini-table">
                  {(block.props?.rows || []).map((row, rowIndex) => (
                    <div key={rowIndex} className="mini-row">
                      {row.map((cell, cellIndex) => (
                        <input
                          key={cellIndex}
                          aria-label={`Cell ${rowIndex + 1}-${cellIndex + 1}`}
                          value={cell}
                          onChange={(event) => {
                            const rows = (block.props?.rows || []).map((line) => line.slice());
                            rows[rowIndex][cellIndex] = event.target.value;
                            onUpdate(block.id, { props: { ...block.props, rows } });
                          }}
                        />
                      ))}
                    </div>
                  ))}
                  <button type="button" className="quiet-btn" onClick={() => {
                    const rows = (block.props?.rows || []).map((line) => line.slice());
                    const width = rows[0]?.length || 2;
                    rows.push(Array.from({ length: width }, () => ''));
                    onUpdate(block.id, { props: { ...block.props, rows } });
                  }}
                  >New row</button>
                </div>
              )}
              {block.type === 'columns' && (
                <div className="columns">
                  <textarea aria-label="Left column" value={block.props?.left || ''} onChange={(event) => onUpdate(block.id, { props: { ...block.props, left: event.target.value } })} />
                  <textarea aria-label="Right column" value={block.props?.right || ''} onChange={(event) => onUpdate(block.id, { props: { ...block.props, right: event.target.value } })} />
                </div>
              )}
              {block.type === 'page' && (
                <button type="button" className="page-link" onClick={() => block.props?.pageId && onOpenPage?.(block.props.pageId)}>
                  {withSystemPages(pages).find((page) => page.id === block.props?.pageId)?.icon || '📄'} {withSystemPages(pages).find((page) => page.id === block.props?.pageId)?.title || 'Choose a page'}
                </button>
              )}
              {block.type === 'page' && (
                <select aria-label="Linked page" value={block.props?.pageId || ''} onChange={(event) => onUpdate(block.id, { props: { ...block.props, pageId: event.target.value } })}>
                  <option value="">Choose a page</option>
                  {withSystemPages(pages).map((page) => <option key={page.id} value={page.id}>{page.title}</option>)}
                </select>
              )}
              {block.type === 'synced' && (
                <div className="synced">
                  <select aria-label="Synced page" value={block.props?.pageId || ''} onChange={(event) => onUpdate(block.id, { props: { ...block.props, pageId: event.target.value } })}>
                    <option value="">Choose a page</option>
                    {withSystemPages(pages).map((page) => <option key={page.id} value={page.id}>{page.title}</option>)}
                  </select>
                  {livingBlocks(blocks, block.props?.pageId).slice(0, 6).map((source) => (
                    <p key={source.id}>{source.content || source.type}</p>
                  ))}
                </div>
              )}
              {block.type === 'database' && (
                <div className="inline-db">
                  <select aria-label="Database" value={block.props?.source || 'tasks'} onChange={(event) => onUpdate(block.id, { props: { ...block.props, source: event.target.value } })}>
                    {DATABASE_SOURCES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                  </select>
                  <InlineDatabase source={block.props?.source || 'tasks'} />
                </div>
              )}
              {!['divider', 'image', 'bookmark', 'embed', 'table', 'columns', 'page', 'synced', 'database'].includes(block.type) && (
                <FitText
                  blockId={block.id}
                  autoFocus={focusId === block.id || (autoFocus && index === 0 && list.length === 1 && !block.content)}
                  value={block.content}
                  placeholder={index === list.length - 1 && !block.content ? "Press '/' for commands" : ''}
                  className={block.type === 'code' ? 'block-edit code' : 'block-edit'}
                  onChange={onChange(block)}
                  onKeyDown={onKeyDown(block, index)}
                />
              )}
              {block.type === 'bookmark' && (
                <FitText blockId={`${block.id}-title`} value={block.content} placeholder="Title" onChange={onChange(block)} onKeyDown={onKeyDown(block, index)} />
              )}
              {block.type === 'toggle' && block.props?.open && (
                <textarea className="block-edit toggle-body" value={block.props?.body || ''} placeholder="Hidden text" aria-label="Toggle contents" onChange={(event) => onUpdate(block.id, { props: { ...block.props, body: event.target.value, open: true } })} />
              )}
              <TokenText content={block.content} pages={pages} onOpenPage={onOpenPage} />
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
                        turnInto(block, item.type);
                      }}
                    >
                      <strong>{item.label}</strong>
                      <small>{item.hint}</small>
                    </button>
                  ))}
                </div>
              )}
              {mention != null && (
                <div className="slash-menu" role="listbox" aria-label="Mention">
                  <button type="button" onMouseDown={(event) => { event.preventDefault(); onUpdate(block.id, { content: applyMention(block.content, new Date().toISOString().slice(0, 10)) }); }}>
                    <strong>Today</strong>
                    <small>Date</small>
                  </button>
                  {mentionPages.map((page) => (
                    <button key={page.id} type="button" onMouseDown={(event) => { event.preventDefault(); onUpdate(block.id, { content: applyMention(block.content, page.title) }); }}>
                      <strong>{page.icon} {page.title}</strong>
                      <small>Page</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
      {list.length === 0 && <p className="empty-hint">Press ‘/’ for commands</p>}
    </div>
  );
}
