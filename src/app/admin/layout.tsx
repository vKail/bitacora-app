import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full">
        <div className="p-2 border-b flex items-center gap-2">
            <SidebarTrigger />
            <span className="font-semibold text-sm">Menú</span>
        </div>
        <div className="p-4">
            {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
