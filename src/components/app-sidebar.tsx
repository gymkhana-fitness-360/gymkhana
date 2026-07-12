"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Bell,
  Calendar,
  Settings,
  UserPlus,
  DollarSign,
  FileText,
  Dumbbell,
  Trophy,
  ClipboardCheck,
  BarChart3,
  AlertCircle,
  Store,
  CalendarDays,
  MessageSquare,
  Target,
  Pill,
  Bot,
  ListTodo,
  History,
  Megaphone,
} from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"

import { APP_NAME, APP_TAGLINE } from "@/lib/site-config"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { WhatsAppStatusButton } from "@/components/whatsapp-status-button"
import { useSidebarCounts } from "@/hooks/use-sidebar-counts"
import { useAssumeEmployeeView } from "@/hooks/use-assume-employee-view"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "ADMIN"
  const assumeEmployee = useAssumeEmployeeView()
  const staffView = assumeEmployee && isAdmin
  const counts = useSidebarCounts()

  const navGroups = [
    ...(staffView
      ? [
          {
            label: "Staff",
            items: [
              { title: "Members", url: "/dashboard/members", icon: Users },
              { title: "Payments", url: "/dashboard/payments", icon: CreditCard },
              { title: "Attendance", url: "/dashboard/attendance", icon: ClipboardCheck },
            ],
          },
        ]
      : [
    {
      label: "Overview",
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: LayoutDashboard,
        },
        {
          title: "Agent workspace",
          url: "/dashboard/workspace",
          icon: Bot,
        },
        {
          title: "Analytics",
          url: "/dashboard/analytics",
          icon: BarChart3,
        },
      ],
    },
    {
      label: "Management",
      items: [
        {
          title: "Members",
          url: "/dashboard/members",
          icon: Users,
          badge: counts.members.count,
          badge2: counts.members.activeMembers,
          badgeColor: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
        },
        {
          title: "Leads",
          url: "/dashboard/leads",
          icon: Target,
        },
        {
          title: "Payments",
          url: "/dashboard/payments",
          icon: CreditCard,
          badge: counts.payments.count,
          badge2: counts.payments.totalAmount > 0 ? `₹${Math.round(counts.payments.totalAmount / 1000)}k` : undefined,
          badgeColor: "bg-green-500/10 text-green-700 dark:text-green-400",
        },
        {
          title: "Bills & Receipts",
          url: "/dashboard/bills",
          icon: FileText,
        },
        {
          title: "Supplements (GST)",
          url: "/dashboard/supplements",
          icon: Pill,
        },
        {
          title: "Salaries & Expenses",
          url: "/dashboard/finances",
          icon: DollarSign,
        },
        {
          title: "Renewals",
          url: "/dashboard/renewals",
          icon: Calendar,
          badge: counts.renewals,
          badgeColor: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
        },
        {
          title: "Overdue Tracking",
          url: "/dashboard/overdue",
          icon: AlertCircle,
          badge: counts.overdue,
          badgeColor: "bg-red-500/10 text-red-700 dark:text-red-400",
        },
        {
          title: "Reminders",
          url: "/dashboard/reminders",
          icon: Bell,
        },
        {
          title: "Campaigns",
          url: "/dashboard/campaigns",
          icon: Megaphone,
        },
        {
          title: "WA History",
          url: "/dashboard/wa-history",
          icon: History,
        },
        {
          title: "WhatsApp",
          url: "/dashboard/bills/whatsapp",
          icon: MessageSquare,
        },
        {
          title: "Classes",
          url: "/dashboard/classes",
          icon: CalendarDays,
        },
        {
          title: "Marketplace",
          url: "/dashboard/marketplace",
          icon: Store,
        },
      ],
    },
    {
      label: "Fitness",
      items: [
        {
          title: "Attendance",
          url: "/dashboard/attendance",
          icon: ClipboardCheck,
        },
        {
          title: "Workouts",
          url: "/dashboard/workouts",
          icon: Dumbbell,
        },
        {
          title: "Challenges",
          url: "/dashboard/challenges",
          icon: Trophy,
        },
      ],
    },
    ...(isAdmin && !staffView ? [{
      label: "Admin",
      items: [
        {
          title: "Tasks",
          url: "/dashboard/tasks",
          icon: ListTodo,
          badge: counts.adminTasks,
          badgeColor: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
        },
        {
          title: "Employees",
          url: "/dashboard/employees",
          icon: UserPlus,
        },
        {
          title: "Trainers",
          url: "/dashboard/trainers",
          icon: Dumbbell,
        },
      ],
    }] : []),
    ...(isAdmin && !staffView
      ? [
          {
            label: "Settings",
            items: [
              {
                title: "Settings",
                url: "/dashboard/settings",
                icon: Settings,
                items: [
                  { title: "Team & access", url: "/dashboard/settings?tab=users" },
                  { title: "Notifications", url: "/dashboard/settings?tab=notifications" },
                  { title: "Session", url: "/dashboard/settings?tab=session" },
                  { title: "Plans & pricing", url: "/dashboard/settings?tab=plans" },
                  { title: "Action logs", url: "/dashboard/settings?tab=logs" },
                ],
              },
            ],
          },
        ]
      : []),
    ]),
  ]

  const user = {
    name: session?.user?.name || "User",
    email: (session?.user as any)?.contactNumber || "",
    avatar: "",
  }

  return (
    <Sidebar {...props} className="border-r-2 border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <span className="text-lg">💪</span>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{APP_NAME}</span>
                  <span className="truncate text-xs">{APP_TAGLINE}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group, idx) => (
          <React.Fragment key={group.label}>
            {idx > 0 && <SidebarSeparator className="my-2" />}
            <NavMain label={group.label} items={group.items} />
          </React.Fragment>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border space-y-2">
        <div className="px-2 py-2">
          <WhatsAppStatusButton />
        </div>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
