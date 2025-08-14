"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Upload, Download, FileSpreadsheet, Link, AlertTriangle, CheckCircle } from "lucide-react"
import { processExcelFile, generateExcelFiles } from "@/lib/excel-utils"

interface ProcessedData {
  originalData: any[]
  processedData: any[]
  urlsOnly: string[]
  totalRecords: number
  successfulRecords: number
  failedRecords: number
  errors: Array<{
    rowIndex: number
    rowData: any
    error: string
  }>
}

export function ExcelProcessor() {
  const [file, setFile] = useState<File | null>(null)
  const [customPath, setCustomPath] = useState("seylancsatupdated")
  const [isProcessing, setIsProcessing] = useState(false)
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (
        selectedFile.type.includes("sheet") ||
        selectedFile.name.endsWith(".xlsx") ||
        selectedFile.name.endsWith(".xls")
      ) {
        setFile(selectedFile)
        setError(null)
        setProcessedData(null)
      } else {
        setError("Please select a valid Excel file (.xlsx or .xls)")
        setFile(null)
      }
    }
  }, [])

  const handleProcess = useCallback(async () => {
    if (!file) {
      setError("Please select an Excel file first")
      return
    }

    if (!customPath.trim()) {
      setError("Please enter a custom path")
      return
    }

    setIsProcessing(true)
    setError(null)
    setProgress(0)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const result = await processExcelFile(file, customPath.trim())

      clearInterval(progressInterval)
      setProgress(100)

      setProcessedData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while processing the file")
    } finally {
      setIsProcessing(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }, [file, customPath])

  const handleDownload = useCallback(
    async (type: "full" | "urls") => {
      if (!processedData) return

      try {
        const blob = await generateExcelFiles(
          type === "full" ? processedData.processedData : processedData.urlsOnly,
          type,
        )

        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = type === "full" ? `processed_data_${Date.now()}.xlsx` : `urls_only_${Date.now()}.xlsx`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (err) {
        setError("Failed to generate Excel file")
      }
    },
    [processedData],
  )

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Excel File
          </CardTitle>
          <CardDescription>
            Select an Excel file containing location data with columns for Branch, District, and Google review URLs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="file-upload">Excel File</Label>
            <Input id="file-upload" type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="mt-1" />
          </div>

          <div>
            <Label htmlFor="custom-path">Custom Path</Label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">https://emojot.com/</span>
              <Input
                id="custom-path"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder="seylancsatupdated"
                className="flex-1"
              />
            </div>
          </div>

          {file && (
            <div className="p-3 bg-muted rounded-md">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            </div>
          )}

          <Button onClick={handleProcess} disabled={!file || isProcessing || !customPath.trim()} className="w-full">
            {isProcessing ? "Processing..." : "Process Excel File"}
          </Button>

          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">Processing your Excel file...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results Section */}
      {processedData && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Processing Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{processedData.totalRecords}</div>
                  <div className="text-sm text-muted-foreground">Total Records</div>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{processedData.successfulRecords}</div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">{processedData.failedRecords}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
              </div>

              {processedData.failedRecords > 0 && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-2">Failed Records Details:</div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {processedData.errors.map((error, index) => (
                        <div key={index} className="text-sm p-2 bg-red-50 rounded border-l-2 border-red-200">
                          <div className="font-medium">
                            Row {error.rowIndex}: {error.error}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Data: {JSON.stringify(error.rowData, null, 2).slice(0, 100)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Download Results
              </CardTitle>
              <CardDescription>Your Excel file has been processed. Download the results below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Complete Data</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    All original columns plus generated strings, Base64 encoding, and final URLs
                  </p>
                  <Button onClick={() => handleDownload("full")} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download Full Data
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">URLs Only</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Excel file containing only the final generated URLs ({processedData.urlsOnly.length} successful)
                  </p>
                  <Button onClick={() => handleDownload("urls")} variant="outline" className="w-full">
                    <Link className="h-4 w-4 mr-2" />
                    Download URLs Only
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
