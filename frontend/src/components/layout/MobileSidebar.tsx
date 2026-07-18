import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, Database, BarChart3, PieChart, 
  MessageSquare, Clock, X 
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'

interface Props {
  open: boolean
  onClose: () => void
}

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/datasets', label: 'Datasets', icon: Database },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/visualizations', label: 'Visualizations', icon: PieChart },
  { to: '/chat', label: 'AI Chat', icon: MessageSquare },
  { to: '/history', label: 'History', icon: Clock },
]

export function MobileSidebar({ open, onClose }: Props) {
  const { user } = useAuthStore()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      
      <div className="fixed inset-y-0 left-0 w-72 bg-[#2F3F37] flex flex-col">
        <div className="h-16 flex items-center justify-between px-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#E6CFA7] rounded-lg flex items-center justify-center">
              <span className="text-[#2F3F37] font-semibold text-lg">A</span>
            </div>
            <span className="font-semibold text-white text-xl">Aether</span>
          </div>
          <button onClick={onClose} className="text-white/70 p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </div>

        <div className="p-4 border-t border-white/10 text-xs text-white/40">
          {user?.email}
        </div>
      </div>
    </div>
  )
}
