import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HeartPulse } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-muted p-6 text-center">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500 text-white">
        <HeartPulse size={28} />
      </motion.div>
      <h1 className="text-3xl font-semibold text-ink-900">404</h1>
      <p className="text-ink-500">The page you're looking for doesn't exist.</p>
      <Link to="/" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">Go home</Link>
    </div>
  )
}
