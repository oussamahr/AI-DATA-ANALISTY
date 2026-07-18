import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Database, 
  BarChart3, 
  PieChart, 
  MessageSquare, 
  Clock, 
  Settings, 
  User,
  Shield
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/datasets', label: 'Datasets', icon: Database },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/visualizations', label: 'Visualizations', icon: PieChart },
  { to: '/chat', label: 'AI Chat', icon: MessageSquare },
  { to: '/history', label: 'History', icon: Clock },
]

const secondaryItems = [
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/profile', label: 'Profile', icon: User },
]

export function Sidebar() {
  const { user } = useAuthStore()

  return (
    <div className="sidebar flex flex-col h-full border-r border-white/10">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#E6CFA7] rounded-lg flex items-center justify-center">
            <span className="text-[#2F3F37] font-semibold text-lg tracking-[-0.5px]">A</span>
          </div>
          <div>
            <div className="font-semibold text-white text-lg tracking-[-0.3px]">Aether</div>
            <div className="text-[10px] text-white/40 -mt-1">DATA ANALYTICS</div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2">
          <div className="text-[10px] font-medium tracking-[1px] text-white/40 px-3 mb-2">MAIN</div>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}

        <div className="pt-6 px-3">
          <div className="text-[10px] font-medium tracking-[1px] text-white/40 px-3 mb-2">ACCOUNT</div>
        </div>

        {secondaryItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}

        {user?.is_superuser && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `sidebar-link mt-1 ${isActive ? 'active' : ''}`
            }
          >
            <Shield className="w-4 h-4" />
            <span>Admin</span>
          </NavLink>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="px-3 py-2 text-[11px] text-white/40">
          {user?.email}
        </div>
      </div>
    </div>
  )
}
