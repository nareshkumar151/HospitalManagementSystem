import { motion } from 'framer-motion'
import type { HTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

type SafeDivAttributes = Omit<
  HTMLAttributes<HTMLDivElement>,
  'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'
>

interface CardProps extends SafeDivAttributes {
  children: ReactNode
  padded?: boolean
}

export function Card({ children, className, padded = true, ...rest }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={clsx('rounded-2xl bg-surface shadow-[var(--shadow-card)] border border-ink-100', padded && 'p-5', className)}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
