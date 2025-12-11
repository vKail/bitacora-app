'use client'

import { DetailedReport } from '@/features/analytics/services/calculate-kpis'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Props {
  data: DetailedReport
}

export default function AnalyticsDashboard({ data }: Props) {
  const { rows, totals, averages } = data

  // Helper to handle Month RowSpan logic
  // We need to know which is the first row of each month to set rowSpan
  const monthCounts = rows.reduce((acc, row) => {
    acc[row.month] = (acc[row.month] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const renderedMonths = new Set<string>()

  return (
    <div className="space-y-6">
        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-100 hover:bg-slate-100">
                        <TableHead className="font-bold text-slate-900 border-r w-[120px] text-center">Mes</TableHead>
                        <TableHead className="font-bold text-slate-900 border-r w-[300px]">Actividades</TableHead>
                        <TableHead className="font-bold text-slate-900 border-r text-center w-[100px]">Fechas</TableHead>
                        <TableHead className="font-bold text-slate-900 border-r text-center w-[80px]">DIAS</TableHead>
                        <TableHead className="font-bold text-slate-900 border-r text-center w-[80px]">TO (h)</TableHead>
                        <TableHead className="font-bold text-slate-900 border-r text-center w-[80px]">TP (h)</TableHead>
                        <TableHead className="font-bold text-slate-900 border-r text-center w-[80px]">TR (h)</TableHead>
                        <TableHead className="font-bold text-slate-900 text-center w-[80px]">TM (h)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                                No hay datos registrados para este año.
                            </TableCell>
                        </TableRow>
                    ) : (
                        rows.map((row, index) => {
                            const isFirstOfMonth = !renderedMonths.has(row.month + '-' + index) // Unique check logic needed?
                            // Simpler: iterate and track previous month. But map is stateless.
                            // Better: Check if index > 0 and rows[index-1].month === row.month
                            
                            const isFirst = index === 0 || rows[index - 1].month !== row.month
                            
                            return (
                                <TableRow key={row.id}>
                                    {isFirst ? (
                                        <TableCell 
                                            rowSpan={monthCounts[row.month]} 
                                            className="font-semibold text-center align-middle bg-slate-50 border-r border-b"
                                        >
                                            {row.month}
                                        </TableCell>
                                    ) : null}
                                    <TableCell className="border-r whitespace-normal">{row.activity}</TableCell>
                                    <TableCell className="border-r text-center font-mono text-xs">{row.date}</TableCell>
                                    <TableCell className="border-r text-center bg-slate-50/50">{row.dias}</TableCell>
                                    <TableCell className="border-r text-center">{row.to}</TableCell>
                                    <TableCell className="border-r text-center">{row.tp}</TableCell>
                                    <TableCell className="border-r text-center">{row.tr}</TableCell>
                                    <TableCell className="text-center">{row.tm}</TableCell>
                                </TableRow>
                            )
                        })
                    )}
                </TableBody>
                {rows.length > 0 && (
                    <TableFooter className="bg-slate-100 font-bold border-t-2 border-slate-300">
                        <TableRow>
                            <TableCell colSpan={3} className="text-right border-r px-4">TOTALES</TableCell>
                            <TableCell className="text-center border-r">{totals.dias}</TableCell>
                            <TableCell className="text-center border-r">{totals.to}</TableCell>
                            <TableCell className="text-center border-r">{totals.tp}</TableCell>
                            <TableCell className="text-center border-r">{totals.tr}</TableCell>
                            <TableCell className="text-center">{totals.tm}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell colSpan={3} className="text-right border-r px-4">PROMEDIOS</TableCell>
                            <TableCell className="text-center border-r">-</TableCell>
                            <TableCell className="text-center border-r">{averages.to}</TableCell>
                            <TableCell className="text-center border-r">{averages.tp}</TableCell>
                            <TableCell className="text-center border-r">{averages.tr}</TableCell>
                            <TableCell className="text-center">{averages.tm}</TableCell>
                        </TableRow>
                    </TableFooter>
                )}
            </Table>
        </div>
    </div>
  )
}
