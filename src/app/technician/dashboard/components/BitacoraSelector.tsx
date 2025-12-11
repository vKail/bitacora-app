'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Bitacora = {
  id: string
  name: string
  year: number
}

export default function BitacoraSelector({ bitacoras }: { bitacoras: Bitacora[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentBitacora = searchParams.get('bitacoraId')

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value === 'all') {
        params.delete('bitacoraId')
    } else {
        params.set('bitacoraId', value)
    }
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="w-[300px]">
      <Select value={currentBitacora || 'all'} onValueChange={handleChange}>
        <SelectTrigger>
          <SelectValue placeholder="Seleccionar Bitácora" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las Bitácoras</SelectItem>
          {bitacoras.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name} ({b.year})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
