import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const LOGIN_SESSION_KEY = 'paddleq-admin-session'

function Login() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (event) => {
    event.preventDefault()
    setError('')

    if (username !== 'admin' || password !== 'admin') {
      setError('Invalid username or password.')
      return
    }

    setLoading(true)
    sessionStorage.setItem(LOGIN_SESSION_KEY, 'active')
    window.dispatchEvent(new Event('paddleq-auth-change'))
    navigate('/set-session')
    setLoading(false)
  }

  return (
    <div className="mt-5">
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium text-slate-700">Username</label>
            <input id="username" type="text" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Enter username" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100" required />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100" required />
          </div>
          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#123f33] py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-60">{loading ? 'Signing in...' : 'Log in'} <span aria-hidden="true">→</span></button>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </form>
    </div>
  )
}

export default Login
