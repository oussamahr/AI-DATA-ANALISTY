import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  data: Array<{ name: string; value: number }>
  color?: string
}

export function SimpleBarChart({ data, color = '#3A4B41' }: Props) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EDEBE6" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill={color} radius={3} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
