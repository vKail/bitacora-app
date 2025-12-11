'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function YearSelector({ currentYear }: { currentYear: number }) {
  const router = useRouter()
  // Generate list of years (e.g., current +/- 2)
  const years = [2023, 2024, 2025, 2026]

  const handleYearChange = (val: string) => {
    router.push(`?year=${val}`)
  }

  return (
    <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-700">Año:</span>
        <Select value={currentYear.toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[100px]">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {years.map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    </div>
  )
}
