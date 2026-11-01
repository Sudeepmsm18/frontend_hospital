import { useEffect, useState } from 'react'

export async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token')
  const res = await fetch(`/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  })
  if (res.status === 502 || res.status === 504) throw new Error('Cannot reach the server. Is the backend running (cd backend && npm run dev)?')
  const data = await res.json().catch(() => ({}))
  if (res.status === 401 && token) {
    localStorage.removeItem('token')
    window.location.reload()
  }
  if (!res.ok) throw new Error(data.message || 'Something went wrong')
  return data
}

// Fetches `path` and re-fetches every `ms` — our "live" updates without websockets.
export function usePoll(path, ms = 5000) {
  const [data, setData] = useState(null)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let alive = true
    const load = () => api(path).then((d) => alive && setData(d)).catch(() => {})
    load()
    const id = setInterval(load, ms)
    return () => { alive = false; clearInterval(id) }
  }, [path, ms, tick])
  return [data, () => setTick((t) => t + 1)]
}

export const dayOffset = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('en-CA')
}

export const prettyDate = (d) =>
  d === dayOffset(0)
    ? 'Today'
    : d === dayOffset(1)
      ? 'Tomorrow'
      : new Date(d + 'T00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })

export const initials = (name = '') => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
