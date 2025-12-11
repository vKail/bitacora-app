'use server'

import { supabase } from '@/lib/db'
import { endOfMonth } from 'date-fns'

export type DetailedRow = {
    id: number
    month: string
    activity: string
    date: string
    dias: number
    to: number // Dias * 4
    tp: number // TR + TM
    tr: number
    tm: number
}

export type DetailedReport = {
    rows: DetailedRow[]
    totals: {
        to: number
        tp: number
        tr: number
        tm: number
        dias: number
    }
    averages: {
        to: number
        tp: number
        tr: number
        tm: number
    }
}

// Update signature
export async function getDetailedStats(year: number, bitacoraId?: string): Promise<DetailedReport> {
    // 1. If bitacoraId, get its daily hours directly
    let dailyHours = 4
    if (bitacoraId) {
        const { data } = await supabase.from('bitacoras').select('daily_hours').eq('id', bitacoraId).single()
        if (data) dailyHours = data.daily_hours
    } else {
        // Fallback for global year logic (deprecated?)
         const { data: bitacora } = await supabase.from('bitacoras').select('daily_hours').eq('year', year).single()
         dailyHours = bitacora?.daily_hours || 4
    }

    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year, 11, 31)

    // Query Plans (Base of Truth) instead of Logs to include Pending/Missed tasks
    let query = supabase
        .from('maintenance_plans')
        .select(`
            id,
            scheduled_date,
            status,
            operational_days,
            activity:activities!inner (
                description,
                tr_hours,
                tm_hours,
                bitacora_id
            ),
            logs:execution_logs (
                id,
                logged_at,
                is_completed
            )
        `)
        .gte('scheduled_date', startOfYear.toISOString())
        .lte('scheduled_date', endOfYear.toISOString())
        .order('scheduled_date', { ascending: true })

    const { data: plans, error } = await query

    if (error) {
        console.error('Error fetching plans:', error)
        return { 
            rows: [], 
            totals: { to: 0, tp: 0, tr: 0, tm: 0, dias: 0 }, 
            averages: { to: 0, tp: 0, tr: 0, tm: 0 } 
        }
    }

    // JS Filtering for Bitacora Context
    const filteredPlans = bitacoraId 
        ? plans.filter((p: any) => p.activity?.bitacora_id === bitacoraId)
        : plans

    const rows: DetailedRow[] = []
    let sumTO = 0
    let sumTP = 0
    let sumTR = 0
    let sumTM = 0
    let sumDias = 0

    filteredPlans.forEach((plan: any) => {
        // Activity stats (Planned)
        const trPlanned = Number(plan.activity?.tr_hours) || 0
        const tmPlanned = Number(plan.activity?.tm_hours) || 0
        const dias = Number(plan.operational_days) || 0
        
        // Log stats (Actual) - Take the first log if multiple (should be 1:1 usually)
        const log = plan.logs?.[0]
        const isCompleted = plan.status === 'COMPLETADO' || (log && log.is_completed)

        // If completed, we assume TR/TM applies as "Real". 
        // If pending, Real is 0. 
        // NOTE: The user's CSV imported TR/TM as *Planned* values in the activity definition.
        // The table columns are TP (Tiempo Planificado), TR (Real), TM (Muerto).
        // Usually TP = TR + TM (from activity definition).
        // Real TR might differ, but we don't track "Actual Duration" field in Log yet, 
        // we only have the Activity definition's TR/TM which are theoretical.
        // Unless we add 'actual_duration' to execution_logs, we simply project the Activity values 
        // as "Real" when completed? Or we always show them as Planned?
        // Let's assume:
        // TP = trPlanned + tmPlanned (Theoretical Total)
        // TR = trPlanned (Theoretical Repair) IF Completed? Or always?
        // Let's stick to:
        // TP = (tr_hours + tm_hours) from Activity
        // TR = tr_hours (if Completed, else 0?) -> User prompt implies "Analiticas" showing data.
        // If I strictly follow "Real", Pending should be 0.
        
        // Logic Update: User wants to see imported TR/TM values in the table
        // independently of completion status (Forecast view).
        // Since we don't catch "Actual Duration" in logs yet (we just use standard),
        // we can simply show the Standard values as the "TR" and "TM" columns.
        
        const tp = trPlanned + tmPlanned
        // Always show the standard values so user sees what they imported
        const tr = trPlanned
        const tm = tmPlanned
        
        // Operational time (TO) = dias * dailyHours
        const to = dias * dailyHours

        // Accumulate
        sumTO += to
        sumTP += tp
        sumTR += tr
        sumTM += tm
        sumDias += dias

        const date = new Date(plan.scheduled_date)
        // Use UTC date for month name to avoid shift? 
        // scheduled_date is YYYY-MM-DD (string mostly) or ISO.
        // Let's use string splitting for safety if it's YYYY-MM-DD
        const dateStr = plan.scheduled_date.toString().split('T')[0]
        const [y, m, d] = dateStr.split('-').map(Number)
        // Helper date for formatting
        const dateObj = new Date(Date.UTC(y, m-1, d, 12, 0, 0)) 

        const monthName = dateObj.toLocaleString('es-ES', { month: 'long' })
        const monthCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1)

        rows.push({
            id: plan.id,
            month: monthCapitalized,
            activity: plan.activity?.description || 'Desconocida',
            date: dateObj.toLocaleDateString('es-ES'),
            dias,
            to,
            tp,
            tr,
            tm
        })
    })

    const count = rows.length || 1 // avoid div by zero

    return {
        rows,
        totals: {
            to: parseFloat(sumTO.toFixed(2)),
            tp: parseFloat(sumTP.toFixed(2)),
            tr: parseFloat(sumTR.toFixed(2)),
            tm: parseFloat(sumTM.toFixed(2)),
            dias: sumDias
        },
        averages: {
            to: parseFloat((sumTO / count).toFixed(2)),
            tp: parseFloat((sumTP / count).toFixed(2)),
            tr: parseFloat((sumTR / count).toFixed(2)),
            tm: parseFloat((sumTM / count).toFixed(2))
        }
    }
}
