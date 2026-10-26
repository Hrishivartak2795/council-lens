import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api.js'
import { ErrorBox, Loading, Term, pct, useApp, CAT_SHORT, TOPIC_COLOR } from '../components/shared.jsx'

export const CAT_HEX = {
  'Military/Security': '#b5482f', 'Administrative/Procedural': '#7a808a', 'Legal/Institutional': '#6d4fb3',
  Economic: '#b7851b', Humanitarian: '#2f8f6a', Diplomatic: '#2a6fb0',
}
const EVENTS = [[2001, '9/11', 'top'], [2011, 'Arab Spring', 'top'], [2020, 'COVID', 'insideTopRight'], [2022, 'Ukraine', 'insideTopLeft']]

export default function Trends() {
  const { meta } = useApp()
  const [sp, setSp] = useSearchParams()
  const region = sp.get('region') || ''
  const subject = sp.get('subject') || ''
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [table, setTable] = useState(false)

  useEffect(() => { setData(null); setErr(null); api.trends({ region, subject }).then(setData).catch(setErr) }, [region, subject])
  const set = (p) => { const n = new URLSearchParams(sp); Object.entries(p).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); setSp(n) }

  const rows = useMemo(() => (data?.years || []).map((y) => ({
    year: y.year, resolutions: y.resolutions, clauses: y.clauses,
    binding: y.binding_rate != null ? +(y.binding_rate * 100).toFixed(1) : null,
    intensity: y.avg_intensity, t1: y.t1, t2: y.t2, t3: y.t3, t4: y.t4,
    ...Object.fromEntries(Object.entries(y.categories).map(([k, v]) => [k, +(v * 100).toFixed(1)])),
  })), [data])

  const scope = subject || region || 'All resolutions'
  const subjects = meta.subjects.filter((s) => !region || s.region === region)
  const thin = rows.filter((r) => r.clauses > 0 && r.clauses < 20).length

  return (
    <div className="page">
      <header className="page-head">
        <h1>Trends over time</h1>
        <p className="lede">How the Council's themes, language strength and solution mix change year by year.</p>
      </header>
      <div className="toolbar">
        <label className="inline">Scope
          <select value={region} onChange={(e) => set({ region: e.target.value, subject: '' })} aria-label="Region">
            <option value="">All regions</option>
            {meta.regions.map((r) => <option key={r.region}>{r.region}</option>)}
          </select>
        </label>
        <select value={subject} onChange={(e) => set({ subject: e.target.value })} aria-label="Country or theme">
          <option value="">Any country / theme</option>
          {subjects.map((s) => <option key={s.subject} value={s.subject}>{s.subject} ({s.n})</option>)}
        </select>
        <button className="btn btn-ghost" onClick={() => setTable(!table)} aria-pressed={table}>{table ? 'Show charts' : 'Show as table'}</button>
      </div>

      {err ? <ErrorBox error={err} /> : !data ? <Loading label="Computing trends" /> : (
        <>
          <div className="summary-strip">
            <div><b>{scope}</b><small>scope</small></div>
            <div><b>{data.summary.resolutions.toLocaleString()}</b><small>resolutions with clauses</small></div>
            <div><b>{data.summary.clauses.toLocaleString()}</b><small>clauses</small></div>
            <div><b>{pct(data.summary.binding_rate)}</b><small>binding overall</small></div>
            <div><b>{data.summary.avg_intensity.toFixed(2)}</b><small>avg intensity</small></div>
          </div>
          {thin > 3 && <p className="caption warn">Small sample: {thin} years in this scope have fewer than 20 clauses, so year-to-year swings are noisy.</p>}

          {table ? (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Year</th><th>Resolutions</th><th>Clauses</th><th>Binding %</th><th>Intensity</th>{meta.categories.map((c) => <th key={c}>{CAT_SHORT[c]} %</th>)}</tr></thead>
                <tbody>{rows.map((r) => <tr key={r.year}><td>{r.year}</td><td>{r.resolutions}</td><td>{r.clauses}</td><td>{r.binding ?? '—'}</td><td>{r.intensity ?? '—'}</td>{meta.categories.map((c) => <td key={c}>{r[c]}</td>)}</tr>)}</tbody>
              </table>
            </div>
          ) : (
            <div className="charts">
              <figure className="chart-card">
                <figcaption><h3><Term term="Binding">Binding language</Term> by year</h3><p>Share of operative clauses using obligatory verbs.</p></figcaption>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={rows} margin={{ top: 16, right: 16, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke="#e7e4dc" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} interval={4} />
                    <YAxis unit="%" tick={{ fontSize: 12 }} domain={[0, 'auto']} />
                    <Tooltip formatter={(v) => `${v}%`} />
                    {EVENTS.map(([y, l, pos]) => <ReferenceLine key={y} x={y} stroke="#9aa3b2" strokeDasharray="3 3" label={{ value: l, position: pos, fontSize: 11, fill: '#5b6472' }} />)}
                    <Line isAnimationActive={false} type="linear" dataKey="binding" name="Binding %" stroke="#16243f" strokeWidth={2.2} dot={false} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </figure>

              <figure className="chart-card">
                <figcaption><h3><Term term="LDA topic">Topic prevalence</Term></h3><p>Average share of each LDA topic across that year's resolutions.</p></figcaption>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={rows} margin={{ top: 16, right: 16, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke="#e7e4dc" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} interval={4} />
                    <YAxis tick={{ fontSize: 12 }} domain={[0, 1]} />
                    <Tooltip formatter={(v) => (v * 100).toFixed(0) + '%'} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {meta.topics.map((t) => <Line isAnimationActive={false} key={t.id} dataKey={`t${t.id}`} name={`T${t.id} ${t.label}`} stroke={TOPIC_COLOR[t.id]} strokeWidth={2} dot={false} />)}
                  </LineChart>
                </ResponsiveContainer>
              </figure>

              <figure className="chart-card wide">
                <figcaption><h3><Term term="Solution category">Solution mix</Term></h3><p>Share of clauses in each of the six solution categories (stacked to 100%).</p></figcaption>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={rows.filter((r) => r.clauses > 0)} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke="#e7e4dc" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} interval={4} />
                    <YAxis unit="%" tick={{ fontSize: 12 }} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} allowDataOverflow />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {meta.categories.map((c) => <Area isAnimationActive={false} key={c} type="linear" dataKey={c} name={CAT_SHORT[c]} stackId="1" stroke={CAT_HEX[c]} fill={CAT_HEX[c]} fillOpacity={0.82} />)}
                  </AreaChart>
                </ResponsiveContainer>
              </figure>
            </div>
          )}
        </>
      )}
    </div>
  )
}
