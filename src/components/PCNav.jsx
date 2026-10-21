
import { NavLink } from 'react-router-dom'
import {
  CalendarDays,
  ListOrdered,
  Swords,
  History,
  Trophy,
} from 'lucide-react'

function PCNav() {
  const navItems = [
    {
      name: 'Set Session',
      path: '/set-session',
      icon: CalendarDays,
    },
    {
      name: 'Manage Match Queue',
      path: '/live-match-queue',
      icon: Swords,
    },
    {
      name: 'Live Queue',
      path: '/live-queue',
      icon: ListOrdered,
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
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-slate-200 bg-white md:flex md:flex-col">

      {/* Logo / Brand */}
      <div className="border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          PaddleQ
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Pickleball Queue Manager
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 overflow-y-auto p-4">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Navigation
        </p>

        {navItems.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 p-4">
        <p className="text-center text-xs text-slate-400">
          PaddleQ · Pickleball Queue
        </p>
      </div>
    </aside>
  )
}

export default PCNav
