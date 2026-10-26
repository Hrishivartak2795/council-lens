import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Icon from '../components/Icons.jsx'
import { api } from '../api.js'
import { BindingBadge, CategoryChip, Empty, ErrorBox, IntensityDots, Loading, Pager, Term, cap, highlight, useApp, CAT_COLOR, CAT_SHORT } from '../components/shared.jsx'
import { ClauseText } from '../components/shared.jsx'

const KEYS = ['q', 'category', 'binding', 'min_intensity', 'region', 'year_from', 'year_to', 'page']

export default function Language() {
  const { meta } = useApp()
  const [sp, setSp] = useSearchParams()
  const f = useMemo(() => Object.fromEntries(KEYS.map((k) => [k, sp.get(k) || ''])), [sp])
  const [draft, setDraft] = useState(f.q)
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  useEffect(() => setDraft(f.q), [f.q])
  useEffect(() => {
    setData(null); setErr(null)
    api.clauses({ ...f, page: f.page || 1 }).then(setData).catch(setErr)
  }, [f])
  const set = (patch, reset = true) => {
    const n = new URLSearchParams(sp)
    Object.entries(patch).forEach(([k, v]) => (v === '' || v == null ? n.delete(k) : n.set(k, v)))
    if (reset) n.delete('page')
    setSp(n)
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>Clause language</h1>
        <p className="lede">Search all {meta.totals.clauses.toLocaleString()} <Term term="Operative clause">operative clauses</Term> to see how the Council words a demand, a sanction or an appeal.</p>
      </header>
      <form className="searchbar" role="search" onSubmit={(e) => { e.preventDefault(); set({ q: draft.trim() }) }}>
        <Icon name="search" size={18} />
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Words or phrase, e.g. humanitarian access, arms embargo, withdraw" aria-label="Search clauses" />
        {draft && <button type="button" className="btn btn-icon" aria-label="Clear" onClick={() => { setDraft(''); set({ q: '' }) }}><Icon name="close" size={16} /></button>}
        <button className="btn btn-primary">Search</button>
      </form>

      <div className="toolbar">
        <div className="seg" role="group" aria-label="Binding">
          {[['', 'All'], ['true', 'Binding'], ['false', 'Non-binding']].map(([v, l]) => (
            <button key={v} className={f.binding === v ? 'on' : ''} onClick={() => set({ binding: v })}>
              {v === 'true' && <Icon name="binding" size={14} />}{v === 'false' && <Icon name="nonbinding" size={14} />}{l}
            </button>
          ))}
        </div>
        <select value={f.category} onChange={(e) => set({ category: e.target.value })} aria-label="Category">
          <option value="">All categories</option>
          {meta.categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={f.min_intensity} onChange={(e) => set({ min_intensity: e.target.value })} aria-label="Minimum intensity">
          <option value="">Any intensity</option>
          {[2, 3, 4, 5].map((i) => <option key={i} value={i}>Intensity ≥ {i}</option>)}
        </select>
        <select value={f.region} onChange={(e) => set({ region: e.target.value })} aria-label="Region">
          <option value="">All regions</option>
          {meta.regions.map((r) => <option key={r.region}>{r.region}</option>)}
        </select>
        <select value={`${f.year_from}-${f.year_to}`} onChange={(e) => { const [a, b] = e.target.value.split('-'); set({ year_from: a, year_to: b }) }} aria-label="Era">
          <option value="-">All years</option>
          {meta.eras.map((e) => <option key={e.name} value={`${e.start_year}-${e.end_year}`}>{e.name} ({e.start_year}–{e.end_year})</option>)}
        </select>
        <span className="muted">{data ? `${data.total.toLocaleString()} clauses` : ''}</span>
      </div>

      {err ? <ErrorBox error={err} />
        : !data ? <Loading label="Searching clauses" />
        : data.items.length === 0 ? <Empty title="No clauses match">Try fewer words, or set binding and category back to “All”.</Empty>
        : (
          <>
            <ul className="clauses flat">
              {data.items.map((c) => (
                <li key={c.id} className="clause" style={{ '--chip': CAT_COLOR[c.category] }}>
                  <div className="clause-meta">
                    <Link to={`/resolution/${c.resolution_number}`} className="sym">{c.symbol}</Link>
                    <span className="muted">{c.subject}</span>
                    <CategoryChip category={c.category} size="sm" />
                    <BindingBadge binding={c.binding} />
                    <IntensityDots value={c.intensity} />
                  </div>
                  <p><ClauseText text={c.text} q={f.q} /></p>
                </li>
              ))}
            </ul>
            <Pager page={data.page} size={data.size} total={data.total} onPage={(p) => set({ page: p }, false)} />
          </>
        )}
    </div>
  )
}
