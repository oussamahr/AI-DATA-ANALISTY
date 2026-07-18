import { ReactNode } from 'react'
import { Card } from '@/components/ui/card'

interface Props {
  title?: string
  children: ReactNode
  className?: string
}

export function ChartWrapper({ title, children, className }: Props) {
  return (
    <Card className={className}>
      {title && <div className="px-6 pt-6 pb-2 font-semibold text-lg tracking-tight">{title}</div>}
      <div className="p-6 pt-2">{children}</div>
    </Card>
  )
}
