import { ExcelProcessor } from "@/components/excel-processor"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Excel URL Generator</h1>
            <p className="text-muted-foreground">Process Excel data to generate formatted URLs with Base64 encoding</p>
          </div>
          <ExcelProcessor />
        </div>
      </div>
    </main>
  )
}
