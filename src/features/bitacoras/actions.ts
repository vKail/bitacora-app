'use server'

import { supabase } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { redirect } from 'next/navigation'

const BitacoraSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  year: z.coerce.number().min(2000).max(2100),
  daily_hours: z.coerce.number().min(0).default(4),
  description: z.string().optional()
})

export async function createBitacora(prevState: any, formData: FormData) {
    const data = Object.fromEntries(formData)
    const parsed = BitacoraSchema.safeParse(data)

    if (!parsed.success) {
        return { error: 'Datos inválidos', issues: parsed.error.issues }
    }

    const { name, year, daily_hours, description } = parsed.data

    try {
        const { data: newBitacora, error } = await supabase
            .from('bitacoras')
            .insert({
                name,
                year,
                daily_hours,
                description
            })
            .select()
            .single()

        if (error) throw error

        revalidatePath('/admin/bitacoras')
        return { success: true, id: newBitacora.id }
    } catch (error) {
        console.error('Error creating bitacora:', error)
        return { error: 'Error al crear la bitácora' }
    }
}

export async function getBitacoras() {
    // Fetch all bitacoras, ordered by year desc, then name
    const { data, error } = await supabase
        .from('bitacoras')
        .select('*')
        .order('year', { ascending: false })
        .order('name', { ascending: true })

    if (error) {
        console.error('Error fetching bitacoras:', error)
        return []
    }
    return data
}
