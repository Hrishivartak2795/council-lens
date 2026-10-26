import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Icon from '../components/Icons.jsx'
import { api } from '../api.js'
import {
  BindingBadge, CategoryBar, CategoryChip, ErrorBox, IntensityDots, Loading, Term, cap, pct, useApp,
  CAT_COLOR, CAT_SHORT, TOPIC_COLOR,
} from '../components/shared.jsx'
import { ClauseText } from '../components/shared.jsx'

export default function Resolution() {
  const { number } = useParams()
  const { meta, bookmarks, withUser, toast, refreshBookmarks } = useApp()
  const nav = useNavigate()
  const [r, setR] = useState(null)
  const [err, setErr] = useState(null)
  const [cat, setCat] = useState('')
  const [bindOnly, setBindOnly] = useState(false)
  const [showText, setShowText] = useState(false)
  const [flagging, setFlagging] = useState(null)
  const bm = bookmarks.find((b) => b.resolution_number === Number(number))
  const [note, setNote] = useState('')
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    setR(null); setErr(null); setCat(''); setBindOnly(false); setShowText(false)
    api.resolution(number).then(setR).catch(setErr)
  }, [number])
  useEffect(() => { setNote(bm?.note || '') }, [bm?.note])

  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || !r) return
      if (e.key === 'ArrowLeft' && r.prev) nav(`/resolution/${r.prev}`)
      if (e.key === 'ArrowRight' && r.next) nav(`/resolution/${r.next}`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [r, nav])

  const cats = useMemo(() => {
    if (!r || !r.clauses.length) return []
    return meta.categories.map((c) => {
      const n = r.clauses.filter((x) => x.category === c).length
      return { category: c, count: n, share: n / r.clauses.length }
    })
  }, [r, meta])

  if (err) return <div className="page"><Link to="/explore" className="back"><Icon name="left" size={16} /> Resolutions</Link><ErrorBox error={err} /></div>
  if (!r) return <div className="page"><Loading label={`Opening S/RES/${number}`} /></div>

  const clauses = r.clauses.filter((c) => (!cat || c.category === cat) && (!bindOnly || c.binding))
  const binding = r.clauses.filter((c) => c.binding).length
  const avgI = r.clauses.length ? r.clauses.reduce((s, c) => s + c.intensity, 0) / r.clauses.length : 0
  const topics = [1, 2, 3, 4].map((i) => ({ id: i, share: r[`topic_${i}`] || 0, label: meta.topics[i - 1].label }))

  const save = () => withUser(async () => {
    await api.addBookmark(r.number, note); refreshBookmarks(); toast(`Saved ${r.symbol} to your notebook`)
  })
  const unsave = () => withUser(async () => {
    const old = bm?.note || ''
    await api.removeBookmark(r.number); refreshBookmarks()
    toast(`Removed ${r.symbol} from your notebook`, { action: { label: 'Undo', fn: async () => { await api.addBookmark(r.number, old); refreshBookmarks() } } })
  })
  const saveNote = async () => {
    await api.editNote(r.number, note); refreshBookmarks(); setEditing(false); toast('Note saved')
  }

  return (
    <div className="page resolution">
      <div className="crumbs">
        <Link to="/explore" className="back"><Icon name="left" size={16} /> Resolutions</Link>
        <div className="prevnext">
          <button className="btn btn-ghost" disabled={!r.prev} onClick={() => nav(`/resolution/${r.prev}`)} title="Previous resolution (←)"><Icon name="left" size={16} /> {r.prev || ''}</button>
          <button className="btn btn-ghost" disabled={!r.next} onClick={() => nav(`/resolution/${r.next}`)} title="Next resolution (→)">{r.next || ''} <Icon name="right" size={16} /></button>
        </div>
      </div>

      <header className="res-head">
        <div>
          <p className="eyebrow">{r.symbol} · adopted {r.adopted_on || r.year} · {r.era}</p>
          <h1>{r.subject}</h1>
          <p className="muted small">
            {r.region} · <Term term="Primary subject">primary subject is auto-detected</Term>
          </p>
        </div>
        <div className="res-actions">
          {bm ? (
            <button className="btn btn-saved" onClick={unsave}><Icon name="check" size={16} /> Saved</button>
          ) : (
            <button className="btn btn-primary" onClick={save}><Icon name="notebook" size={16} /> Save to notebook</button>
          )}
          <a className="btn btn-ghost" href={r.source_url} target="_blank" rel="noreferrer">UN document <Icon name="external" size={14} /></a>
        </div>
      </header>

      {bm && (
        <div className="note-box">
          <label htmlFor="note"><Icon name="edit" size={14} /> Your note</label>
          {editing || !bm.note ? (
            <>
              <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why is this resolution useful to you?" rows={2} maxLength={2000} />
              <div className="row"><button className="btn btn-primary btn-sm" onClick={saveNote} disabled={note === (bm.note || '')}>Save note</button>
                {bm.note && <button className="btn btn-ghost btn-sm" onClick={() => { setNote(bm.note); setEditing(false) }}>Cancel</button>}</div>
            </>
          ) : (
            <p onClick={() => setEditing(true)} className="note-text">{bm.note} <button className="btn btn-link">Edit</button></p>
          )}
        </div>
      )}

      <section className="kpis">
        <div className="kpi"><b>{r.clauses.length}</b><span><Term term="Operative clause">operative clauses</Term></span></div>
        <div className="kpi"><b>{r.clauses.length ? pct(binding / r.clauses.length, 0) : '—'}</b><span><Term term="Binding">binding</Term> ({binding})</span></div>
        <div className="kpi"><b>{r.clauses.length ? avgI.toFixed(2) : '—'}</b><span><Term term="Intensity (1–5)">avg intensity</Term> / 5</span></div>
        <div className="kpi kpi-wide">
          <span className="kpi-label"><Term term="LDA topic">Topic mix</Term></span>
          <div className="catbar" style={{ height: 10 }}>
            {topics.map((t) => <span key={t.id} style={{ width: `${t.share * 100}%`, background: TOPIC_COLOR[t.id] }} title={`T${t.id} ${t.label}: ${pct(t.share)}`} />)}
          </div>
          <div className="catbar-legend">
            {topics.map((t) => <span key={t.id}><i style={{ background: TOPIC_COLOR[t.id] }} />T{t.id} {t.label} <b>{pct(t.share, 0)}</b></span>)}
          </div>
        </div>
      </section>

      {r.clauses.length > 0 ? (
        <section>
          <div className="row-between">
            <h2 className="section-h">Operative clauses</h2>
            <label className="check"><input type="checkbox" checked={bindOnly} onChange={(e) => setBindOnly(e.target.checked)} /> Binding only</label>
          </div>
          <CategoryBar categories={cats} height={10} />
          <div className="cat-filter" role="tablist" aria-label="Filter clauses by category">
            <button role="tab" aria-selected={!cat} className={`pill ${!cat ? 'on' : ''}`} onClick={() => setCat('')}>All <small>{r.clauses.length}</small></button>
            {cats.filter((c) => c.count).map((c) => (
              <button role="tab" aria-selected={cat === c.category} key={c.category} className={`pill ${cat === c.category ? 'on' : ''}`}
                style={{ '--chip': CAT_COLOR[c.category] }} onClick={() => setCat(cat === c.category ? '' : c.category)}>
                <i className="dot" />{CAT_SHORT[c.category]} <small>{c.count}</small>
              </button>
            ))}
          </div>
          <ol className="clauses">
            {clauses.map((c, i) => (
              <li key={c.id} className="clause" style={{ '--chip': CAT_COLOR[c.category] }}>
                <div className="clause-meta">
                  <CategoryChip category={c.category} size="sm" />
                  <BindingBadge binding={c.binding} />
                  <IntensityDots value={c.intensity} />
                  <button className="btn btn-link flag" onClick={() => withUser(() => setFlagging(c))} title="Tell us this clause is misclassified">
                    <Icon name="flag" size={14} /> Flag
                  </button>
                </div>
                <p><ClauseText text={c.text} /></p>
              </li>
            ))}
            {clauses.length === 0 && <li className="muted">No clauses match. <button className="btn btn-link" onClick={() => { setCat(''); setBindOnly(false) }}>Show all</button></li>}
          </ol>
        </section>
      ) : (
        <div className="errorbox"><Icon name="info" size={18} /><div>No operative clauses were extracted from this document (often a scanned pre-1995 PDF). The full text below may still be readable.</div></div>
      )}

      <section>
        <button className="btn btn-ghost" onClick={() => setShowText(!showText)} aria-expanded={showText}>
          <Icon name={showText ? 'close' : 'administrative'} size={16} /> {showText ? 'Hide' : 'Show'} extracted full text
        </button>
        {showText && <pre className="fulltext">{r.full_text || 'No text extracted.'}</pre>}
      </section>

      {r.related.length > 0 && (
        <section>
          <h2 className="section-h">Other resolutions on {r.subject}</h2>
          <div className="related">
            {r.related.map((x) => <Link key={x.number} to={`/resolution/${x.number}`}><b>{x.symbol}</b></Link>)}
            <Link to={`/explore?subject=${encodeURIComponent(r.subject)}`} className="btn btn-ghost">All {r.subject} <Icon name="right" size={14} /></Link>
          </div>
        </section>
      )}

      {flagging && <FlagDialog clause={flagging} categories={meta.categories} onClose={() => setFlagging(null)} onDone={() => { setFlagging(null); toast('Thanks — your correction was recorded for review') }} />}
    </div>
  )
}

