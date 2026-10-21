
import Logo from '../assets/Logo.png'
import { CircleDot } from 'lucide-react'

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">

        {/* Logo and Brand */}
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={Logo}
            alt="PaddleQ logo"
            className="h-10 w-10 shrink-0 object-contain"
          />

          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">
              PaddleQ
            </h1>
            <p className="hidden text-xs text-slate-500 sm:block">
              Pickleball Queue Manager
            </p>
          </div>
        </div>

        {/* Session Status */}
        <div className="flex shrink-0 items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          <CircleDot size={15} />
          <span>Session ready</span>
        </div>

      </div>
    </header>
  )
}

export default Header
