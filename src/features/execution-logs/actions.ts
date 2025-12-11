'use server'

import { supabase } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function logExecution(
    prevState: any,
    formData: FormData
) {
    const user = await getCurrentUser()
    if (!user) {
        return { error: 'No autorizado' }
    }

    const planId = Number(formData.get('planId'))
    const timeMinutes = Number(formData.get('timeMinutes')) || 0
    const observations = formData.get('observations') as string
    
    // Additional Data Handling (Formulas)
    const dataDisplay = formData.get('data_display')
    const dataReal = formData.get('data_real')

    // Additional fields can be extracted here
    // Type definition for loose JSON data
    let additionalData: any = {}
    
    // 2. Calibration Data
    if (dataDisplay && dataReal) {
        const display = parseFloat(dataDisplay.toString())
        const real = parseFloat(dataReal.toString())
        if (!isNaN(display) && !isNaN(real) && real !== 0) {
            const errorPercentage = ((display - real) / real) * 100
            additionalData.calibration = {
                display,
                real,
                errorPercentage: parseFloat(errorPercentage.toFixed(2)),
                isWithinTolerance: Math.abs(errorPercentage) <= 0.5 // Standard +/- 0.5%
            }
        }
    }

    try {
        const { error: logError } = await supabase
            .from('execution_logs')
            .insert({
                plan_id: planId,
                executed_by: user.userId,
                execution_time_minutes: timeMinutes,
                observations: observations + (Object.keys(additionalData).length ? ` [DATA: ${JSON.stringify(additionalData)}]` : ''),
                // ideally we would have a jsonb column 'data' but 'observations' string append works for MVP if schema is fixed
                is_completed: true,
                logged_at: new Date().toISOString()
            })

        if (logError) throw logError

        const { error: planError } = await supabase
            .from('maintenance_plans')
            .update({ status: 'COMPLETADO' })
            .eq('id', planId)

        if (planError) throw planError

        revalidatePath('/technician/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error logging execution:', error)
        return { error: 'Error al registrar ejecución: ' + (error as any).message }
    }
}
