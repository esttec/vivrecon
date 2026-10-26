// Single source for the sidebar and mobile menu. `children` render indented under their parent.
export const NAV_LINKS = [
  { key: 'nav.budget', path: '/budget', icon: '💰', children: [
    { key: 'nav.house',    path: '/house',    icon: '🏠' },
    { key: 'nav.eating',   path: '/eating',   icon: '🥗' },
    { key: 'nav.travel',   path: '/travel',   icon: '✈️' },
    { key: 'nav.clothing', path: '/clothing', icon: '👗' },
    { key: 'nav.children', path: '/children', icon: '🧒' },
    { key: 'nav.subs',     path: '/subscriptions', icon: '🔁' },
  ] },
  { key: 'nav.accounts', path: '/accounts',    icon: '🏦' },
  { key: 'nav.profile',  path: '/profile',     icon: '👤' },
  { key: 'nav.debts',    path: '/debts',       icon: '💳' },
  { key: 'nav.savings',  path: '/savings',     icon: '🐷' },
  { key: 'inv.title',    path: '/investments', icon: '📈' },
]

// Parents followed by their children, each flagged with `sub`.
export const flatNav = () => NAV_LINKS.flatMap(l => [l, ...(l.children || []).map(c => ({ ...c, sub: true }))])
