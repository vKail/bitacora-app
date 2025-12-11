'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Check, CalendarClock, AlertCircle, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export default function TaskStatusFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentFilter = searchParams.get('filter') || 'all'

  const filters = [
    { id: 'all', label: 'Todas', icon: CalendarDays },
    { id: 'overdue', label: 'Atrasadas', icon: AlertCircle },
    { id: 'today', label: 'Hoy', icon: Check },
    { id: 'upcoming', label: 'Próximas', icon: CalendarClock },
  ]

  const handleFilter = (filterId: string) => {
    const params = new URLSearchParams(searchParams)
    if (filterId === 'all') {
        params.delete('filter')
    } else {
        params.set('filter', filterId)
    }
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
      {filters.map((f) => {
        const isActive = currentFilter === f.id
        const Icon = f.icon
        return (
            <Button
                key={f.id}
                variant={'ghost'}
                size="sm"
                onClick={() => handleFilter(f.id)}
                className={cn(
                    "h-8 px-3 text-xs font-medium transition-all",
                    isActive 
                        ? "bg-white text-slate-900 shadow-sm" 
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                )}
            >
                <Icon className="w-3.5 h-3.5 mr-1.5" />
                {f.label}
            </Button>
        )
      })}
    </div>
  )
}
