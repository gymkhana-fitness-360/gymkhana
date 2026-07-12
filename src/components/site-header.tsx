"use client"

import * as React from "react"
import { useSession, signOut } from "next-auth/react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { LogOut, Moon, Sun } from "lucide-react"
import { GlobalUndoButton } from "@/components/global-undo-button"
import { useTheme } from "@/contexts/theme-context"
import { GymSelector, type GymOption } from "@/components/gym-selector"

export function SiteHeader({
  initialGyms = [],
  initialGymId = null,
}: {
  initialGyms?: GymOption[]
  initialGymId?: string | null
}) {
  const { data: session } = useSession()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background">
      <div className="flex w-full items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 h-4"
        />
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">
            Welcome, {session?.user?.name || "User"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {session?.user?.role === "ADMIN" ? "Administrator" : "Staff Member"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <GlobalUndoButton />
          <GymSelector initialGyms={initialGyms} initialGymId={initialGymId} />
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="gap-2"
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {theme === "light" ? "Dark" : "Light"}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
