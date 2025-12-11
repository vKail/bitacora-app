'use client'

import { useState } from 'react'
import { generateMonthlyPlan } from '../actions/generate-plan'
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export default function GeneratePlanButton() {
  const [loading, setLoading] = useState(false)
  const [year, setYear] = useState("2025")
  const [month, setMonth] = useState("12") // Default Dec

  const handleGenerate = async () => {
    setLoading(true)
    const res = await generateMonthlyPlan(parseInt(year), parseInt(month))
    setLoading(false)
    
    if (res.success) {
        toast.success(`Bitácora generada: ${res.count} tareas creadas.`)
    } else {
        toast.error(res.error || "Error al generar bitácora")
    }
  }

  return (
    <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
        <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
        </Select>

        <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="1">Enero</SelectItem>
                <SelectItem value="2">Febrero</SelectItem>
                <SelectItem value="3">Marzo</SelectItem>
                <SelectItem value="4">Abril</SelectItem>
                <SelectItem value="5">Mayo</SelectItem>
                <SelectItem value="6">Junio</SelectItem>
                <SelectItem value="7">Julio</SelectItem>
                <SelectItem value="8">Agosto</SelectItem>
                <SelectItem value="9">Septiembre</SelectItem>
                <SelectItem value="10">Octubre</SelectItem>
                <SelectItem value="11">Noviembre</SelectItem>
                <SelectItem value="12">Diciembre</SelectItem>
            </SelectContent>
        </Select>

        <Button onClick={handleGenerate} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generar Bitácora
        </Button>
    </div>
  )
}
