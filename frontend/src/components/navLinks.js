import { useState } from 'react'

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

// Parents followed by their children (flagged `sub`); children are left out while collapsed.
export const flatNav = (open = true) => NAV_LINKS.flatMap(l => [l, ...(open && l.children || []).map(c => ({ ...c, sub: true }))])

// Open/closed state of the subcategory group, remembered per browser.
export function useSubOpen() {
  const [open, setOpen] = useState(() => { try { return localStorage.getItem('navSubOpen') !== '0' } catch { return true } })
  const toggle = () => setOpen(o => { try { localStorage.setItem('navSubOpen', o ? '0' : '1') } catch {} return !o })
  return [open, toggle]
}
