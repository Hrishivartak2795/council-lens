import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Icon from '../components/Icons.jsx'
import { api } from '../api.js'
import { CategoryBar, ErrorBox, Loading, Term, pct, useApp, CAT_SHORT } from '../components/shared.jsx'

const YEARS = Array.from({ length: 36 }, (_, i) => 1990 + i)
const DEFAULTS = { a_year_from: '1990', a_year_to: '2001', b_year_from: '2019', b_year_to: '2025' }

function describe(s, meta) {
  const yrs = s.year_from || s.year_to ? `${s.year_from || 1990}–${s.year_to || 2025}` : 'all years'
  const era = meta.eras.find((e) => String(e.start_year) === s.year_from && String(e.end_year) === s.year_to)
  const where = s.subject || s.region || 'all regions'
  const out = `${where}, ${era ? era.name + ' ' : ''}${yrs}`
  return out.charAt(0).toUpperCase() + out.slice(1)
}

function SetPicker({ side, s, onChange, meta }) {
  const subjects = meta.subjects.filter((x) => !s.region || x.region === s.region)
  return (
    <div className={`picker picker-${side}`}>
      <h3><span className="side-badge">{side.toUpperCase()}</span> {describe(s, meta)}</h3>
      <div className="era-pills">
        {meta.eras.map((e) => (
          <button key={e.name} className={`pill ${String(e.start_year) === s.year_from && String(e.end_year) === s.year_to ? 'on' : ''}`}
            onClick={() => onChange({ year_from: String(e.start_year), year_to: String(e.end_year) })}>{e.name}</button>
        ))}
        <button className={`pill ${!s.year_from && !s.year_to ? 'on' : ''}`} onClick={() => onChange({ year_from: '', year_to: '' })}>All years</button>
      </div>
      <div className="grid2">
        <label className="field"><span>From</span>
          <select value={s.year_from} onChange={(e) => onChange({ year_from: e.target.value })}><option value="">1990</option>{YEARS.map((y) => <option key={y}>{y}</option>)}</select></label>
        <label className="field"><span>To</span>
          <select value={s.year_to} onChange={(e) => onChange({ year_to: e.target.value })}><option value="">2025</option>{YEARS.map((y) => <option key={y}>{y}</option>)}</select></label>
        <label className="field"><span>Region</span>
          <select value={s.region} onChange={(e) => onChange({ region: e.target.value, subject: '' })}><option value="">All</option>{meta.regions.map((r) => <option key={r.region}>{r.region}</option>)}</select></label>
        <label className="field"><span>Country / theme</span>
          <select value={s.subject} onChange={(e) => onChange({ subject: e.target.value })}><option value="">Any</option>{subjects.map((x) => <option key={x.subject} value={x.subject}>{x.subject}</option>)}</select></label>
      </div>
    </div>
  )
}

