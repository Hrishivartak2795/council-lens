// Council Lens icon set — 24×24 grid, 1.75px stroke, round caps/joins.
// The first twelve are the project icon set documented in Experiment 5.
const P = {
  military: <path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6l7-3z M9 12l2 2 4-4" />,
  administrative: (
    <>
      <rect x="5" y="4.5" width="14" height="16.5" rx="2" />
      <rect x="9" y="2.75" width="6" height="3.5" rx="1" />
      <path d="M8.5 10.5h7 M8.5 14h7 M8.5 17.5h4" />
    </>
  ),
  legal: (
    <>
      <circle cx="12" cy="4" r="1.2" />
      <path d="M12 5.2V20 M8 20h8 M5 7.5h14 M5 7.5l-2.6 6a2.6 2.6 0 0 0 5.2 0L5 7.5 M19 7.5l-2.6 6a2.6 2.6 0 0 0 5.2 0L19 7.5" />
    </>
  ),
  economic: (
    <>
      <ellipse cx="9.5" cy="6.5" rx="5.5" ry="2.3" />
      <path d="M4 6.5v4c0 1.3 2.5 2.3 5.5 2.3 M4 10.5v4c0 1.3 2.5 2.3 5.5 2.3" />
      <ellipse cx="15.5" cy="12.5" rx="5" ry="2.1" />
      <path d="M10.5 12.5v4.2c0 1.2 2.2 2.1 5 2.1s5-.9 5-2.1v-4.2 M10.5 16.7" />
    </>
  ),
  humanitarian: (
    <path d="M12 19.5s-7-4.1-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.3c0 5.1-7 9.2-7 9.2z M12 10.6v4.2 M9.9 12.7h4.2" />
  ),
  diplomatic: (
    <path d="M3.5 4.5h9.5a1.2 1.2 0 0 1 1.2 1.2v5.6a1.2 1.2 0 0 1-1.2 1.2H8l-3 2.8v-2.8H3.5a1.2 1.2 0 0 1-1.2-1.2V5.7a1.2 1.2 0 0 1 1.2-1.2z M17 9h3.5a1.2 1.2 0 0 1 1.2 1.2v5.6a1.2 1.2 0 0 1-1.2 1.2H19v2.8l-3-2.8h-4.5a1.2 1.2 0 0 1-1.2-1.2v-1.2" />
  ),
  binding: (
    <path d="M13.4 3.2l7.4 7.4-2.6 2.6-7.4-7.4z M14.6 11.8L5.4 21a1.6 1.6 0 0 1-2.3-2.3l9.2-9.2 M12.5 21h8.5" />
  ),
  nonbinding: (
    <path d="M20.5 3.5C13 3.5 7.5 9 6.8 16.6L5 20.5 M20.5 3.5c0 6.8-5 12-12.7 13.1 M8.5 15.5l6-6" />
  ),
  eras: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3.2 2.2" />
    </>
  ),
  compare: (
    <>
      <rect x="2.75" y="4.5" width="7.5" height="15" rx="1.6" />
      <rect x="13.75" y="4.5" width="7.5" height="15" rx="1.6" />
      <path d="M5.2 15.5h2.6 M5.2 12h2.6 M16.2 9h2.6 M16.2 12.5h2.6" />
    </>
  ),
  search: <path d="M10.8 4.5a6.3 6.3 0 1 1 0 12.6 6.3 6.3 0 0 1 0-12.6z M15.4 15.4L20 20" />,
  notebook: <path d="M7 3.5h10a1 1 0 0 1 1 1V21l-6-4-6 4V4.5a1 1 0 0 1 1-1z" />,
  // utility icons
  trends: <path d="M3 17l6-6 4 4 8-8 M15 7h6v6" />,
  flag: <path d="M5.5 21V3.8 M5.5 4h11.5l-2.4 4.2L17 12.5H5.5" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17 M12 3.5c3 3.2 3 13.8 0 17 M12 3.5c-3 3.2-3 13.8 0 17" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.4 M12 16.6v.4" />
    </>
  ),
  menu: <path d="M4 7h16 M4 12h16 M4 17h16" />,
  close: <path d="M6 6l12 12 M18 6L6 18" />,
  undo: <path d="M9 14L4.5 9.5 9 5 M4.5 9.5H15a5 5 0 0 1 0 10h-3" />,
  left: <path d="M15 5l-7 7 7 7" />,
  right: <path d="M9 5l7 7-7 7" />,
  external: <path d="M14 4h6v6 M20 4l-9 9 M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  filter: <path d="M4 5h16l-6.2 7.4V19l-3.6-1.8v-4.8z" />,
  download: <path d="M12 4v11 M7.5 10.5L12 15l4.5-4.5 M5 19.5h14" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5 M12 7.6v.4" />
    </>
  ),
}

export const CATEGORY_ICON = {
  'Military/Security': 'military',
  'Administrative/Procedural': 'administrative',
  'Legal/Institutional': 'legal',
  Economic: 'economic',
  Humanitarian: 'humanitarian',
  Diplomatic: 'diplomatic',
}

export default function Icon({ name, size = 18, title, className = '', strokeWidth = 1.75 }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title && <title>{title}</title>}
      {P[name]}
    </svg>
  )
}

export const ICON_SET = [
  ['military', 'Military / Security', 'Shield with a check — protection and enforcement mandates (peacekeeping, ceasefires).'],
  ['diplomatic', 'Diplomatic', 'Two overlapping speech bubbles — dialogue, negotiation, mediation.'],
  ['humanitarian', 'Humanitarian', 'Heart with a medical cross — aid access, civilian protection.'],
  ['legal', 'Legal / Institutional', 'Balance scales — tribunals, ICC referrals, legal obligations.'],
  ['economic', 'Economic', 'Two stacks of coins — sanctions, asset freezes, embargoes.'],
  ['administrative', 'Administrative / Procedural', 'Clipboard with lines — reports, mandate renewals, requests to the SG.'],
  ['binding', 'Binding clause', 'Gavel — "decides", "demands", "authorizes": obligatory language.'],
  ['nonbinding', 'Non-binding clause', 'Quill — "urges", "calls upon", "encourages": exhortatory language.'],
  ['eras', 'Era / timeline', 'Clock face — filter or compare the four historical eras.'],
  ['compare', 'Compare', 'Two side-by-side panels — A/B comparison of eras, regions or subjects.'],
  ['search', 'Search', 'Magnifying glass — full-text search of resolutions and clauses.'],
  ['notebook', 'Notebook', 'Bookmark ribbon — save resolutions with personal research notes.'],
]
