import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Icon from './components/Icons.jsx'
import { AppCtx, GLOSSARY, Loading, ErrorBox } from './components/shared.jsx'
import { api } from './api.js'
import Home from './pages/Home.jsx'
import Explore from './pages/Explore.jsx'
import Resolution from './pages/Resolution.jsx'
import Language from './pages/Language.jsx'
import Trends from './pages/Trends.jsx'
import Compare from './pages/Compare.jsx'
import Notebook from './pages/Notebook.jsx'

const NAV = [
  ['/', 'globe', 'Overview'],
  ['/explore', 'search', 'Resolutions'],
  ['/language', 'binding', 'Clause language'],
  ['/trends', 'trends', 'Trends'],
  ['/compare', 'compare', 'Compare'],
  ['/notebook', 'notebook', 'Notebook'],
]

function readLS(k) { try { return localStorage.getItem(k) } catch { return null } }
function writeLS(k, v) { try { localStorage.setItem(k, v) } catch {} }

export default function App() {
  const [meta, setMeta] = useState(null)
  const [metaErr, setMetaErr] = useState(null)
  const [user, setUser] = useState(() => {
    const id = readLS('cl_user_id'); const name = readLS('cl_user_name')
    return id ? { id, display_name: name } : null
  })
  const [bookmarks, setBookmarks] = useState([])
  const [toasts, setToasts] = useState([])
  const [help, setHelp] = useState(null) // null | term string | true
  const [askName, setAskName] = useState(false)
  const pendingAction = useRef(null)
  const [menu, setMenu] = useState(false)
  const loc = useLocation()
  const navigate = useNavigate()

  const loadMeta = useCallback(() => {
    setMetaErr(null)
    api.meta().then(setMeta).catch(setMetaErr)
  }, [])
  useEffect(loadMeta, [loadMeta])
  useEffect(() => { setMenu(false); window.scrollTo(0, 0) }, [loc.pathname])

  const refreshBookmarks = useCallback(() => {
    if (!readLS('cl_user_id')) return setBookmarks([])
    api.bookmarks().then(setBookmarks).catch((e) => {
      if (e.status === 401) { setUser(null); writeLS('cl_user_id', '') }
    })
  }, [])
  useEffect(refreshBookmarks, [user, refreshBookmarks])

  const toast = useCallback((msg, opts = {}) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, msg, ...opts }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), opts.duration || 5000)
  }, [])

  // Actions that need a profile ask for a name first, then continue.
  const withUser = useCallback((fn) => {
    if (user) return fn()
    pendingAction.current = fn
    setAskName(true)
  }, [user])

  // keyboard shortcuts: "/" search, "?" help, Esc closes overlays
  useEffect(() => {
    const onKey = (e) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
      if (e.key === 'Escape') { setHelp(null); setAskName(false); setMenu(false) }
      if (typing) return
      if (e.key === '/') { e.preventDefault(); navigate('/explore?focus=1') }
      if (e.key === '?') setHelp(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  const ctx = { meta, user, bookmarks, refreshBookmarks, setBookmarks, toast, withUser, openHelp: (t) => setHelp(t || true) }

  return (
    <AppCtx.Provider value={ctx}>
      <a href="#main" className="skip">Skip to content</a>
      <div className="shell">
        <aside className={`side ${menu ? 'open' : ''}`}>
          <div className="brand">
            <span className="brand-mark"><Icon name="globe" size={20} /></span>
            <div>
              <b>Council Lens</b>
              <small>UN Security Council · 1990–2025</small>
            </div>
            <button className="btn btn-icon menu-btn" aria-label={menu ? 'Close menu' : 'Open menu'} onClick={() => setMenu(!menu)}>
              <Icon name={menu ? 'close' : 'menu'} />
            </button>
          </div>
          <nav className="nav" aria-label="Main">
            {NAV.map(([to, icon, label]) => (
              <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
                <Icon name={icon} size={18} />
                <span>{label}</span>
                {to === '/notebook' && bookmarks.length > 0 && <em className="count">{bookmarks.length}</em>}
              </NavLink>
            ))}
          </nav>
          <div className="side-foot">
            <button className="btn btn-ghost btn-block" onClick={() => setHelp(true)}>
              <Icon name="help" size={16} /> Glossary & help <kbd>?</kbd>
            </button>
            <p className="who">
              {user ? <>Signed in as <b>{user.display_name}</b></> : 'Browsing as guest'}
            </p>
            <p className="src">Data: UN Official Document System</p>
          </div>
        </aside>

        <main id="main" className="main">
          {metaErr ? <div className="page"><ErrorBox error={metaErr} onRetry={loadMeta} /></div>
            : !meta ? <div className="page"><Loading label="Loading the corpus" /></div>
            : (
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/resolution/:number" element={<Resolution />} />
                <Route path="/language" element={<Language />} />
                <Route path="/trends" element={<Trends />} />
                <Route path="/compare" element={<Compare />} />
                <Route path="/notebook" element={<Notebook />} />
                <Route path="*" element={<div className="page"><h1>Page not found</h1><p><NavLink to="/">Back to the overview</NavLink></p></div>} />
              </Routes>
            )}
        </main>
      </div>

      {help && <HelpDrawer focus={typeof help === 'string' ? help : null} onClose={() => setHelp(null)} />}
      {askName && (
        <NameDialog
          onCancel={() => { setAskName(false); pendingAction.current = null }}
          onDone={(u) => {
            writeLS('cl_user_id', u.id); writeLS('cl_user_name', u.display_name)
            setUser(u); setAskName(false)
            toast(`Welcome, ${u.display_name}. Your notebook is ready.`)
            const fn = pendingAction.current; pendingAction.current = null
            if (fn) setTimeout(fn, 50)
          }}
        />
      )}

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <Icon name="check" size={16} />
            <span>{t.msg}</span>
            {t.action && (
              <button className="btn btn-link" onClick={() => { t.action.fn(); setToasts((x) => x.filter((y) => y.id !== t.id)) }}>
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </AppCtx.Provider>
  )
}

function HelpDrawer({ focus, onClose }) {
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus() }, [])
  return (
    <div className="overlay" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Glossary and help" onClick={(e) => e.stopPropagation()} tabIndex={-1} ref={ref}>
        <header>
          <h2>Glossary & help</h2>
          <button className="btn btn-icon" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </header>
        <dl className="glossary">
          {GLOSSARY.map(([t, d]) => (
            <div key={t} className={focus === t ? 'focus' : ''}>
              <dt>{t}</dt><dd>{d}</dd>
            </div>
          ))}
        </dl>
        <h3>Keyboard shortcuts</h3>
        <ul className="keys">
          <li><kbd>/</kbd> Jump to resolution search</li>
          <li><kbd>?</kbd> Open this panel</li>
          <li><kbd>Esc</kbd> Close panels and dialogs</li>
          <li><kbd>←</kbd> <kbd>→</kbd> Previous / next resolution (on a resolution page)</li>
        </ul>
        <h3>About the data</h3>
        <p>1,713 resolutions from the UN Official Document System were text-extracted; 1,644 yielded operative clauses (19,582 in total). Classification is rule-based and can be wrong — every clause has a <b>Flag</b> button so readers can correct it.</p>
      </aside>
    </div>
  )
}

function NameDialog({ onCancel, onDone }) {
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return setErr('Please enter a name so we can label your notebook.')
    setBusy(true)
    try { onDone(await api.createUser(name.trim())) } catch (e2) { setErr(e2.message); setBusy(false) }
  }
  return (
    <div className="overlay center" onClick={onCancel}>
      <form className="dialog" role="dialog" aria-modal="true" aria-labelledby="nd-title" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <h2 id="nd-title">Create your research notebook</h2>
        <p>Saving resolutions and flagging clauses needs a name to file them under. No password or email — it stays on this browser.</p>
        <label className="field">
          <span>Your name</span>
          <input autoFocus value={name} maxLength={60} onChange={(e) => { setName(e.target.value); setErr('') }} placeholder="e.g. Ananya, MUN delegate" />
        </label>
        {err && <p className="field-err" role="alert">{err}</p>}
        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Not now</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create notebook'}</button>
        </div>
      </form>
    </div>
  )
}
