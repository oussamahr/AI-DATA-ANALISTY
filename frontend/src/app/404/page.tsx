import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="text-[120px] font-semibold tracking-tighter text-[#3A4B41] leading-none">404</div>
      <div className="text-2xl font-semibold tracking-tight mt-2">Page not found</div>
      <p className="text-[#6B7280] mt-2 max-w-xs">The page you are looking for does not exist or has been moved.</p>
      <Button asChild className="mt-8">
        <Link to="/dashboard">Go to Dashboard</Link>
      </Button>
    </div>
  )
}
