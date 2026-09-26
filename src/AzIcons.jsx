/*
 * Azora nav icons.
 *
 * SOURCE OF TRUTH: azora-design/AzIcons.jsx
 * Do not edit the copies inside each site; run azora-design/sync.mjs instead.
 *
 * Inline SVG rather than an icon package: only one of the nine sites had
 * lucide-react installed, and a shared top bar should not force a dependency
 * into the other eight. Every glyph is a 24x24 stroke icon on currentColor, so
 * the nav styles size and fade them without knowing which icon is which.
 */

function Icon({ children, ...rest }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

/** Book — the guide. */
export const BookIcon = (p) => (
  <Icon {...p}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </Icon>
)

/** Document — reference docs. */
export const DocsIcon = (p) => (
  <Icon {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M9 13h6M9 17h6" />
  </Icon>
)

/** Angle brackets — the playground. */
export const CodeIcon = (p) => (
  <Icon {...p}>
    <path d="m16 18 6-6-6-6" />
    <path d="m8 6-6 6 6 6" />
  </Icon>
)

/** Orbit — the wider ecosystem. */
export const EcosystemIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(-24 12 12)" />
  </Icon>
)

/** Heart — donate. */
export const HeartIcon = (p) => (
  <Icon {...p}>
    <path d="M19 5.7a4.6 4.6 0 0 0-6.5 0L12 6.2l-.5-.5A4.6 4.6 0 0 0 5 12.2l6.4 6.4a.8.8 0 0 0 1.2 0l6.4-6.4a4.6 4.6 0 0 0 0-6.5z" />
  </Icon>
)

/** GitHub mark. Filled, so it opts out of the stroke defaults. */
export const GithubIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...p}>
    <path d="M12 1.8a10.2 10.2 0 0 0-3.23 19.87c.51.1.7-.22.7-.49l-.01-1.9c-2.6.5-3.28-.63-3.5-1.21-.12-.3-.63-1.22-1.08-1.47-.37-.2-.9-.68-.02-.7.83-.01 1.42.77 1.62 1.08.95 1.6 2.47 1.15 3.07.88.1-.69.37-1.15.67-1.42-2.3-.26-4.71-1.15-4.71-5.1 0-1.13.4-2.06 1.06-2.78-.1-.26-.46-1.31.1-2.73 0 0 .87-.27 2.85 1.06a9.6 9.6 0 0 1 5.18 0c1.98-1.34 2.85-1.06 2.85-1.06.57 1.42.21 2.47.1 2.73.67.72 1.07 1.64 1.07 2.77 0 3.97-2.42 4.84-4.72 5.1.37.32.7.94.7 1.9l-.01 2.82c0 .27.18.6.7.49A10.2 10.2 0 0 0 12 1.8z" />
  </svg>
)

/** Terminal — the language and its toolchain. */
export const TerminalIcon = (p) => (
  <Icon {...p}>
    <path d="m4 17 6-5-6-5" />
    <path d="M12 19h8" />
  </Icon>
)

/** Layers — the engine. */
export const EngineIcon = (p) => (
  <Icon {...p}>
    <path d="m12 2 9 5-9 5-9-5 9-5z" />
    <path d="m3 12 9 5 9-5" />
    <path d="m3 17 9 5 9-5" />
  </Icon>
)

/** Window with a sidebar — the studio. */
export const StudioIcon = (p) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16" />
  </Icon>
)

/** People — the community. */
export const CommunityIcon = (p) => (
  <Icon {...p}>
    <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" />
    <circle cx="10" cy="8" r="3.2" />
    <path d="M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.38" />
    <path d="M15.5 5a3.2 3.2 0 0 1 0 6.2" />
  </Icon>
)

/** Grid — a set of projects. */
export const ProjectsIcon = (p) => (
  <Icon {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </Icon>
)

/** Menu / close, for the mobile toggle. */
export const MenuIcon = (p) => (
  <Icon {...p}><path d="M4 6h16M4 12h16M4 18h16" /></Icon>
)
export const CloseIcon = (p) => (
  <Icon {...p}><path d="M6 6l12 12M18 6L6 18" /></Icon>
)
