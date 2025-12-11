import { Suspense } from 'react'
import { getMonthlyPlans } from '@/features/maintenance-plan/actions'
import MonthlyCalendar from '@/features/maintenance-plan/components/MonthlyCalendar'
import ManualTaskForm from '@/features/maintenance-plan/components/ManualTaskForm'
import ImportExcel from '../../../../../features/maintenance-plan/components/ImportExcel'
import { supabase } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

// Props for Dynamic Route
type Props = {
    params: { id: string }
    searchParams: { [key: string]: string | string[] | undefined }
}

async function getBitacora(id: string) {
    const { data } = await supabase.from('bitacoras').select('*').eq('id', id).single()
    return data
}

export default async function PlanningPage({ params, searchParams }: Props) {
    // Next 15+ async params
    const resolvedParams = await params
    const resolvedSearchParams = await searchParams
    
    const bitacoraId = resolvedParams.id
    const bitacora = await getBitacora(bitacoraId)
    
    if (!bitacora) notFound()

    const now = new Date()
    const monthParam = resolvedSearchParams?.month
    const currentMonth = monthParam ? parseInt(monthParam as string) : now.getMonth() // 0-11
    // Filter plans by Bitacora ID
    const plans = await getMonthlyPlans(bitacora.year, currentMonth, bitacoraId)

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
                <Link href="/admin/bitacoras" className="hover:text-blue-600 flex items-center gap-1 text-sm font-medium">
                    <ArrowLeft className="w-4 h-4" /> Volver a Mis Bitácoras
                </Link>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Planificación: {bitacora.name}</h1>
                    <p className="text-slate-500">Gestión de actividades para el año {bitacora.year}</p>
                </div>
                <div className="flex gap-2">
                    <ImportExcel bitacoraId={bitacoraId} year={bitacora.year} />
                    <ManualTaskForm bitacoraId={bitacoraId} year={bitacora.year} dailyHours={bitacora.daily_hours} />
                </div>
            </div>

            <Suspense fallback={<div>Cargando calendario...</div>}>
                <MonthlyCalendar 
                    plans={plans} 
                    currentYear={bitacora.year} 
                    currentMonth={currentMonth}
                    baseUrl={`/admin/bitacoras/${bitacoraId}/planning`} 
                />
            </Suspense>
        </div>
    )
}
