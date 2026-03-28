'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { TreePine, Lock, Eye, EyeOff } from 'lucide-react'

export default function LoginForm() {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/tree')
      router.refresh()
    } else {
      setError('Incorrect password. Ask a family moderator for access.')
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative w-full max-w-md mx-4"
    >
      <div
        className="rounded-2xl p-8 shadow-2xl"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'var(--node-root-bg)', border: '1px solid var(--node-root-border)' }}
          >
            <TreePine size={28} style={{ color: 'var(--accent)' }} />
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Alahmad Family Tree
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Rooted in AbuBakr — Enter your family password
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <div
              className="flex items-center rounded-xl overflow-hidden"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            >
              <Lock size={16} className="ml-4 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Family password"
                className="flex-1 px-3 py-3.5 bg-transparent outline-none text-sm"
                style={{ color: 'var(--text-primary)' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-3 hover:opacity-70 transition-opacity"
                style={{ color: 'var(--text-secondary)' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-400 text-center"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'var(--accent)',
              color: '#fff',
              boxShadow: loading ? 'none' : '0 0 20px var(--accent-glow)',
            }}
          >
            {loading ? 'Verifying...' : 'Enter Family Tree'}
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-secondary)' }}>
          Don&apos;t have access? Contact a family moderator.
        </p>
      </div>
    </motion.div>
  )
}
