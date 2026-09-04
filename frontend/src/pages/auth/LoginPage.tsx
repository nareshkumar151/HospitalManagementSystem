import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { LogIn } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate, Link } from 'react-router-dom'
import { useAppDispatch } from '../../app/hooks'
import { login } from '../../features/auth/authActions'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { extractErrorMessage } from '../../api/client'

const schema = z.object({
  usernameOrEmail: z.string().min(1, 'Enter your username or email'),
  password: z.string().min(1, 'Enter your password'),
})
type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    try {
      await dispatch(login(values.usernameOrEmail, values.password))
      toast.success('Welcome back!')
      navigate('/app/dashboard')
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Invalid username or password.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-accent-600 p-10 text-white md:flex">
        <motion.div
          className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/10"
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white p-1.5">
            <img src="/logo-icon.png" alt="Effisys Group" className="h-full w-full object-contain" />
          </div>
          <span className="text-lg font-semibold">Effisys Group</span>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="relative z-10 max-w-md"
        >
          <h1 className="text-3xl font-semibold leading-tight">One system for every ward, desk, and role.</h1>
          <p className="mt-3 text-white/80">
            Registration, appointments, OPD, IPD, pharmacy, billing and reporting - unified, secure, and built
            around the way your hospital actually works.
          </p>
        </motion.div>
        <p className="relative z-10 text-xs text-white/60">© {new Date().getFullYear()} Effisys Group</p>
      </div>

      <div className="flex items-center justify-center p-6 md:p-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 md:hidden flex items-center gap-2.5">
            <img src="/logo-icon.png" alt="Effisys Group" className="h-9 w-9 shrink-0 object-contain" />
            <span className="text-lg font-semibold text-ink-900">Effisys Group</span>
          </div>

          <h2 className="text-2xl font-semibold text-ink-900">Sign in</h2>
          <p className="mt-1 text-sm text-ink-500">Use the credentials issued by your hospital administrator.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <Input
              label="Username or email"
              placeholder="e.g. admin"
              error={errors.usernameOrEmail?.message}
              {...register('usernameOrEmail')}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" className="w-full" loading={submitting} icon={<LogIn size={16} />}>
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            Booking a visit as a patient?{' '}
            <Link to="/register" className="font-medium text-brand-600 hover:underline">Create a patient account</Link>
          </p>

          <div className="mt-8 rounded-xl border border-ink-100 bg-surface-muted p-4 text-xs text-ink-500">
            <p className="mb-1 font-medium text-ink-700">Demo logins (seeded)</p>
            <p>superadmin / SuperAdmin@123 · admin / Admin@123 · dr.aditi / Doctor@123 · nurse.neha / Nurse@123</p>
            <p>reception.pooja / Reception@123 · pharma.ramesh / Pharmacist@123</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
