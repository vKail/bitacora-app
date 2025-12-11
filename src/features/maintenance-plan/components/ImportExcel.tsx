'use client'

import { useState } from 'react'
import { importExcelPlan } from '../actions/import-plan'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Upload } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Props = {
    bitacoraId: string
    year: number
}

export default function ImportExcel({ bitacoraId, year }: Props) {
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)

    const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        
        // Pass Context
        formData.append('bitacoraId', bitacoraId)
        formData.append('year', year.toString())

        const res = await importExcelPlan(null, formData)
        
        setLoading(false)
        if (res.success) {
            toast.success(`Plan importado: ${res.count} items`)
            setOpen(false)
        } else {
            toast.error(res.error || "Error al importar")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Importar Excel
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Importar Plan ({year})</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUpload} className="space-y-4">
                    <div className="grid gap-2">
                        <Label>Archivo (.xlsx)</Label>
                        <Input name="file" type="file" required accept=".xlsx, .xls, .csv" />
                    </div>
                    <div className="grid gap-2">
                         <Label>Mes de Inicio (para asignar fechas si no hay exactas)</Label>
                         <Select name="month" defaultValue="1">
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {Array.from({length: 12}, (_, i) => (
                                    <SelectItem key={i+1} value={(i+1).toString()}>
                                        {new Date(0, i).toLocaleString('es', { month: 'long' })}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                         </Select>
                    </div>
                    <Button type="submit" disabled={loading} className="w-full">
                        {loading ? 'Procesando...' : 'Subir y Procesar'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
