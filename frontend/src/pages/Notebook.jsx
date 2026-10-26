import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icons.jsx'
import { api } from '../api.js'
import { Empty, useApp } from '../components/shared.jsx'

export default function Notebook() {
  const { user, bookmarks, refreshBookmarks, toast, withUser } = useApp()
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState('')
  const [filter, setFilter] = useState('')

  if (!user) {
    return (
      <div className="page">
        <header className="page-head"><h1>Notebook</h1></header>
        <Empty title="Keep the resolutions that matter to your research" icon="notebook">
          <p>Save resolutions while you browse, add a note to each, and export them as a CSV for your brief or paper.</p>
          <button className="btn btn-primary" onClick={() => withUser(() => {})}>Create my notebook</button>
        </Empty>
      </div>
    )
  }

  const remove = async (b) => {
    await api.removeBookmark(b.resolution_number); refreshBookmarks()
    toast(`Removed ${b.symbol}`, { action: { label: 'Undo', fn: async () => { await api.addBookmark(b.resolution_number, b.note); refreshBookmarks() } } })
  }
  const save = async (b) => { await api.editNote(b.resolution_number, draft); setEditing(null); refreshBookmarks(); toast('Note saved') }
  const exportCsv = () => {
    const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`
    const csv = ['symbol,year,subject,note,saved_at,link', ...bookmarks.map((b) =>
      [b.symbol, b.year, b.subject, b.note, b.created_at, `https://undocs.org/en/S/RES/${b.resolution_number}(${b.year})`].map(esc).join(','))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'council-lens-notebook.csv'; a.click()
  }
  const shown = bookmarks.filter((b) => !filter || `${b.symbol} ${b.subject} ${b.note}`.toLowerCase().includes(filter.toLowerCase()))

  return (
    <div className="page">
      <header className="page-head row-between">
        <div><h1>{user.display_name}'s notebook</h1><p className="lede">{bookmarks.length} saved resolution{bookmarks.length === 1 ? '' : 's'}.</p></div>
        {bookmarks.length > 0 && <button className="btn btn-ghost" onClick={exportCsv}><Icon name="download" size={16} /> Export CSV</button>}
      </header>
      {bookmarks.length === 0 ? (
        <Empty title="Nothing saved yet" icon="notebook">
          Use the <Icon name="notebook" size={14} /> button on any resolution to save it here. <Link to="/explore">Browse resolutions</Link>
        </Empty>
      ) : (
        <>
          <input className="input" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter your notebook…" aria-label="Filter notebook" />
          <ul className="nb-list">
            {shown.map((b) => (
              <li key={b.id} className="nb-item">
                <div className="nb-head">
                  <Link to={`/resolution/${b.resolution_number}`}><span className="sym">{b.symbol}</span> <b>{b.subject}</b></Link>
                  <div className="row">
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(b.id); setDraft(b.note || '') }}><Icon name="edit" size={14} /> {b.note ? 'Edit note' : 'Add note'}</button>
                    <button className="btn btn-ghost btn-sm danger" onClick={() => remove(b)}><Icon name="close" size={14} /> Remove</button>
                  </div>
                </div>
                {editing === b.id ? (
                  <div className="note-edit">
                    <textarea autoFocus rows={2} value={draft} maxLength={2000} onChange={(e) => setDraft(e.target.value)} aria-label={`Note for ${b.symbol}`} />
                    <div className="row"><button className="btn btn-primary btn-sm" onClick={() => save(b)}>Save</button><button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button></div>
                  </div>
                ) : b.note ? <p className="note-text">{b.note}</p> : null}
                <small className="muted">Saved {b.created_at?.slice(0, 10)}</small>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
