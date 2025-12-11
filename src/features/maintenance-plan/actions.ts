'use server'

import { supabase } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getDaysInMonth, addDays, getDay, endOfMonth, eachDayOfInterval } from 'date-fns'

export async function generateMonthlyPlan(year: number, month: number) {
  try {
    const { data: activities } = await supabase.from('activities').select('*')
    if (!activities) return { error: 'No se encontraron actividades' }

    const startDate = new Date(year, month - 1, 1) // Month is 0-indexed in JS Date
    const endDate = endOfMonth(startDate)
    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate })

    // Helper: is working day (Mon=1 ... Fri=5)
    // getDay returns 0 for Sun, 6 for Sat
    const isWorkingDay = (date: Date) => {
        const day = getDay(date)
        return day !== 0 && day !== 6
    }

    const plansToCreate: any[] = []

    for (const activity of activities) {
      if (activity.frequency_type === 'DIARIA') {
        // Schedule Mon-Fri
        for (const day of daysInMonth) {
            if (isWorkingDay(day)) {
                plansToCreate.push({
                    activity_id: activity.id,
                    scheduled_date: day.toISOString(),
                    status: 'PENDIENTE',
                })
            }
        }
      } else if (activity.frequency_type === 'SEMANAL') {
        // Schedule Mondays
        for (const day of daysInMonth) {
            if (getDay(day) === 1) { // Monday
                plansToCreate.push({
                    activity_id: activity.id,
                    scheduled_date: day.toISOString(),
                    status: 'PENDIENTE',
                })
            }
        }
      } else if (activity.frequency_type === 'MENSUAL') {
        // Schedule First Working Day
        const firstWorkingDay = daysInMonth.find(day => isWorkingDay(day))
        if (firstWorkingDay) {
            plansToCreate.push({
                activity_id: activity.id,
                scheduled_date: firstWorkingDay.toISOString(),
                status: 'PENDIENTE',
            })
        }
      }
    }

    if (plansToCreate.length > 0) {
        // Use upsert to avoid duplicates if unique constraint exists, implies checking first
        // User asked: "evitando duplicados si ya existen para ese día"
        // Simplest way without complex query: Select existing for this month and filter?
        // Or pure insert and ignore error? Supabase `upsert` with ignoreDuplicates?
        // Let's use ignoreDuplicates if we had a unique constraint (plan_id, date). 
        // We don't strictly have one shown in schema.prisma before.
        // Logic check: "evitando duplicados". 
        // Better implementation: First delete existing PENDING plans for this month/year to regenerate? 
        // Or check existence. Checking 1000 items is slow.
        // Let's assume unique index on (activity_id, scheduled_date) exists or we use `upsert`.
        // Given complexity, let's just insert. If request asked for robust check:
        // "prisma.maintenancePlans.createMany avoiding duplicates". 
        // In Supabase: .upsert(plans, { onConflict: 'activity_id, scheduled_date', ignoreDuplicates: true })
        // requires the constraint to exist.
        // I will use `select` to fetch existing IDs for this month to filter in memory for safety.
        
        const { data: existing } = await supabase
            .from('maintenance_plans')
            .select('activity_id, scheduled_date')
            .gte('scheduled_date', startDate.toISOString())
            .lte('scheduled_date', endDate.toISOString())

        const existingSet = new Set(existing?.map(e => `${e.activity_id}-${new Date(e.scheduled_date).toISOString().split('T')[0]}`))

        const finalPlans = plansToCreate.filter(p => !existingSet.has(`${p.activity_id}-${p.scheduled_date.split('T')[0]}`))
        
        if (finalPlans.length > 0) {
            const { error } = await supabase.from('maintenance_plans').insert(finalPlans)
            if (error) throw error
        }
    }

    revalidatePath('/admin/planning')
    return { success: true, count: plansToCreate.length }
  } catch (error) {
    console.error('Error generating plan:', error)
    return { error: 'Error al generar la planificación' }
  }
}

export async function getMonthlyPlans(year: number, month: number, bitacoraId?: string) {
    // Assuming 'month' is 0-indexed (0 for Jan, 11 for Dec), consistent with JS Date
    const startOfMonth = new Date(year, month, 1)
    const endOfMonth = new Date(year, month + 1, 0) // Last day of the month
    endOfMonth.setHours(23, 59, 59, 999)

    let query = supabase
        .from('maintenance_plans')
        .select(`
            id,
            scheduled_date,
            status,
            activity:activities!inner (
                id,
                description,
                risk_level,
                standard_code,
                bitacora_id,
                frequency_type
            )
        `)
        .gte('scheduled_date', startOfMonth.toISOString())
        .lte('scheduled_date', endOfMonth.toISOString())
        .order('scheduled_date', { ascending: true })

    // If bitacoraId provided, filter strictly
    if (bitacoraId) {
        query = query.eq('activity.bitacora_id', bitacoraId)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching monthly plans:', error)
        return []
    }

    return (data || []).map((p: any) => ({
        id: p.id,
        scheduledDate: p.scheduled_date,
        status: p.status,
        activity: {
            description: p.activity?.description || 'N/A',
            frequency: p.activity?.frequency_type, 
            risk: p.activity?.risk_level,
            standard: p.activity?.standard_code
        }
    }))
}
