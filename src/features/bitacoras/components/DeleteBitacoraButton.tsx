'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react' // Using Trash2 for delete
import { deleteBitacora } from '@/features/bitacoras/actions'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function DeleteBitacoraButton({ id, name }: { id: string, name: string }) {
    const [loading, setLoading] = useState(false)

    const handleDelete = async () => {
        setLoading(true)
        const res = await deleteBitacora(id)
        setLoading(false)

        if (res.success) {
            toast.success(`Bitácora "${name}" eliminada`)
        } else {
            toast.error(res.error || "Error al eliminar")
        }
    }

    return (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente la bitácora <b>{name}</b> y toda la información asociada (planes, historial, reportes). No se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
                {loading ? 'Eliminando...' : 'Eliminar Permanentemente'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    )
}
