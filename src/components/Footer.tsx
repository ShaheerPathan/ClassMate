export function Footer() {
  return (
    <footer className="bottom-0 w-full bg-background z-50 py-8 border-t-2 border-border">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-center md:relative">
          <div className="text-sm text-foreground text-center">
            © {new Date().getFullYear()} ClassMate. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  )
}
