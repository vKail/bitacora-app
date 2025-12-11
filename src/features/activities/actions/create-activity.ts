'use server'

import { supabase } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const ActivitySchema = z.object({
  description: z.string().min(3),
  frequency_type: z.enum(['DIARIA', 'SEMANAL', 'MENSUAL']),
  standard_code: z.string().optional(),
  risk_level: z.enum(['BAJO', 'MEDIO', 'ALTO']),
})

export async function createActivity(prevState: any, formData: FormData) {
  const data = Object.fromEntries(formData)
  const parsed = ActivitySchema.safeParse(data)

  if (!parsed.success) {
    return { error: 'Datos inválidos', issues: parsed.error.issues }
  }

  try {
    const { error } = await supabase
      .from('activities')
      .insert(parsed.data)

    if (error) throw error

    revalidatePath('/admin/activities')
    return { success: true }
  } catch (error) {
    console.error('Error creating activity:', error)
    return { error: 'Error al crear actividad' }
  }
}
