import Logo from '../assets/Logo.png'
import { Activity, ArrowRight, CircleDot, ShieldCheck, Sparkles, Users } from 'lucide-react'
import Login from '../components/Login'

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#071c17] px-4 py-5 text-white sm:px-6 sm:py-8 lg:h-dvh lg:min-h-0">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_25%,rgba(20,126,87,.35),transparent_42%),radial-gradient(ellipse_at_90%_80%,rgba(10,113,107,.2),transparent_38%)]" />
        <div className="absolute -right-24 top-10 h-[34rem] w-[34rem] rounded-full border border-lime-200/10" />
        <div className="absolute -right-10 top-24 h-[28rem] w-[28rem] rounded-full border border-lime-200/10" />
        <div className="absolute right-[14%] top-1/2 hidden h-64 border-l border-lime-200/15 lg:block" />
        <div className="absolute right-10 top-1/2 hidden w-[43%] border-t border-lime-200/15 lg:block" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-6xl items-center gap-10 lg:h-full lg:min-h-0 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
        <section className="mx-auto w-full max-w-xl text-center lg:mx-0 lg:text-left">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-lime-300 shadow-lg shadow-lime-950/30"><img src={Logo} alt="PaddleQ" className="h-12 w-12 object-contain" /></div>
            <div><p className="text-left text-xl font-black tracking-tight">Paddle<span className="text-lime-300">Q</span></p><p className="text-left text-xs font-medium uppercase tracking-[0.18em] text-emerald-100/60">Pickleball, in rhythm</p></div>
          </div>

          <p className="mx-auto mt-10 inline-flex items-center gap-2 rounded-full border border-lime-200/20 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-lime-200 lg:mx-0"><Activity size={13} /> Your courtside command center</p>
          <h1 className="mt-5 text-5xl font-black leading-[0.98] tracking-[-0.05em] sm:text-6xl lg:text-7xl">Queue up.<br /><span className="text-lime-300">Game on.</span></h1>
          <p className="mx-auto mt-5 max-w-md text-base leading-7 text-emerald-50/70 lg:mx-0">Bring order to open play. Keep the players rotating, the courts moving, and every match in view.</p>

          <div className="mt-9 grid gap-2 text-left sm:grid-cols-3">
            <Feature icon={<Users size={17} />} title="Player queue" detail="Fair turns, less waiting" />
            <Feature icon={<CircleDot size={17} />} title="Live courts" detail="See every match" />
            <Feature icon={<ShieldCheck size={17} />} title="Standings" detail="Track the wins" />
          </div>
          <div className="mt-8 hidden items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-100/50 lg:flex"><Sparkles size={14} className="text-lime-300" /> Made for the next game <ArrowRight size={14} /></div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="relative rounded-[1.75rem] border border-white/10 bg-[#f9fbf8] p-1.5 shadow-2xl shadow-black/30">
            <div className="absolute -inset-px rounded-[1.8rem] bg-gradient-to-br from-lime-300/30 via-transparent to-teal-400/20 blur-sm" />
            <div className="relative overflow-hidden rounded-[1.4rem] bg-white text-slate-900">
              <div className="flex items-center justify-between bg-[#123f33] px-5 py-4 text-white sm:px-7">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-lime-200">Player access</p><h2 className="mt-1 text-xl font-bold">Welcome back</h2></div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-lime-200"><Activity size={19} /></div>
              </div>
              <div className="px-5 py-5 sm:px-7 sm:py-7">
                <p className="text-sm text-slate-500">Sign in and get the next game moving.</p>
                <Login />
                <p className="mt-5 text-center text-xs text-slate-400">Made by <span className="font-semibold text-emerald-700">Arwin Janoyan</span></p>
                <p className="mt-5 text-center text-[11px] text-slate-400">PaddleQ · Courtside session manager</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function Feature({ icon, title, detail }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-sm"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-300/15 text-lime-200">{icon}</div><p className="mt-3 text-sm font-semibold text-white">{title}</p><p className="mt-0.5 text-xs text-emerald-50/55">{detail}</p></div>
}
