import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../components/Icons.jsx'
import { api } from '../api.js'
import { CategoryBar, Loading, pct, useApp, Term } from '../components/shared.jsx'

export default function Home() {
  const { meta } = useApp()
  const [eras, setEras] = useState(null)
  const [latest, setLatest] = useState(null)
  const [q, setQ] = useState('')
  const nav = useNavigate()
  useEffect(() => {
    api.eras().then(setEras)
    api.resolutions({ size: 5 }).then((r) => setLatest(r.items))
  }, [])
  const t = meta.totals

  return (
    <div className="page home">
      <section className="hero">
        <p className="eyebrow">UN Security Council · {t.first_year}–{t.last_year}</p>
        <h1>Read how the Council acts, clause by clause.</h1>
        <p className="lede">
          Search {t.resolutions.toLocaleString()} resolutions and {t.clauses.toLocaleString()} classified operative clauses.
          See when the Council <em>decides</em> and when it only <em>urges</em>, and how that has changed over 35 years.
        </p>
        <form className="bigsearch" onSubmit={(e) => { e.preventDefault(); nav(`/explore?q=${encodeURIComponent(q)}`) }} role="search">
          <Icon name="search" size={20} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a country, theme or phrase — e.g. Sudan, ceasefire, asset freeze" aria-label="Search resolutions" />
          <button className="btn btn-primary">Search</button>
        </form>
        <p className="hint">Try: <Link to="/explore?subject=Libya">Libya</Link> · <Link to="/explore?q=sexual%20violence">sexual violence</Link> · <Link to="/language?q=asset%20freeze&binding=true">binding "asset freeze" clauses</Link></p>
      </section>

      <section className="tasks">
        <h2 className="section-h">Start with a question</h2>
        <div className="task-grid">
          <Link to="/explore?region=Africa" className="task">
            <Icon name="search" size={22} />
            <b>What has the Council said about a place?</b>
            <span>Filter resolutions by country, region, year or theme.</span>
          </Link>
          <Link to="/compare" className="task">
            <Icon name="compare" size={22} />
            <b>Has its language softened?</b>
            <span>Compare binding rate and solution mix between two eras or regions.</span>
          </Link>
          <Link to="/language" className="task">
            <Icon name="binding" size={22} />
            <b>How is a demand usually worded?</b>
            <span>Search 19,582 operative clauses by verb, category and strength.</span>
          </Link>
        </div>
      </section>

      <section>
        <h2 className="section-h">Four eras at a glance <Term term="Binding">what is "binding"?</Term></h2>
        {!eras ? <Loading /> : (
          <div className="era-grid">
            {eras.map((e) => (
              <Link key={e.name} to={`/explore?year_from=${e.start_year}&year_to=${e.end_year}`} className="era">
                <span className="era-years">{e.start_year}–{e.end_year}</span>
                <h3>{e.name}</h3>
                <div className="era-stats">
                  <div><b>{pct(e.binding_rate)}</b><small>binding clauses</small></div>
                  <div><b>{e.avg_intensity.toFixed(2)}</b><small>avg intensity / 5</small></div>
                  <div><b>{e.resolutions}</b><small>resolutions</small></div>
                </div>
                <CategoryBar categories={e.categories} />
              </Link>
            ))}
          </div>
        )}
        <p className="caption">Bars show each era's mix of the six solution categories. Military/Security grows from 35% to 45% while binding language falls by about 7.5 points.</p>
      </section>

      <section>
        <div className="row-between">
          <h2 className="section-h">Most recent resolutions</h2>
          <Link to="/explore" className="btn btn-ghost">Browse all <Icon name="right" size={16} /></Link>
        </div>
        {!latest ? <Loading /> : (
          <ul className="mini-list">
            {latest.map((r) => (
              <li key={r.number}>
                <Link to={`/resolution/${r.number}`}>
                  <span className="sym">{r.symbol}</span>
                  <span className="subj">{r.subject}</span>
                  <span className="muted">{r.adopted_on || r.year} · {r.n_clauses} clauses · {pct(r.binding_rate, 0)} binding</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
