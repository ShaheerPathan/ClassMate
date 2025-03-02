import { DashboardNav } from "@/components/dashboard/DashboardNav"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <div className="flex flex-col md:flex-row">
        {/* Mobile nav - shown only on small screens */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#191919] z-50">
          <DashboardNav className="h-full" />
        </div>

        {/* Desktop nav - hidden on small screens */}
        <div className="hidden md:block fixed left-0 w-64 h-screen">
          <DashboardNav className="h-full" />
        </div>

        {/* Main content */}
        <div className="w-full md:pl-64 pb-16 md:pb-0">
          <main className="container mx-auto px-4 py-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}