"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export function NavMain({
  label,
  items,
}: {
  label: string
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    badge?: number
    badge2?: number | string
    badgeColor?: string
    items?: {
      title: string
      url: string
      isActive?: boolean
    }[]
  }[]
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isNavUrlActive = (url: string) => {
    try {
      const target = new URL(url, "http://localhost")
      if (pathname !== target.pathname) return false
      const urlTab = target.searchParams.get("tab")
      if (!urlTab) return true
      const currentTab = searchParams.get("tab") ?? "users"
      return currentTab === urlTab
    } catch {
      return pathname === url
    }
  }

  // Check if any subitem is active to determine if parent should be open
  const shouldBeOpen = (item: typeof items[0]) => {
    if (item.isActive) return true
    if (item.url && isNavUrlActive(item.url)) return true
    return item.items?.some((subItem) => isNavUrlActive(subItem.url)) || false
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={shouldBeOpen(item)}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              {item.items?.length ? (
                <>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title} className="cursor-pointer">
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild className="cursor-pointer" isActive={isNavUrlActive(subItem.url)}>
                            <Link
                              href={subItem.url}
                              target={(item.title === "Auth Pages" || item.title === "Errors") ? "_blank" : undefined}
                              rel={(item.title === "Auth Pages" || item.title === "Errors") ? "noopener noreferrer" : undefined}
                            >
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              ) : (
                <SidebarMenuButton asChild tooltip={item.title} className="cursor-pointer data-[active=true]:border-l-2 data-[active=true]:border-l-primary data-[active=true]:bg-sidebar-accent" isActive={isNavUrlActive(item.url)}>
                  <Link href={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    {(item.badge !== undefined && item.badge > 0) || item.badge2 ? (
                      <div className="ml-auto flex items-center gap-1">
                        {item.badge !== undefined && item.badge > 0 && (
                          <Badge 
                            className={`text-xs font-semibold ${item.badgeColor || 'bg-primary/10 text-primary'}`}
                          >
                            {item.badge}
                          </Badge>
                        )}
                        {item.badge2 && (
                          <Badge 
                            className={`text-xs font-semibold ${item.badgeColor || 'bg-primary/10 text-primary'}`}
                          >
                            {item.badge2}
                          </Badge>
                        )}
                      </div>
                    ) : null}
                  </Link>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