function FlagDialog({ clause, categories, onClose, onDone }) {
  const [cat, setCat] = useState('')
  const [bind, setBind] = useState('')
  const [comment, setComment] = useState('')
  const [err, setErr] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    if (!cat && bind === '' && !comment.trim()) return setErr('Choose a corrected category, a binding status, or leave a comment.')
    try {
      await api.feedback({ clause_id: clause.id, suggested_category: cat || null, suggested_binding: bind === '' ? null : bind === 'yes', comment })
      onDone()
    } catch (e2) { setErr(e2.message) }
  }
  return (
    <div className="overlay center" onClick={onClose}>
      <form className="dialog" role="dialog" aria-modal="true" aria-labelledby="fl-title" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <h2 id="fl-title">Flag a classification</h2>
        <blockquote className="quote">{cap(clause.text)}</blockquote>
        <p className="muted small">Currently: <b>{clause.category}</b> · <b>{clause.binding ? 'binding' : 'non-binding'}</b> · intensity {clause.intensity}/5</p>
        <label className="field"><span>Should be category</span>
          <select value={cat} onChange={(e) => { setCat(e.target.value); setErr('') }}>
            <option value="">(keep {clause.category})</option>
            {categories.filter((c) => c !== clause.category).map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <fieldset className="field"><span>Binding?</span>
          <div className="row">
            {[['', 'Keep as is'], ['yes', 'Binding'], ['no', 'Non-binding']].map(([v, l]) => (
              <label key={v} className="check"><input type="radio" name="bind" checked={bind === v} onChange={() => { setBind(v); setErr('') }} /> {l}</label>
            ))}
          </div>
        </fieldset>
        <label className="field"><span>Comment (optional)</span>
          <textarea rows={2} value={comment} maxLength={1000} onChange={(e) => { setComment(e.target.value); setErr('') }} placeholder="e.g. This is a humanitarian ceasefire, not a military clause" />
        </label>
        {err && <p className="field-err" role="alert">{err}</p>}
        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary">Send correction</button>
        </div>
      </form>
    </div>
  )
}
