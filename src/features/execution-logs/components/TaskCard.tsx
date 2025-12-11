'use client'

import { useState } from 'react'
import { logExecution } from '../actions'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea" 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

type Plan = {
  id: number;
  scheduledDate: Date;
  status: string;
  activity: {
    id: number;
    description: string;
    standardCode: string | null;
    bitacoraName?: string;
    risk?: string;
    frequency?: string;
  };
  execution?: {
      completedBy: string;
      tr: number;
      tm: number;
      observations?: string;
  }
}

// Helper to check if activity requires calibration formulas
const isCalibration = (code: string | null) => {
    return code === 'A003' || code === 'A004'; 
}

export default function TaskCard({ plan }: { plan: Plan }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Form State
  const [observations, setObservations] = useState('')
  
  // Calibration Fields
  const [dataReal, setDataReal] = useState('')
  const [dataDisplay, setDataDisplay] = useState('')

  // New Fields
  const [status, setStatus] = useState('COMPLETADO') // Default to performed
  const [trHours, setTrHours] = useState('')
  const [tmHours, setTmHours] = useState('')

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // ... formData buildup ...
    const formData = new FormData()
    formData.append('planId', plan.id.toString())
    formData.append('observations', observations)
    formData.append('status', status)
    if (trHours) formData.append('tr_hours', trHours)
    if (tmHours) formData.append('tm_hours', tmHours)
    
    if (isCalibration(plan.activity.standardCode)) {
        formData.append('data_real', dataReal)
        formData.append('data_display', dataDisplay)
    }

    const res = await logExecution(null, formData)
    
    setLoading(false)
    if (res.success) {
        setIsOpen(false)
        setObservations('')
        setDataReal('')
        setDataDisplay('')
        toast.success("Ejecución registrada correctamente")
    } else {
        toast.error("Error al registrar: " + res.error)
    }
  }

  const needsCalibration = isCalibration(plan.activity.standardCode)

  if (plan.status === 'COMPLETADO') {
    return (
        <Card className="bg-green-50 border-green-200">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div className="space-y-1 w-full">
                        <div className="flex items-center gap-2">
                             <CardTitle className="text-base text-green-900 font-semibold">{plan.activity.description}</CardTitle>
                             <span className="text-[10px] bg-green-200 text-green-800 px-1.5 py-0.5 rounded font-bold">COMPLETADO</span>
                        </div>
                        <CardDescription className="text-green-800">
                            {plan.activity.bitacoraName && <span className="block font-medium mb-1">{plan.activity.bitacoraName}</span>}
                            
                            {/* Metadata Badges */}
                            <div className="flex flex-wrap gap-2 text-xs mb-2 opacity-90">
                                {plan.activity.standardCode && (
                                    <span className="bg-green-100 px-1.5 py-0.5 rounded border border-green-200">
                                        Norma: {plan.activity.standardCode}
                                    </span>
                                )}
                                <span className="bg-green-100 px-1.5 py-0.5 rounded border border-green-200">
                                    {plan.activity.frequency}
                                </span>
                                {plan.activity.risk === 'ALTO' && (
                                    <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded border border-red-200 font-medium">
                                        Riesgo Alto
                                    </span>
                                )}
                            </div>



                            <span className="block text-xs text-green-700/80 mb-2">
                                {new Date(plan.scheduledDate).toLocaleDateString('es-ES', { timeZone: 'UTC', dateStyle: 'long' })}
                            </span>

                            {/* Execution Details */}
                            {plan.execution && (
                                <div className="mt-2 pt-2 border-t border-green-200 space-y-1 text-sm bg-green-100/50 p-2 rounded">
                                    <div className="flex justify-between">
                                        <span className="text-green-800/70">Realizado por:</span>
                                        <span className="font-medium text-green-900">{plan.execution.completedBy}</span>
                                    </div>
                                    <div className="flex gap-4 text-xs font-mono text-green-800">
                                        <span>TR: {plan.execution.tr.toFixed(1)}h</span>
                                        <span>TM: {plan.execution.tm.toFixed(1)}h</span>
                                    </div>
                                    {plan.execution.observations && (
                                        <div className="mt-1 text-xs text-green-800 italic">
                                            "{plan.execution.observations}"
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
        </Card>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                             <CardTitle className="text-base font-semibold">{plan.activity.description}</CardTitle>
                             {(() => {
                                 const today = new Date()
                                 today.setHours(0,0,0,0)
                                 const planDate = new Date(plan.scheduledDate)
                                 const planDateOnly = new Date(planDate.getUTCFullYear(), planDate.getUTCMonth(), planDate.getUTCDate()) // Use UTC date logic match
                                 
                                 // Compare
                                 // Note: plan.scheduledDate comes as string ISO from server often in JSON props, need safe parse
                                 // We rely on string comparison yyyy-mm-dd from before? 
                                 // Let's use simple timestamps for less code, assuming planDate is parsed correctly (it is ISO string usually).
                                 // Actually safe way:
                                 const planStr = plan.scheduledDate.toString().split('T')[0]
                                 const todayStr = today.toISOString().split('T')[0]
                                 
                                 if (planStr < todayStr) return <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">ATRASADA</span>
                                 if (planStr === todayStr) return <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">HOY</span>
                                 return <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">PRÓXIMA</span>
                             })()}
                        </div>
                        <CardDescription>
                            {plan.activity.bitacoraName && (
                                <span className="block font-medium text-slate-700 mb-1">{plan.activity.bitacoraName}</span>
                            )}
                            
                            {/* Metadata Badges */}
                            <div className="flex flex-wrap gap-2 text-xs mb-2">
                                {plan.activity.standardCode && (
                                    <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                                        Norma: {plan.activity.standardCode}
                                    </span>
                                )}
                                <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                                    {plan.activity.frequency}
                                </span>
                                {plan.activity.risk === 'ALTO' && (
                                    <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100 font-medium">
                                        Riesgo Alto
                                    </span>
                                )}
                            </div>

                            <span className="block text-xs text-slate-500">
                                {new Date(plan.scheduledDate).toLocaleDateString('es-ES', { timeZone: 'UTC', dateStyle: 'long' })}
                            </span>

                            {/* Execution Details (Only if Completed) */}
                            {plan.execution && (
                                <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Realizado por:</span>
                                        <span className="font-medium text-slate-800">{plan.execution.completedBy}</span>
                                    </div>
                                    <div className="flex gap-4 text-xs">
                                        <span className="font-mono text-slate-600">TR: {plan.execution.tr.toFixed(1)}h</span>
                                        <span className="font-mono text-slate-600">TM: {plan.execution.tm.toFixed(1)}h</span>
                                    </div>
                                </div>
                            )}
                        </CardDescription>
                    </div>
                    <DialogTrigger asChild>
                        <Button size="sm">Registrar</Button>
                    </DialogTrigger>
                </div>
            </CardHeader>
        </Card>

        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Registrar Ejecución</DialogTitle>
                <DialogDescription>
                    {plan.activity.description}
                </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleComplete} className="space-y-4 py-4">

                <div className="grid gap-2">
                    <Label htmlFor="observations">Observaciones</Label>
                    <Input 
                        id="observations" 
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        placeholder="Detalles adicionales..."
                    />
                </div>

                <div className="grid gap-4 py-2 border-t border-b border-slate-100">
                    <Label className="text-base font-semibold">Estado de Ejecución</Label>
                    <RadioGroup defaultValue="COMPLETADO" value={status} onValueChange={setStatus} className="flex flex-row gap-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="COMPLETADO" id="r-completed" />
                            <Label htmlFor="r-completed">Realizado</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="NO_REALIZADO" id="r-not-completed" />
                            <Label htmlFor="r-not-completed">No Realizado</Label>
                        </div>
                    </RadioGroup>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label>TR (Horas)</Label>
                        <Input 
                            value={trHours} 
                            onChange={e => setTrHours(e.target.value)} 
                            type="number" step="any" min="0" 
                            placeholder="Ej: 0.5" 
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>TM (Horas)</Label>
                        <Input 
                            value={tmHours} 
                            onChange={e => setTmHours(e.target.value)} 
                            type="number" step="any" min="0" 
                            placeholder="Ej: 0.25" 
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Guardando...' : 'Confirmar'}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
  )
}
