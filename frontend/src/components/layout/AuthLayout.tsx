import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-[#F8F6F2]">
      <Outlet />
    </div>
  )
}
