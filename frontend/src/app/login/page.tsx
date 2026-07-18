import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/auth'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      await login(data.email, data.password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#F8F6F2]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px]"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#3A4B41] rounded-xl flex items-center justify-center">
              <span className="text-[#E6CFA7] text-2xl font-semibold tracking-[-1px]">A</span>
            </div>
            <div className="text-left">
              <div className="font-semibold text-2xl tracking-[-0.5px] text-[#1F2937]">Aether</div>
              <div className="text-xs text-[#6B7280] -mt-1">AI ANALYTICS</div>
            </div>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#1F2937]">Welcome back</h1>
          <p className="text-[#6B7280] mt-2">Sign in to your account</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#1F2937] mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 h-4 w-4 text-[#9CA3AF]" />
                <Input
                  {...register('email')}
                  type="email"
                  placeholder="you@company.com"
                  className="pl-11"
                />
              </div>
              {errors.email && <p className="text-sm text-[#C65B5B] mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1F2937] mb-1.5">Password</label>
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
                  className="absolute right-4 top-3.5 text-[#9CA3AF] hover:text-[#6B7280]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-[#C65B5B] mt-1">{errors.password.message}</p>}
            </div>

            <div className="flex justify-between items-center text-sm">
              <Link to="/forgot-password" className="text-[#3A4B41] hover:text-[#4B5F54]">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full h-11">
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-[#6B7280]">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-[#3A4B41] hover:text-[#4B5F54] font-medium">
              Create account
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
