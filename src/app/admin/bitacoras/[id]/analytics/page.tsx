import { Suspense } from 'react'
import { getDetailedStats } from '@/features/analytics/services/calculate-kpis'
import AnalyticsDashboard from '@/features/analytics/components/AnalyticsDashboard'
import { supabase } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type Props = {
    params: { id: string }
}

async function getBitacora(id: string) {
    const { data } = await supabase.from('bitacoras').select('*').eq('id', id).single()
    return data
}

export default async function AnalyticsPage({ params }: Props) {
  const resolvedParams = await params
  const bitacoraId = resolvedParams.id
  const bitacora = await getBitacora(bitacoraId)
  
  if (!bitacora) notFound()

  // fetch stats by bitacoraId (year logic implied inside service or we pass id)
  // We need to update service to accept ID!
  const stats = await getDetailedStats(bitacora.year, bitacoraId)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 text-slate-500 mb-2">
           <Link href="/admin/bitacoras" className="hover:text-blue-600 flex items-center gap-1 text-sm font-medium">
                <ArrowLeft className="w-4 h-4" /> Volver a Mis Bitácoras
           </Link>
      </div>

      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analítica: {bitacora.name}</h1>
            <p className="text-slate-500">Indicadores de Desempeño ({bitacora.year})</p>
        </div>
      </div>
      
      <Suspense fallback={<div>Cargando analítica...</div>}>
         <AnalyticsDashboard data={stats} />
      </Suspense>
    </div>
  )
}
