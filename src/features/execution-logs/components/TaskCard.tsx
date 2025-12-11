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

type Plan = {
  id: number;
  scheduledDate: Date;
  status: string;
  activity: {
    id: number;
    description: string;
    standardCode: string | null;
    bitacoraName?: string;
  };
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

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // ... formData buildup ...
    const formData = new FormData()
    formData.append('planId', plan.id.toString())
    formData.append('observations', observations)
    
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
                <CardTitle className="text-base text-green-900">{plan.activity.description}</CardTitle>
                <CardDescription className="text-green-700">Completado</CardDescription>
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
                            {plan.activity.bitacoraName && <span className="block font-medium text-slate-700 mb-1">{plan.activity.bitacoraName}</span>}
                            {plan.activity.standardCode ? `Código: ${plan.activity.standardCode}` : 'Mantenimiento General'}
                            <span className="block text-xs mt-1">
                                {new Date(plan.scheduledDate).toLocaleDateString('es-ES', { timeZone: 'UTC', dateStyle: 'long' })}
                            </span>
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
