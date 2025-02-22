'use client'

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center space-x-2">
            <span>© {new Date().getFullYear()}</span>
            <span>•</span>
            <span>Department of Agriculture, Sri Lanka</span>
          </div>
          <div className="text-center">
            <p>Developed by</p>
            <p className="font-medium">
              Television and Farmers Broadcasting Service
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
} 