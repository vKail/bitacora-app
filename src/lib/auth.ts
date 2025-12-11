import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-change-it')

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value

  if (!session) return null

  try {
    const { payload } = await jwtVerify(session, SECRET_KEY)
    return payload as { userId: string; email: string; role: string }
  } catch (error) {
    return null
  }
}
