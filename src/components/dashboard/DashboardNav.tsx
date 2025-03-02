"use client"

import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, Brain, FileText, Home, Timer, Users, LogOut } from "lucide-react"
import { signOut, useSession } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface NavItem {
  label: string;
  icon:  React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  badge?: string;
  onClick?: () => void;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function DashboardNav({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const pathname = usePathname()
  const { data: session } = useSession()

  const navSections: NavSection[] = [
    {
      title: "General",
      items: [
        {
          label: 'Home',
          icon: Home,
          href: '/home',
        },
        {
          label: 'Profile',
          icon: Users,
          href: '/profile',
        },
      ]
    },
    {
      title: "Study Tools", 
      items: [
        {
          label: 'Planner',
          icon: BookOpen,
          href: '/study-plan',
        },
        {
          label: 'Resources',
          icon: Brain,
          href: '/resources',
        },
        {
          label: 'Timer',
          icon: Timer,
          href: '/timer',
        },
        {
          label: 'Notes',
          icon: FileText,
          href: '/notes',
        },
      ]
    },
    {
      title: "Account",
      items: [
        {
          label: 'Log out',
          icon: LogOut,
          href: '#',
          onClick: () => signOut()
        }
      ]
    }
  ]

  return (
    <nav 
      className={cn(
        "h-full bg-background text-foreground overflow-y-auto",
        className
      )} 
      {...props}
    >
      <div className="px-3 py-2">
        {/* Desktop View */}
        <div className="hidden md:block">
          <div className="px-4 py-2 mb-4">
            <Avatar className="h-10 w-10 bg-[#F2EDE0]">
              <AvatarImage 
                src={session?.user?.image || "/images/default-avatar.png"} 
                alt={session?.user?.name || '@user'} 
              />
              <AvatarFallback>{session?.user?.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            {session?.user?.name && (
              <p className="mt-2 text-sm font-medium">Welcome, {session.user.name}</p>
            )}
          </div>
          {navSections.map((section, idx) => (
            <div key={section.title} className={cn("py-2", idx !== 0 && "mt-6")}>
              <h3 className="px-4 text-xs font-medium text-muted-foreground mb-2">
                {section.title}
              </h3>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={item.onClick}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-4 py-2.5 text-sm font-medium transition-all duration-200 ease-in-out hover:bg-muted hover:text-foreground hover:shadow-md border-r-2 border-transparent hover:border-primary hover:translate-x-1",
                      pathname === item.href 
                        ? "text-foreground bg-muted border-r-2 border-primary" 
                        : "text-muted-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 text-foreground" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Mobile View */}
        <div className="md:hidden fixed bottom-0 left-0 right-0" style={{ backgroundColor: '#EFE9D5' }}>
          <div className="flex justify-around items-center overflow-x-auto py-3 px-2">
            {navSections.flatMap(section => section.items).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={item.onClick}
                className={cn(
                  "flex flex-col items-center justify-center p-2 min-w-[70px] rounded-md transition-all duration-200 ease-in-out hover:bg-muted hover:text-foreground hover:shadow-sm border-b-2 border-transparent hover:border-primary",
                  pathname === item.href 
                    ? "text-foreground bg-muted border-b-2 border-primary" 
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5 text-foreground" />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
                {item.badge && (
                  <span className="absolute top-0 right-0 text-xs bg-primary text-primary-foreground px-1 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}