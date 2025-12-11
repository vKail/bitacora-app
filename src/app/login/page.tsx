import LoginForm from '@/features/auth/components/LoginForm'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-10 shadow-2xl">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-slate-900">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Bitácora de Mantenimiento
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
