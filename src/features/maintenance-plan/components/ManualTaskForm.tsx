'use client'

import { useState } from 'react'
import { upsertManualTask } from '@/features/maintenance-plan/actions/upsert-manual-task'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Plus } from "lucide-react"

type Props = {
    bitacoraId: string
    year: number
    dailyHours: number
}

export default function ManualTaskForm({ bitacoraId, year, dailyHours }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setLoading(true)
      const formData = new FormData(event.currentTarget)
      
      // Inject Context
      formData.append('bitacoraId', bitacoraId)
      formData.append('year', year.toString())
      formData.append('daily_hours', dailyHours.toString()) // Keep existing logic or rely on Bitacora default?
      // Logic says: if user changes it here, it updates global. If not, uses passed prop.
      
      const res = await upsertManualTask(null, formData)
      setLoading(false)
      
      if (res.success) {
          toast.success("Tarea agregada correctamente")
          setOpen(false)
      } else {
          toast.error(res.error || "Error al agregar tarea")
      }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
            <Plus className="mr-2 h-4 w-4" />
            Agregar Tarea Manual
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva Tarea (Mes Actual)</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid gap-2">
                <Label>Descripción</Label>
                <Input name="description" required placeholder="Ej: Revisión Extraordinaria" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>Fecha</Label>
                    <Input name="date" type="date" required />
                </div>
                <div className="grid gap-2">
                    <Label>Riesgo</Label>
                    <Select name="risk_level" required defaultValue="BAJO">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="BAJO">Bajo</SelectItem>
                            <SelectItem value="MEDIO">Medio</SelectItem>
                            <SelectItem value="ALTO">Alto</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>



            <div className="grid gap-2">
                <Label>Frecuencia Original (Referencia)</Label>
                <Select name="frequency_type" required defaultValue="DIARIA">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="DIARIA">Diaria</SelectItem>
                        <SelectItem value="SEMANAL">Semanal</SelectItem>
                        <SelectItem value="MENSUAL">Mensual</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <DialogFooter>
                <Button type="submit" disabled={loading}>Guardar Tarea</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
