'use client'

import { useActionState } from 'react'
import { startTransition } from 'react'
import { loginUser } from '../actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

const initialState = {
  error: '',
}

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginUser, initialState)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(() => {
      formAction(formData)
    })
  }

  return (
    <Card className="w-full max-w-xl mx-auto shadow-lg">
      <CardHeader className="p-8 pb-4">
        <CardTitle className="text-3xl font-bold text-center">Bienvenido</CardTitle>
        <CardDescription className="text-center">
          Ignis Combustibles S.A.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-8 pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="tu@empresa.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
            />
          </div>


          {state?.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {state.error}
              </AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isPending}
          >
            {isPending ? 'Iniciando sesión...' : 'Ingresar'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="text-center text-sm text-slate-500 justify-center">
        Sistema de Mantenimiento v1.0
      </CardFooter>
    </Card>
  )
}
