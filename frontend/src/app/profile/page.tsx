import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { authApi } from '@/services/api'
import { toast } from 'sonner'

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore()
  const [firstName, setFirstName] = useState(user?.first_name || '')
  const [lastName, setLastName] = useState(user?.last_name || '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updated = await authApi.updateProfile({ first_name: firstName, last_name: lastName })
      updateUser(updated)
      toast.success('Profile updated')
    } catch (e) {
      toast.error('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-semibold tracking-tight mb-8">Profile</h1>

      <Card className="p-8">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm block mb-1.5 font-medium">First name</label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm block mb-1.5 font-medium">Last name</label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-sm block mb-1.5 font-medium">Email address</label>
            <Input value={user?.email} disabled />
          </div>

          <div className="pt-2">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
