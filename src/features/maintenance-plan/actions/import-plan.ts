'use server'

import { supabase } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getDay, endOfMonth, eachDayOfInterval, parseISO, isValid, parse } from 'date-fns'
import * as XLSX from 'xlsx'

// Helper: Ensure Bitacora Exists (Atomic-ish)
async function ensureBitacora(year: number, dailyHours: number = 4) {
    // Check exist
    const { data: existing } = await supabase.from('bitacoras').select('id').eq('year', year).single()
    if (existing) return existing.id

    // Create
    const { data: newVal, error } = await supabase
        .from('bitacoras')
        .insert({ year, daily_hours: dailyHours, description: `Bitácora ${year}` })
        .select('id')
        .single()
    
    if (error) throw new Error(`Error creando bitácora: ${error.message}`)
    return newVal.id
}

// Helper: Normalize activity (Upsert) - Scoped to Bitacora?
// NOTE: If activities are unique to a bitacora, we must include bitacora_id in the search.
// Helper: Normalize activity (Upsert)
async function upsertActivity(description: string, frequency: string, risk: string, bitacoraId: string, standard?: string) {
    const { data: existing } = await supabase
        .from('activities')
        .select('id')
        .eq('description', description)
        .eq('bitacora_id', bitacoraId)
        .single()

    if (existing) {
        return existing.id
    }

    const { data: newActivity, error } = await supabase
        .from('activities')
        .insert({
            description,
            frequency_type: frequency,
            risk_level: risk,
            standard_code: standard || null,
            bitacora_id: bitacoraId
        })
        .select('id')
        .single()
    
    if (error) throw new Error(`Error creating activity: ${error.message}`)
    return newActivity.id
}

// Helper: Is Working Day (Mon-Fri)
const isWorkingDay = (date: Date) => {
    const day = getDay(date)
    return day !== 0 && day !== 6
}

export async function importExcelPlan(prevState: any, formData: FormData) {
    try {
        const file = formData.get('file') as File
        const targetYear = parseInt(formData.get('year') as string)
        const targetMonth = parseInt(formData.get('month') as string) // 1-12

        if (!file) return { error: 'No archiv uploaded' }
        
        // 1. Get Bitacora Context (Strict)
        const bitacoraId = formData.get('bitacoraId') as string
        if (!bitacoraId) return { error: 'Falta contexto de bitácora' }

        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const rows: any[] = XLSX.utils.sheet_to_json(sheet)

        console.log('Rows parsed from Excel/CSV:', rows.length)
        if (rows.length > 0) console.log('First row sample:', rows[0])

        let count = 0
        let skipped = 0

        for (const row of rows) {
            // Columns expected: Actividad, Frecuencia, Norma, Riesgo, Fecha, TR, TM, Dias
            const description = row['Actividad']
            const frequency = row['Frecuencia']?.toUpperCase() || 'DIARIA'
            // ... (rest of valriables)

            // DEBUG
            // console.log('Processing:', { description, frequency, dateRaw: row['Fecha'] })
            const standard = row['Norma']
            const risk = row['Riesgo']?.toUpperCase() || 'BAJO'
            const dateRaw = row['Fecha']
            
            // New Fields
            // New Fields
            const tr = row['TR'] ? parseFloat(row['TR']) : 0
            const tm = row['TM'] ? parseFloat(row['TM']) : 0
            const dias = row['Dias'] ? parseInt(row['Dias']) : 0 // Días Operativos
            // Read daily hours (Bitacora property now)
            // If provided updates the global bitacora setting?
            // For now, let's just make sure we capture it for the creation.
            const dailyHours = row['Horas'] ? parseFloat(row['Horas']) : undefined
            if (dailyHours) {
                // Update Bitacora config on the fly?
                await supabase.from('bitacoras').update({ daily_hours: dailyHours }).eq('id', bitacoraId)
            }

            if (!description) continue

            // 1. Upsert Activity (Scoped to Bitacora)
            const activityId = await upsertActivity(description, frequency, risk, bitacoraId, standard)

            // 2. Determine Dates (Recurrence to Full Year)
            const datesToCreate: string[] = []
            
            // Logic: Start from specific date (or 1st of month if generic) and fill until End Of Year
            // Standardizing Start Date
            let startDate: Date

            if (typeof dateRaw === 'number') {
                startDate = new Date(Math.round((dateRaw - 25569)*86400*1000) + 43200000)
            } else if (typeof dateRaw === 'string') {
                 // Try parsing
                 try {
                    const cleanDate = dateRaw.trim()
                     if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
                        const [y, m, d] = cleanDate.split('-').map(Number)
                        startDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
                     } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleanDate)) {
                        const [d, m, y] = cleanDate.split('/').map(Number)
                        startDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
                     } else {
                        startDate = new Date(cleanDate)
                     }
                 } catch (e) {
                    startDate = new Date() // Fallback? Or fail?
                 }
            } else {
                // If no date, assume 1st of month/year? 
                // Context provides Year/Month. Let's use that.
                startDate = new Date(targetYear, targetMonth - 1, 1, 12, 0, 0)
            }

            if (!isValid(startDate)) {
                // Fallback if parsing failed
                 startDate = new Date(targetYear, targetMonth - 1, 1, 12, 0, 0)
            }

            // End of Year Limit
            // If the excel specifies a year, maybe we should respect it? 
            // But usually this import is for a specifc Bitacora (Year).
            // Let's force the limit to be Dec 31st of the TARGET YEAR (from form/bitacora).
            const limitDate = new Date(targetYear, 11, 31, 23, 59, 59)

            let iterDate = new Date(startDate)
            
            // Safety: Ensure we don't start before the target year? 
            // Or if user imports 2024 plan into 2025 bitacora, what happens?
            // Let's assume user knows what they are doing.
            
            // Recurrence Loop
            while (iterDate <= limitDate) {
                 // Push current
                 datesToCreate.push(iterDate.toISOString())

                 // Increment
                 if (frequency === 'DIARIA') {
                     iterDate.setDate(iterDate.getDate() + 1)
                     // Skip weekends if implied? User didn't ask, but implied "Business days"?
                     // "todo el año diariamente" -> literal daily.
                 } else if (frequency === 'SEMANAL') {
                     iterDate.setDate(iterDate.getDate() + 7)
                 } else if (frequency === 'MENSUAL') {
                     iterDate.setMonth(iterDate.getMonth() + 1)
                 } else {
                     // Single time if unknown frequency or 'ONCE'
                     break
                 }
            }

            // 3. Insert Plans
            if (datesToCreate.length > 0) {
                 for (const dateStr of datesToCreate) {
                     // Check if inside the target year (optional safety?)
                     // For now, trust the loop limit.
                     
                    await supabase.from('maintenance_plans').insert({
                        activity_id: activityId,
                        scheduled_date: dateStr,
                        status: 'PENDIENTE',
                        operational_days: dias,
                    })
                    count++
                }
            }
        }

        revalidatePath(`/admin/bitacoras/${bitacoraId}/planning`)
        return { success: true, count }

    } catch (error) {
        console.error('Import Error:', error)
        return { error: 'Error procesando el archivo: ' + (error as any).message }
    }
}
