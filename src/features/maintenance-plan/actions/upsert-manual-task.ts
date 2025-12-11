'use server'

import { supabase } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const TaskSchema = z.object({
  description: z.string().min(3),
  frequency_type: z.enum(['DIARIA', 'SEMANAL', 'MENSUAL']),
  risk_level: z.enum(['BAJO', 'MEDIO', 'ALTO']),
  date: z.string().min(10), // YYYY-MM-DD
  tr_hours: z.coerce.number().optional().default(0),
  tm_hours: z.coerce.number().optional().default(0),
  operational_days: z.coerce.number().optional().default(0),
  daily_hours: z.coerce.number().optional().default(4)
})

// Helper: Ensure Bitacora
async function ensureBitacora(year: number, dailyHours: number) {
    const { data: existing } = await supabase.from('bitacoras').select('id').eq('year', year).single()
    if (existing) {
        if (dailyHours && dailyHours !== 4) {
             await supabase.from('bitacoras').update({ daily_hours: dailyHours }).eq('id', existing.id)
        }
        return existing.id
    }
    const { data: newVal, error } = await supabase
        .from('bitacoras')
        .insert({ year, daily_hours: dailyHours || 4, description: `Bitácora ${year}` })
        .select('id')
        .single()
    if (error) throw error
    return newVal.id
}

// Helper: Normalize activity
async function upsertActivity(description: string, frequency: string, risk: string, tr: number, tm: number, bitacoraId: string) {
    const { data: existing } = await supabase
        .from('activities')
        .select('id')
        .eq('description', description)
        .eq('bitacora_id', bitacoraId)
        .single()

    if (existing) {
        if (tr > 0 || tm > 0) {
            await supabase.from('activities').update({ tr_hours: tr, tm_hours: tm }).eq('id', existing.id)
        }
        return existing.id
    }

    const { data: newActivity, error } = await supabase
        .from('activities')
        .insert({
            description,
            frequency_type: frequency,
            risk_level: risk,
            tr_hours: tr,
            tm_hours: tm,
            bitacora_id: bitacoraId
        })
        .select('id')
        .single()
    
    if (error) throw new Error(error.message)
    return newActivity.id
}

export async function upsertManualTask(prevState: any, formData: FormData) {
  const data = Object.fromEntries(formData)
  const parsed = TaskSchema.safeParse(data)

  if (!parsed.success) {
    return { error: 'Datos inválidos', issues: parsed.error.issues }
  }

  const { description, frequency_type, risk_level, date, tr_hours, tm_hours, operational_days, daily_hours } = parsed.data
  const bitacoraId = formData.get('bitacoraId') as string
  
  if (!bitacoraId) return { error: "Bitácora no especificada" }

  try {
     // Optional: update daily hours of the bitacora if changed?
     if (daily_hours) {
         await supabase.from('bitacoras').update({ daily_hours }).eq('id', bitacoraId)
     }

    // 1. Upsert Activity
    const activityId = await upsertActivity(description, frequency_type, risk_level, tr_hours, tm_hours, bitacoraId)

    // 2. Recurrence Logic (Full Year)
    const year = parseInt(formData.get('year') as string)
    const startDate = new Date(date)
    
    // Determine End Date (Dec 31st of the target year)
    // NOTE: If the task date is in a future year, this logic might need adjustment. 
    // Assuming context 'year' is the bitacora year.
    const loopEndDate = new Date(year, 11, 31) // Month is 0-indexed: 11 = Dec
    
    const tasksToInsert = []
    let currentDate = new Date(startDate)

    // Safety: prevent infinite loops if frequency logic fails or date is past year
    while (currentDate <= loopEndDate) {
        tasksToInsert.push({
            activity_id: activityId,
            scheduled_date: currentDate.toISOString(),
            status: 'PENDIENTE',
            operational_days: operational_days,
        })

        // Increment Logic
        if (frequency_type === 'SEMANAL') {
            currentDate.setDate(currentDate.getDate() + 7)
        } else if (frequency_type === 'MENSUAL') {
            currentDate.setMonth(currentDate.getMonth() + 1)
        } else if (frequency_type === 'DIARIA') {
            currentDate.setDate(currentDate.getDate() + 1)
        } else {
            // If unknown frequency (shouldn't happen due to schema), 
            // break to avoid infinite loop (treat as single task)
            break 
        }
    }

    // Edge case: If loop didn't run (e.g. start date > end of year), ensure at least one?
    // User requested "Calendar logic", so if date is outside, maybe it shouldn't be added?
    // But ManualTaskForm lets you pick a date. 
    // If user picks date in NEXT year, loopEndDate (current bitacora year) might be smaller.
    // Let's assume user respects the year. If not, we trust the array (might be empty if date > Dec 31).
    // Actually, let's force push at least the start date if the loop doesn't run?
    if (tasksToInsert.length === 0) {
         tasksToInsert.push({
            activity_id: activityId,
            scheduled_date: startDate.toISOString(),
            status: 'PENDIENTE',
            operational_days: operational_days,
        })
    }

    const { error } = await supabase
      .from('maintenance_plans')
      .insert(tasksToInsert)

    if (error) throw error

    revalidatePath(`/admin/bitacoras/${bitacoraId}/planning`)
    return { success: true }
  } catch (error) {
    console.error('Manual Task Error:', error)
    return { error: 'Error al crear tarea' }
  }
}
