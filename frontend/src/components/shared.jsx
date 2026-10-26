import { createContext, useContext } from 'react'
import Icon, { CATEGORY_ICON } from './Icons.jsx'

export const AppCtx = createContext(null)
export const useApp = () => useContext(AppCtx)

export const CAT_COLOR = {
  'Military/Security': 'var(--c-mil)',
  'Administrative/Procedural': 'var(--c-adm)',
  'Legal/Institutional': 'var(--c-leg)',
  Economic: 'var(--c-eco)',
  Humanitarian: 'var(--c-hum)',
  Diplomatic: 'var(--c-dip)',
}
export const CAT_SHORT = {
  'Military/Security': 'Military',
  'Administrative/Procedural': 'Administrative',
  'Legal/Institutional': 'Legal',
  Economic: 'Economic',
  Humanitarian: 'Humanitarian',
  Diplomatic: 'Diplomatic',
}
export const TOPIC_COLOR = { 1: '#2c5d8f', 2: '#b5482f', 3: '#b7851b', 4: '#2f8f6a' }

export const GLOSSARY = [
  ['Resolution', 'A formal decision of the UN Security Council, numbered S/RES/n (year). Council Lens covers S/RES/660 (1990) to S/RES/2828 (2025).'],
  ['Operative clause', 'A numbered paragraph that starts with an action verb ("decides", "urges"). These are where the Council actually acts; the preamble only gives context.'],
  ['Binding', 'Clauses using obligatory verbs — decides, demands, authorizes, mandates, establishes, creates, terminates. Shown with a gavel.'],
  ['Non-binding', 'Exhortatory verbs — urges, calls upon, encourages, welcomes, requests. Shown with a quill.'],
  ['Intensity (1–5)', 'Strength of the operative verb. 5 = decides/demands/authorizes, 1 = welcomes/notes. Averaged per resolution, year or era.'],
  ['Solution category', 'Each clause is assigned one of six categories (Military/Security, Administrative, Legal, Economic, Humanitarian, Diplomatic) by keyword rules.'],
  ['LDA topic', 'Four themes found by topic modelling the full text. Every resolution is a mix of all four; the largest share is its "dominant topic".'],
  ['Primary subject', 'The country or theme a resolution is mostly about, auto-detected from the text. May be wrong for multi-country resolutions — use the flag button to tell us.'],
]

export function cap(s = '') {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}
export const pct = (x, d = 1) => (x == null ? '—' : `${(x * 100).toFixed(d)}%`)

export function CategoryChip({ category, size = 'md' }) {
  return (
    <span className={`chip chip-${size}`} style={{ '--chip': CAT_COLOR[category] }}>
      <Icon name={CATEGORY_ICON[category]} size={size === 'sm' ? 13 : 15} />
      {CAT_SHORT[category]}
    </span>
  )
}

export function BindingBadge({ binding, compact }) {
  return binding ? (
    <span className="bind bind-yes" title="Binding: obligatory language (decides / demands / authorizes)">
      <Icon name="binding" size={14} /> {compact ? '' : 'Binding'}
    </span>
  ) : (
    <span className="bind bind-no" title="Non-binding: exhortatory language (urges / calls upon / encourages)">
      <Icon name="nonbinding" size={14} /> {compact ? '' : 'Non-binding'}
    </span>
  )
}

export function IntensityDots({ value }) {
  return (
    <span className="dots" title={`Intensity ${value} of 5`} aria-label={`Intensity ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={i <= value ? 'on' : ''} />
      ))}
    </span>
  )
}

export function CategoryBar({ categories, height = 8, labels = false }) {
  // categories: [{category, share}]
  return (
    <div>
      <div className="catbar" style={{ height }} role="img"
        aria-label={categories.map((c) => `${CAT_SHORT[c.category]} ${pct(c.share, 0)}`).join(', ')}>
        {categories.filter((c) => c.share > 0).map((c) => (
          <span key={c.category} style={{ width: `${c.share * 100}%`, background: CAT_COLOR[c.category] }}
            title={`${c.category}: ${pct(c.share)}`} />
        ))}
      </div>
      {labels && (
        <div className="catbar-legend">
          {categories.map((c) => (
            <span key={c.category}><i style={{ background: CAT_COLOR[c.category] }} />{CAT_SHORT[c.category]} <b>{pct(c.share, 1)}</b></span>
          ))}
        </div>
      )}
    </div>
  )
}

export function Loading({ label = 'Loading' }) {
  return <div className="loading" role="status"><span className="spinner" />{label}…</div>
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="errorbox" role="alert">
      <Icon name="info" size={18} />
      <div>
        <b>Something went wrong.</b> {error?.message || String(error)}
        {onRetry && <button className="btn btn-link" onClick={onRetry}>Try again</button>}
      </div>
    </div>
  )
}

export function Empty({ title, children, icon = 'search' }) {
  return (
    <div className="empty">
      <Icon name={icon} size={28} />
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  )
}

export function Pager({ page, size, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / size))
  if (pages <= 1) return null
  return (
    <nav className="pager" aria-label="Pagination">
      <button className="btn btn-ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <Icon name="left" size={16} /> Previous
      </button>
      <span>Page <b>{page}</b> of {pages.toLocaleString()}</span>
      <button className="btn btn-ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next <Icon name="right" size={16} />
      </button>
    </nav>
  )
}

export function Term({ children, term }) {
  const { openHelp } = useApp()
  return (
    <button className="term" onClick={() => openHelp(term)} title="What does this mean?">
      {children}<Icon name="help" size={13} />
    </button>
  )
}

export function highlight(text, q) {
  if (!q) return text
  const terms = q.toLowerCase().match(/[\w']+/g)
  if (!terms) return text
  const re = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  return text.split(re).map((part, i) => (i % 2 === 1 ?<mark key={i}>{part}</mark> : part))
}

// Bold the clause's own opening verb phrase. The stored verb is a lemma ("demand")
// and may not match the text ("demands"), so split on the text itself.
export function ClauseText({ text, q }) {
  const m = text.match(/^(calls upon|[\w-]+)(.*)$/s)
  const head = m ? m[1] : '', rest = m ? m[2] : text
  return <><b className="verb">{cap(head)}</b>{q ? highlight(rest, q) : rest}{text.length >= 300 && <span className="trunc" title="The source dataset stores the first 300 characters of each clause. Open the full text for the rest.">…</span>}</>
}
