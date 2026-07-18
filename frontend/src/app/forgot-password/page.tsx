import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authApi } from '@/services/api'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

const forgotSchema = z.object({
  email: z.string().email('Please enter a valid email'),
})

type ForgotForm = z.infer<typeof forgotSchema>

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  })

  const onSubmit = async (data: ForgotForm) => {
    setIsLoading(true)
    try {
      await authApi.forgotPassword(data.email)
      setSubmitted(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send reset email')
    } finally {
      setIsLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-[#E8F0E9] flex items-center justify-center mb-6">
            <Mail className="w-8 h-8 text-[#5C8A67]" />
          </div>
          <h1 className="text-2xl font-semibold mb-2">Check your email</h1>
          <p className="text-[#6B7280] mb-8">
            We sent a password reset link to your email address.
          </p>
          <Link to="/login" className="btn btn-secondary inline-flex">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#F8F6F2]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/login" className="inline-flex items-center text-sm text-[#6B7280] hover:text-[#3A4B41] mb-6">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to login
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">Forgot your password?</h1>
          <p className="text-[#6B7280] mt-2">We'll email you instructions to reset it.</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 h-4 w-4 text-[#9CA3AF]" />
                <Input {...register('email')} type="email" placeholder="you@company.com" className="pl-11" />
              </div>
              {errors.email && <p className="text-sm text-[#C65B5B] mt-1">{errors.email.message}</p>}
            </div>

            <Button type="submit" disabled={isLoading} className="w-full h-11">
              {isLoading ? 'Sending...' : 'Send reset link'}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
