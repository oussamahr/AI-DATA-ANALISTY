import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/auth'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { register: registerUser } = useAuthStore()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true)
    try {
      await registerUser(data.firstName, data.email, data.password)
      toast.success('Account created successfully')
      navigate('/dashboard')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#F8F6F2] py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px]"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#3A4B41] rounded-xl flex items-center justify-center">
              <span className="text-[#E6CFA7] text-2xl font-semibold">A</span>
            </div>
            <span className="font-semibold text-2xl tracking-tight">Aether</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>
          <p className="text-[#6B7280] mt-2">Start analyzing your data with AI</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">First name</label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 h-4 w-4 text-[#9CA3AF]" />
                <Input {...register('firstName')} placeholder="Jane" className="pl-11" />
              </div>
              {errors.firstName && <p className="text-sm text-[#C65B5B] mt-1">{errors.firstName.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 h-4 w-4 text-[#9CA3AF]" />
                <Input {...register('email')} type="email" placeholder="you@company.com" className="pl-11" />
              </div>
              {errors.email && <p className="text-sm text-[#C65B5B] mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 h-4 w-4 text-[#9CA3AF]" />
                <Input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-[#9CA3AF]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-[#C65B5B] mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Confirm password</label>
              <Input {...register('confirmPassword')} type="password" placeholder="••••••••" />
              {errors.confirmPassword && <p className="text-sm text-[#C65B5B] mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <Button type="submit" disabled={isLoading} className="w-full h-11 mt-2">
              {isLoading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <div className="text-center mt-6 text-sm text-[#6B7280]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#3A4B41] font-medium">Sign in</Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
