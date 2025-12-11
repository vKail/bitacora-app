'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function logoutUser() {
  const cookieStore = await cookies()
  
  // Delete the session cookie
  cookieStore.delete('session')
  
  // Redirect to login page
  redirect('/login')
}
