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
                bitacora_id
            ),
            logs:execution_logs (
                id,
                logged_at,
                is_completed,
                execution_time_minutes,
                tm_minutes
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
        // FILTER: Only completed tasks
        if (plan.status !== 'COMPLETADO') return;

        // Log stats (Actual)
        const log = plan.logs?.[0]
        
        let trReal = 0
        let tmReal = 0

        if (log) {
            // TR: execution_time_minutes convert to hours
            trReal = (log.execution_time_minutes || 0) / 60
            
            // TM: Use tm_minutes column (if exists, else 0)
            const tmMinutes = log.tm_minutes || 0
            tmReal = tmMinutes / 60
            
            // Deprecated: JSON parsing for backward compatibility? 
            // If tm_minutes is 0, check JSON? 
            // Assuming migration, let's prioritize column. 
            // If user didn't migrate data, they lose historic TM view on this report.
            // But this is "Refactor", so let's stick to clean Logic.
        } else {
            // Fallback
        }
        
        const dias = Number(plan.operational_days) || 0
        
        // Logic Update:
        // TP (Tiempo Productivo) = TR + TM (Real values now)
        const tp = trReal + tmReal
        
        // Operational time (TO) = dias * dailyHours
        const to = dias * dailyHours

        // Accumulate
        sumTO += to
        sumTP += tp
        sumTR += trReal
        sumTM += tmReal
        sumDias += dias

        const date = new Date(plan.scheduled_date)
        const dateStr = plan.scheduled_date.toString().split('T')[0]
        const [y, m, d] = dateStr.split('-').map(Number)
        const dateObj = new Date(Date.UTC(y, m-1, d, 12, 0, 0)) 

        const monthName = dateObj.toLocaleString('es-ES', { month: 'long' })
        const monthCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1)

        rows.push({
            id: plan.id,
            month: monthCapitalized,
            activity: plan.activity?.description || 'Desconocida',
            date: dateObj.toLocaleDateString('es-ES'),
            dias,
            to: parseFloat(to.toFixed(2)),
            tp: parseFloat(tp.toFixed(2)),
            tr: parseFloat(trReal.toFixed(2)),
            tm: parseFloat(tmReal.toFixed(2))
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
