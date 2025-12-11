import Link from 'next/link'
import { supabase } from '@/lib/db'
import { startOfDay, endOfDay } from 'date-fns'
import TaskCard from '@/features/execution-logs/components/TaskCard'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import BitacoraSelector from './components/BitacoraSelector'
import TaskStatusFilter from './components/TaskStatusFilter'

export const dynamic = 'force-dynamic'

export default async function TechnicianDashboard({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  // Await searchParams for Next.js 15 compatibility
  const params = await searchParams
  const bitacoraIdParam = params?.bitacoraId as string | undefined
  const filterParam = params?.filter as string | undefined

  console.log('Dashboard Filter:', { filterParam, bitacoraIdParam })

  // 1. Fetch Active Bitacoras for Selector
  const { data: bitacoras } = await supabase
    .from('bitacoras')
    .select('id, name, year')
    .order('year', { ascending: false })
    .order('name', { ascending: true })

  // Reliable Local Date Construction
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const todayStr = `${yyyy}-${mm}-${dd}`
  
  console.log('Server Today:', todayStr)
  
  // 2. Fetch Users for Mapping
  const { data: users } = await supabase.from('users').select('id, role')
  const userMap = new Map(users?.map(u => [u.id, u.role || 'TECNICO']) || [])

  // View Range (Past -> +7 days)
  const endOfView = endOfDay(new Date())
  endOfView.setDate(endOfView.getDate() + 7) 
  const endIso = endOfView.toISOString()

  let query = supabase
    .from('maintenance_plans')
    .select(`
        id,
        scheduled_date,
        status,
        activity:activities!inner (
            id,
            description,
            standard_code,
            risk_level,
            frequency_type,
            bitacora_id
        ),
        logs:execution_logs (
            id,
            execution_time_minutes,
            tm_minutes,
            executed_by,
            is_completed,
            observations
        )
    `)
    .lte('scheduled_date', endIso)
    .order('scheduled_date', { ascending: true })

  if (bitacoraIdParam) {
    query = query.eq('activity.bitacora_id', bitacoraIdParam)
  }

  const { data: plans, error } = await query

  if (error) {
      console.error(error)
      return <div>Error loading tasks</div>
  }

  const bitacoraMap = new Map(bitacoras?.map(b => [b.id, b.name]))

  const formattedPlans = plans.map((p: any) => {
      const log = p.logs?.[0] // Assuming 1 log per plan per execution cycle generally
      
      return {
          id: p.id,
          scheduledDate: p.scheduled_date,
          status: p.status,
          activity: {
              id: p.activity?.id,
              description: p.activity?.description,
              standardCode: p.activity?.standard_code,
              risk: p.activity?.risk_level,
              frequency: p.activity?.frequency_type,
              bitacoraName: p.activity?.bitacora_id ? bitacoraMap.get(p.activity.bitacora_id) : undefined
          },
          execution: log ? {
              completedBy: userMap.get(log.executed_by) || 'Desconocido',
              tr: (log.execution_time_minutes || 0) / 60,
              tm: (() => {
                  if (log.tm_minutes && log.tm_minutes > 0) return log.tm_minutes / 60
                  // Fallback for legacy JSON data
                  const match = log.observations?.match(/"tm_hours":\s*([\d.]+)/)
                  return match ? parseFloat(match[1]) : 0
              })(),
              observations: log.observations?.replace(/\[DATA:.*?\]/, '').trim()
          } : undefined
      }
  })

  const sortedPlans = formattedPlans.sort((a: any, b: any) => {
      // Urgent sorts first
      if (a.status === 'PENDIENTE' && b.status === 'COMPLETADO') return -1
      if (a.status === 'COMPLETADO' && b.status === 'PENDIENTE') return 1
      return 0
  })

  // Apply Status Filter
  const filteredPlans = sortedPlans.filter((plan: any) => {
      if (!filterParam || filterParam === 'all') return true
      
      const planDateStr = plan.scheduledDate.toString().split('T')[0]
      
      if (filterParam === 'overdue') return planDateStr < todayStr && plan.status === 'PENDIENTE'
      if (filterParam === 'today') return planDateStr === todayStr
      if (filterParam === 'upcoming') return planDateStr > todayStr
      
      return true
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Tablero Técnico</h1>
            <p className="text-slate-500">{today.toLocaleDateString()}</p>
        </div>
        
        <div className="flex items-center gap-4">
           {bitacoras && <BitacoraSelector bitacoras={bitacoras} />}
           <div className="text-sm text-slate-600 hidden md:block">
              {user.role}
           </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-800">Tareas</h2>
        <TaskStatusFilter />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPlans.length === 0 ? (
            <p className="text-slate-500 col-span-full text-center py-10">
                No se encontraron tareas con este filtro.
            </p>
        ) : (
            filteredPlans.map((plan: any) => (
                <TaskCard key={plan.id} plan={plan} />
            ))
        )}
      </div>
    </div>
  )
}
