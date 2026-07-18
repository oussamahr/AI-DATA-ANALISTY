import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/services/api'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default function AdminPage() {
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: adminApi.getStats })
  const { data: users } = useQuery({ queryKey: ['admin-users'], queryFn: adminApi.getUsers })

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Users', value: stats?.total_users ?? '—' },
          { label: 'Datasets', value: stats?.total_datasets ?? '—' },
          { label: 'Analyses', value: stats?.total_analyses ?? '—' },
          { label: 'Active Users', value: stats?.active_users ?? '—' },
        ].map((s, i) => (
          <Card key={i} className="p-5">
            <div className="text-sm text-[#6B7280]">{s.label}</div>
            <div className="mt-1 text-3xl font-semibold tracking-tight">{s.value}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="p-6 border-b">
          <h3 className="font-semibold">Platform Users</h3>
        </div>
        <div className="p-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell>{u.first_name} {u.last_name}</TableCell>
                  <TableCell>
                    <Badge variant={u.is_verified ? 'success' : 'warning'}>
                      {u.is_verified ? 'Verified' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.is_superuser ? 'Admin' : 'Analyst'}
                  </TableCell>
                </TableRow>
              )) || (
                <TableRow><TableCell colSpan={4} className="text-center text-[#6B7280]">No users found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
