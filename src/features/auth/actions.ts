'use server'

import { z } from 'zod'
import { supabase } from '@/lib/db'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'
import { cookies } from 'next/headers'

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['SUPERVISOR', 'TECNICO']).optional(),
})

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-change-it')


export async function registerUser(prevState: any, formData: FormData) {
  const data = Object.fromEntries(formData)
  const parsed = RegisterSchema.safeParse(data)

  if (!parsed.success) {
    return { error: 'Datos inválidos', issues: parsed.error.issues }
  }

  const { email, password, firstName, lastName, role } = parsed.data

  try {
    const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

    if (existingUser) {
      return { error: 'El usuario ya existe' }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const { error: insertError } = await supabase
        .from('users')
        .insert({
            email,
            password_hash: hashedPassword, // Match DB column name
            first_name: firstName,
            last_name: lastName,
            role: role || 'TECNICO',
            created_at: new Date().toISOString()
        })

    if (insertError) {
        throw insertError
    }

    return { success: true }
  } catch (error) {
    console.error('Register error:', error)
    return { error: 'Error al registrar usuario: ' + (error as any).message }
  }
}

export async function loginUser(prevState: any, formData: FormData) {
  console.log('--- LOGIN ATTEMPT ---')
  const data = Object.fromEntries(formData)
  const parsed = LoginSchema.safeParse(data)

  if (!parsed.success) {
    console.log('Validation failed')
    return { error: 'Credenciales inválidas' }
  }

  const { email, password } = parsed.data
  console.log(`Email provided: ${email}`)

  try {
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

    if (error) {
        console.error('Supabase Error finding user:', error)
        return { error: 'Error de base de datos o usuario no encontrado' }
    }

    if (!user) {
      console.log('User not found in DB (null result)')
      return { error: 'Usuario no encontrado' }
    }

    console.log(`User found: ${user.email}, Role: ${user.role}, Hash: ${user.password_hash?.substring(0, 10)}...`)

    if (!user.password_hash) {
        console.log('Error: User has no password hash!')
        return { error: 'Usuario sin contraseña configurada' } 
    }

    const isValid = await bcrypt.compare(password, user.password_hash)
    console.log(`Password validation result: ${isValid}`)

    if (!isValid) {
      return { error: 'Contraseña incorrecta' }
    }

    // Create Session (JWT in Cookie)
    console.log('Generating JWT...')
    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(SECRET_KEY)

    const cookieStore = await cookies()
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    })

    console.log('Redirecting...')
    // Redirect based on role
    if (user.role === 'SUPERVISOR') {
      redirect('/admin/bitacoras')
    } else {
      redirect('/technician/dashboard')
    }
  } catch (error) {
    if ((error as any).message === 'NEXT_REDIRECT') {
       throw error;
    }
    console.error('Login CRITICAL error:', error)
    return { error: 'Error al iniciar sesión' }
  }
}
