'use client'

import { useState } from 'react'
import { createBitacora } from '../actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Plus } from "lucide-react"

export default function CreateBitacoraDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setLoading(true)
      const formData = new FormData(event.currentTarget)
      
      const res = await createBitacora(null, formData)
      setLoading(false)
      
      if (res && res.success) {
          toast.success("Bitácora creada correctamente")
          setOpen(false)
      } else {
          toast.error(res?.error || "Error al crear bitácora")
      }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Bitácora/Máquina
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Nueva Bitácora</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="name">Nombre de Máquina / Equipo</Label>
                <Input id="name" name="name" required placeholder="Ej: Torno CNC #1" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                 <div className="grid gap-2">
                    <Label htmlFor="year">Año</Label>
                    <Input id="year" name="year" type="number" defaultValue={new Date().getFullYear()} required />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="daily_hours">Horas Operación / Día</Label>
                    <Input id="daily_hours" name="daily_hours" type="number" step="any" defaultValue="4" required />
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="description">Descripción (Opcional)</Label>
                <Textarea id="description" name="description" placeholder="Ubicación, detalles, etc." />
            </div>

            <DialogFooter>
                <Button type="submit" disabled={loading}>Crear Bitácora</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
