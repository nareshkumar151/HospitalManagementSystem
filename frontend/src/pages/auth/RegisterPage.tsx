import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch } from '../../app/hooks'
import { registerPatient } from '../../features/auth/authActions'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { extractErrorMessage } from '../../api/client'

const schema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  mobile: z.string().regex(/^\+?[0-9]{10,15}$/, 'Enter a valid mobile number'),
  email: z.string().email('Enter a valid email address'),
  gender: z.enum(['Male', 'Female', 'Other']),
  dateOfBirth: z.string().optional(),
  password: z.string().min(8, 'At least 8 characters'),
})
type FormValues = z.infer<typeof schema>

export function RegisterPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { gender: 'Male' },
  })

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    try {
      await dispatch(registerPatient(values))
      toast.success('Account created - welcome!')
      navigate('/app/patient')
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Could not create your account.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-ink-100 bg-surface p-8 shadow-[var(--shadow-card)]"
      >
        <h1 className="text-2xl font-semibold text-ink-900">Create your patient account</h1>
        <p className="mt-1 text-sm text-ink-500">Book appointments, view reports, and manage your bills online.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <Input label="Full name" error={errors.fullName?.message} {...register('fullName')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Mobile" error={errors.mobile?.message} {...register('mobile')} />
            <Select label="Gender" error={errors.gender?.message} {...register('gender')}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </Select>
          </div>
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Date of birth" type="date" {...register('dateOfBirth')} />
          <Input label="Password" type="password" error={errors.password?.message} {...register('password')} />
          <Button type="submit" className="w-full" loading={submitting} icon={<UserPlus size={16} />}>
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          Already have an account? <Link to="/login" className="font-medium text-brand-600 hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