export default function Compare() {
  const { meta } = useApp()
  const [sp, setSp] = useSearchParams()
  const params = useMemo(() => {
    const p = Object.fromEntries(sp.entries())
    return Object.keys(p).length ? p : DEFAULTS
  }, [sp])
  const side = (k) => ({ year_from: params[`${k}_year_from`] || '', year_to: params[`${k}_year_to`] || '', region: params[`${k}_region`] || '', subject: params[`${k}_subject`] || '' })
  const A = side('a'), B = side('b')
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => { setData(null); setErr(null); api.compare(params).then(setData).catch(setErr) }, [params])
  const update = (k, patch) => {
    const next = { ...params }
    Object.entries(patch).forEach(([f, v]) => { if (v) next[`${k}_${f}`] = v; else delete next[`${k}_${f}`] })
    setSp(next)
  }
  const swap = () => {
    const next = {}
    Object.entries(params).forEach(([k, v]) => { next[(k[0] === 'a' ? 'b' : 'a') + k.slice(1)] = v })
    setSp(next)
  }

  const chart = data ? meta.categories.map((c, i) => ({ name: CAT_SHORT[c], A: +(data.a.categories[i].share * 100).toFixed(1), B: +(data.b.categories[i].share * 100).toFixed(1) })) : []
  const tooSmall = data && (data.a.clauses < 30 || data.b.clauses < 30)

  let sentences = []
  if (data && data.a.clauses && data.b.clauses) {
    const d = data.diff
    const bigUp = Object.entries(d.categories_pp).sort((x, y) => y[1] - x[1])[0]
    const bigDown = Object.entries(d.categories_pp).sort((x, y) => x[1] - y[1])[0]
    sentences = [
      `B uses binding language ${Math.abs(d.binding_rate_pp)} points ${d.binding_rate_pp < 0 ? 'less' : 'more'} often than A (${pct(data.b.binding_rate)} vs ${pct(data.a.binding_rate)}).`,
      `Average clause intensity is ${data.b.avg_intensity.toFixed(2)} in B vs ${data.a.avg_intensity.toFixed(2)} in A (${d.avg_intensity >= 0 ? '+' : ''}${d.avg_intensity}).`,
      `The biggest shift is ${CAT_SHORT[bigUp[0]]} (${bigUp[1] > 0 ? '+' : ''}${bigUp[1]} pts) and ${CAT_SHORT[bigDown[0]]} (${bigDown[1]} pts).`,
    ]
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>Compare</h1>
        <p className="lede">Pick any two slices of the corpus — eras, regions or countries — and see how the Council's response differs.</p>
      </header>
      <div className="compare-pickers">
        <SetPicker side="a" s={A} meta={meta} onChange={(p) => update('a', p)} />
        <button className="btn btn-icon swap" onClick={swap} title="Swap A and B" aria-label="Swap A and B"><Icon name="compare" /></button>
        <SetPicker side="b" s={B} meta={meta} onChange={(p) => update('b', p)} />
      </div>
      {err ? <ErrorBox error={err} /> : !data ? <Loading label="Comparing" /> : (
        <>
          {tooSmall && <p className="caption warn">One side has fewer than 30 clauses — differences may be noise.</p>}
          {sentences.length > 0 && (
            <div className="verdict">
              <h2>What changed from A to B</h2>
              <ul>{sentences.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
          )}
          <div className="compare-stats">
            {[['a', data.a, A], ['b', data.b, B]].map(([k, s, sel]) => (
              <div key={k} className={`cstat cstat-${k}`}>
                <h3><span className="side-badge">{k.toUpperCase()}</span> {describe(sel, meta)}</h3>
                <div className="era-stats">
                  <div><b>{s.resolutions}</b><small>resolutions</small></div>
                  <div><b>{s.clauses.toLocaleString()}</b><small>clauses</small></div>
                  <div><b>{pct(s.binding_rate)}</b><small><Term term="Binding">binding</Term></small></div>
                  <div><b>{s.avg_intensity.toFixed(2)}</b><small>intensity</small></div>
                </div>
                <CategoryBar categories={s.categories} labels height={10} />
                <p className="muted small">Most used verbs: {s.top_verbs.slice(0, 5).map((v) => v.verb).join(', ')}</p>
                <Link className="btn btn-ghost btn-sm" to={`/explore?${new URLSearchParams(Object.fromEntries(Object.entries(sel).filter(([, v]) => v)))}`}>See these resolutions <Icon name="right" size={14} /></Link>
              </div>
            ))}
          </div>
          <figure className="chart-card wide">
            <figcaption><h3>Solution mix, A vs B</h3><p>Share of clauses in each category.</p></figcaption>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chart} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid stroke="#e7e4dc" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis unit="%" tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar isAnimationActive={false} dataKey="A" fill="#16243f" radius={[3, 3, 0, 0]} />
                <Bar isAnimationActive={false} dataKey="B" fill="#c9a227" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </figure>
        </>
      )}
    </div>
  )
}
