import { Suspense } from 'react'
import { getBitacoras } from '@/features/bitacoras/actions'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { Plus, Calendar, Clock, BarChart, CalendarDays } from 'lucide-react'
import CreateBitacoraDialog from '@/features/bitacoras/components/CreateBitacoraDialog'

export default async function BitacorasPage() {
  const bitacoras = await getBitacoras()

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mis Bitácoras</h1>
            <p className="text-slate-500">Administra tus máquinas y sus planes de mantenimiento.</p>
        </div>
        <CreateBitacoraDialog />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bitacoras.map(bitacora => (
            <Card key={bitacora.id} className="hover:shadow-lg transition-all border-l-4 border-l-blue-600">
                <CardHeader>
                    <div className="flex justify-between items-start">
                         <CardTitle className="text-lg">{bitacora.name}</CardTitle>
                         <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            {bitacora.year}
                         </span>
                    </div>
                    <CardDescription>{bitacora.description || 'Sin descripción'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{bitacora.daily_hours} hrs/día operación</span>
                    </div>
                </CardContent>
                <CardFooter className="grid grid-cols-2 gap-2">
                    <Link href={`/admin/bitacoras/${bitacora.id}/planning`} className="w-full">
                        <Button variant="outline" className="w-full gap-2">
                            <CalendarDays className="w-4 h-4" /> Plan
                        </Button>
                    </Link>
                    <Link href={`/admin/bitacoras/${bitacora.id}/analytics`} className="w-full">
                        <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
                            <BarChart className="w-4 h-4" /> Analítica
                        </Button>
                    </Link>
                </CardFooter>
            </Card>
        ))}
        
        {bitacoras.length === 0 && (
            <div className="col-span-full text-center py-10 bg-slate-50 rounded-lg border border-dashed text-slate-500">
                No tienes bitácoras creadas aún. ¡Crea la primera!
            </div>
        )}
      </div>
    </div>
  )
}
