import { Link, useNavigate } from 'react-router-dom'
import { Menu, Bell, User, LogOut, Settings } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface TopNavProps {
  onMenuClick: () => void
}

export function TopNav({ onMenuClick }: TopNavProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const initials = (user?.first_name?.[0] || '') + (user?.last_name?.[0] || user?.email?.[0] || 'U')

  return (
    <nav className="navbar h-16 sticky top-0 z-40 px-4 lg:px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden btn btn-ghost p-2 -ml-2"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb / Page title placeholder */}
        <div className="hidden sm:block text-sm text-[#6B7280]">
          AI Data Platform
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="hidden md:flex w-72">
          <input
            type="text"
            placeholder="Search datasets, analyses..."
            className="input h-9 text-sm bg-[#F8F6F2] border-[#D9D9D9]"
          />
        </div>

        {/* Notifications */}
        <button className="btn btn-ghost p-2 relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#C69B4A] rounded-full" />
        </button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-[#F8F6F2] transition-colors">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-[#3A4B41] text-white text-xs font-medium">
                  {initials.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-medium text-[#1F2937]">
                  {user?.first_name || user?.email?.split('@')[0]}
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>{user?.email}</div>
              <div className="text-xs font-normal text-[#6B7280]">
                {user?.is_superuser ? 'Administrator' : 'Analyst'}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-[#C65B5B] cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
