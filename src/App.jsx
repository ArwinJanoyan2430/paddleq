import './index.css'
import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'

const Home = lazy(() => import('./pages/Home'))
const SetSession = lazy(() => import('./pages/SetSession'))
const LiveQueue = lazy(() => import('./pages/LiveQueue'))
const LiveMatchQueue = lazy(() => import('./pages/LiveMatchQueue'))
const History = lazy(() => import('./pages/History'))
const Podium = lazy(() => import('./pages/Podium'))

import MobileNav from './components/MobileNav'
import PCNav from './components/PCNav'

function App() {
  const location = useLocation()
  const showNavMobile = [
    '/set-session',
    '/live-queue',
    '/live-match-queue',
    '/history',
    '/podium',
  ].includes(location.pathname)

  const showNav = [
    '/set-session',
    '/live-queue',
    '/live-match-queue',
    '/history',
    '/podium',
  ].includes(location.pathname)

  return (
    <div className={`bg-slate-100 ${showNav ? 'md:ml-64' : ''} min-h-screen ${showNavMobile ? 'pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0' : ''}`}>
      {showNav && <PCNav />}
      <Suspense fallback={<main className="min-h-[50vh] px-4 py-10 text-center text-sm text-slate-500" role="status">Loading page…</main>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/set-session" element={<SetSession />} />
          <Route path="/live-queue" element={<LiveQueue />} />
          <Route path="/live-match-queue" element={<LiveMatchQueue />} />
          <Route path="/history" element={<History />} />
          <Route path="/podium" element={<Podium />} />
        </Routes>
      </Suspense>
      {showNavMobile && <MobileNav />}
    </div>
  )
}

export default App
