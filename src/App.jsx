import './index.css'
import { Routes, Route, useLocation } from 'react-router-dom'

import Home from './pages/Home'
import SetSession from './pages/SetSession'
import LiveQueue from './pages/LiveQueue'
import LiveMatchQueue from './pages/LiveMatchQueue'
import History from './pages/History'
import Podium from './pages/Podium'



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
    <>
      {showNav && <PCNav />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/set-session" element={<SetSession />} />
        <Route path="/live-queue" element={<LiveQueue />} />
        <Route path="/live-match-queue" element={<LiveMatchQueue />} />
        <Route path="/history" element={<History />} />
        <Route path="/podium" element={<Podium />} />
      </Routes>

      {showNavMobile && <MobileNav />}
    </>
  )
}

export default App
