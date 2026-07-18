import { useAuthStore } from '@/store/auth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function SettingsPage() {
  const { user } = useAuthStore()

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      <p className="text-[#6B7280] mb-8">Manage your workspace preferences</p>

      <div className="space-y-6">
        <Card>
          <div className="p-6">
            <h3 className="font-semibold mb-4">General</h3>
            <div className="space-y-5">
              <div>
                <label className="text-sm font-medium block mb-1.5">Timezone</label>
                <select className="input w-full">
                  <option>UTC (Coordinated Universal Time)</option>
                  <option>US/Eastern</option>
                  <option>Europe/London</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Default analysis mode</label>
                <select className="input w-full">
                  <option>Descriptive</option>
                  <option>Diagnostic</option>
                  <option>Predictive</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="font-semibold mb-4">Notifications</h3>
            <div className="space-y-3 text-sm">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="accent-[#3A4B41]" /> Email notifications for completed analyses
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="accent-[#3A4B41]" /> Weekly summary reports
              </label>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="font-semibold mb-4">Account</h3>
            <p className="text-sm text-[#6B7280]">Email: {user?.email}</p>
            <div className="mt-4">
              <Button variant="secondary" size="sm">Change password</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
