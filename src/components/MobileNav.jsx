
import { NavLink } from 'react-router-dom'
import {
  CalendarDays,
  ListOrdered,
  Swords,
  History,
  Trophy,
} from 'lucide-react'

function MobileNav() {
  const navItems = [
    {
      name: 'Set Session',
      path: '/set-session',
      icon: CalendarDays,
    },
    {
      name: 'Live Matches',
      path: '/live-match-queue',
      icon: Swords,
    },
    {
      name: 'History',
      path: '/history',
      icon: History,
    },
    {
      name: 'Podium',
      path: '/podium',
      icon: Trophy,
    },
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 shadow-lg backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-2xl overflow-x-auto px-2 pb-[env(safe-area-inset-bottom)] pt-2">
        {navItems.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex min-h-14 min-w-[64px] flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[10px] font-medium transition ${
                  isActive
                    ? 'text-emerald-600'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span className="whitespace-nowrap">
                    {item.name}
                  </span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

export default MobileNav
