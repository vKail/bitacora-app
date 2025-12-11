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
        // Check for duplicates in memory to avoid query complexity or errors if no constraint
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
