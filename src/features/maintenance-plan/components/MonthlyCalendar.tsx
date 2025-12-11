'use client'

import { useState } from 'react'
import GeneratePlanButton from './GeneratePlanButton'
import { format, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Info, AlertTriangle, FileText, Activity } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Type definition from params
type Plan = {
  id: number;
  scheduledDate: Date;
  status: string;
  activity: {
    description: string;
    frequency?: string;
    risk?: string;
    standard?: string;
  };
}

interface MonthlyCalendarProps {
  currentYear: number;
  currentMonth: number; // 0-11
  plans: Plan[];
  baseUrl: string;
}

export default function MonthlyCalendar({ currentYear, currentMonth, plans, baseUrl }: MonthlyCalendarProps) {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  
  const startDate = new Date(currentYear, currentMonth, 1) // Month is 0-indexed in Date constructor? No wait, user passed me 1-12 before?
  // Let's stick to 0-11 for consistency with JS Date, ensuring Page passes 0-11.
  // Planning Page: const currentMonth = monthParam ? parseInt(monthParam) : now.getMonth() (which is 0-11)
  
  const endDate = endOfMonth(startDate)
  const days = eachDayOfInterval({ start: startDate, end: endDate })

  const handlePrevMonth = () => {
    let newMonth = currentMonth - 1
    let newYear = currentYear
    if (newMonth < 0) {
        newMonth = 11
        newYear -= 1
    }
    router.push(`${baseUrl}?month=${newMonth}`) // Using 0-11 for URL param? Or 1-12?
    // Good practice: URL uses 1-12, internal JS uses 0-11.
    // Let's fix this convention.
    // URL: month=1 (Jan). JS: month=0.
    // If I push month=0, URL will look like month=0. Page reads it.
    // Let's standardise on 0-11 internal, but maybe display 1-12 in URL? 
    // To minimize breakage, let's just pass the raw value to URL and let Page handle it.
    // Actually, Page logic: `parseInt(monthParam)`.
    // So if URL is month=0, Page sees 0. 
    // This is fine.
  }

  const handleNextMonth = () => {
    let newMonth = currentMonth + 1
    let newYear = currentYear
    if (newMonth > 11) {
        newMonth = 0
        newYear += 1
    }
    router.push(`${baseUrl}?month=${newMonth}`)
  }

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'COMPLETADO': return 'bg-green-100 text-green-700 border-green-200'
          case 'PENDIENTE': return 'bg-amber-100 text-amber-700 border-amber-200'
          default: return 'bg-slate-100 text-slate-700 border-slate-200'
      }
  }

    const getRiskBadge = (risk?: string) => {
        const r = risk || 'BAJO'
        const colors = {
            'BAJO': 'bg-green-100 text-green-800',
            'MEDIO': 'bg-yellow-100 text-yellow-800',
            'ALTO': 'bg-red-100 text-red-800'
        }
        return <span className={`text-xs font-semibold px-2 py-0.5 rounded ${colors[r as keyof typeof colors] || colors['BAJO']}`}>{r}</span>
    }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-xl font-bold capitalize">
                {format(startDate, 'MMMM yyyy', { locale: es })}
            </h2>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="w-4 h-4" />
            </Button>
        </div>
        {/* Toolbar handles generation now, removing old button if present or keeping logical fallback */}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} className="p-2 font-bold text-center bg-muted text-muted-foreground text-sm">
                {day}
            </div>
        ))}
        
        {Array.from({ length: startDate.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="p-2 bg-muted/10 min-h-[100px]" />
        ))}

        {days.map(day => {
            // Robust comparison: Match YYYY-MM-DD strings to avoid Timezone shifts
            const dayStr = format(day, 'yyyy-MM-dd')
            const dayPlans = plans.filter(p => {
                const planDateStr = p.scheduledDate.toString().split('T')[0]
                return planDateStr === dayStr
            })
            return (
                <div key={day.toISOString()} className="border min-h-[100px] p-2 bg-card rounded-md shadow-sm transition-colors hover:bg-slate-50">
                    <div className="text-right text-sm font-semibold text-muted-foreground mb-1">
                        {format(day, 'd')}
                    </div>
                    <div className="flex flex-col gap-1">
                        {dayPlans.map(plan => (
                            <button 
                                key={plan.id} 
                                type="button"
                                onClick={() => {
                                    console.log('Clicking plan:', plan)
                                    setSelectedPlan(plan)
                                }}
                                className={`text-left text-xs p-1.5 rounded border transition-opacity hover:opacity-80 truncate w-full ${getStatusColor(plan.status)}`}
                                title={plan.activity.description}
                            >
                                {plan.activity.description}
                            </button>
                        ))}
                    </div>
                </div>
            )
        })}
      </div>

      <Dialog open={selectedPlan !== null} onOpenChange={(open) => {
        if (!open) setSelectedPlan(null)
      }}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle className="text-xl pr-8">Detalles de Actividad</DialogTitle>
                <DialogDescription>Información del mantenimiento programado</DialogDescription>
            </DialogHeader>
            
            {selectedPlan && (
                <div className="grid gap-4 py-4">
                    <div className="space-y-1">
                        <h4 className="text-sm font-medium text-muted-foreground">Actividad</h4>
                        <p className="text-base font-semibold text-slate-900">{selectedPlan.activity.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Activity className="w-4 h-4" /> Riesgo
                            </h4>
                            <div>{getRiskBadge(selectedPlan.activity.risk)}</div>
                        </div>
                        <div className="space-y-1">
                            <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <AlertTriangle className="w-4 h-4" /> Estado
                            </h4>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded uppercase ${selectedPlan.status === 'COMPLETADO' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                {selectedPlan.status}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                             <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <FileText className="w-4 h-4" /> Norma
                            </h4>
                            <p className="text-sm">{selectedPlan.activity.standard || 'N/A'}</p>
                        </div>
                         <div className="space-y-1">
                             <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Info className="w-4 h-4" /> Frecuencia
                            </h4>
                            <p className="text-sm">{selectedPlan.activity.frequency || 'N/A'}</p>
                        </div>
                    </div>
                    
                    <div className="pt-2 text-xs text-muted-foreground">
                        Fecha Programada: {(() => {
                            // Extract YYYY-MM-DD to avoid timezone shifts
                            const [y, m, d] = selectedPlan.scheduledDate.toString().split('T')[0].split('-').map(Number)
                            // Create UTC date for formatting or just format string
                            const utcDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
                            return format(utcDate, 'PPP', { locale: es })
                        })()}
                    </div>
                </div>
            )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
