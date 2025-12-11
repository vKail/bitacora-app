"use client"

import { Calendar, Home, Inbox, Search, Settings, ListChecks, LayoutDashboard, LogOut, LineChart } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { logoutUser } from "@/features/auth/actions/logout"

// Menu items.
const items = [
  {
    title: "Mis Bitácoras",
    url: "/admin/bitacoras",
    icon: Calendar, // Or another icon like BookOpen? Calendar is fine for now as it relates to planning
    group: "Administración"
  },
  {
    title: "Tablero Técnico",
    url: "/technician/dashboard",
    icon: LayoutDashboard,
    group: "Técnico"
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="p-4 pt-4 group-data-[collapsible=icon]:!p-0">
        <SidebarGroup>
          <div className="px-2 mb-4 group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel className="text-lg font-bold text-primary w-full justify-between items-center">
                <span>Bitácora CMMS</span>
            </SidebarGroupLabel>
          </div>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.url || pathname.startsWith(item.url + '/')}
                    size="default" 
                    className="text-sm h-10 transition-all hover:bg-slate-100 group-data-[collapsible=icon]:!p-2 group-data-[collapsible=icon]:!justify-center"
                  >
                    <Link href={item.url} className="flex items-center gap-3">
                      <item.icon className="!w-5 !h-5" />
                      <span className="font-medium group-data-[collapsible=icon]:hidden">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup />
      </SidebarContent>
      
      <SidebarFooter className="p-4 group-data-[collapsible=icon]:!p-0">
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton size="default" onClick={() => logoutUser()} className="text-red-600 hover:text-red-700 hover:bg-red-50 h-10 group-data-[collapsible=icon]:!p-2 group-data-[collapsible=icon]:!justify-center cursor-pointer">
                    <div className="flex items-center gap-3">
                        <LogOut className="!w-5 !h-5" />
                        <span className="font-semibold group-data-[collapsible=icon]:hidden">Cerrar Sesión</span>
                    </div>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
