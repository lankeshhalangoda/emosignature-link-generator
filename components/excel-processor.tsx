"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Upload,
  Download,
  FileSpreadsheet,
  Link,
  AlertTriangle,
  CheckCircle,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Save,
  X,
} from "lucide-react"
import { processExcelFile, generateExcelFiles, generateCSVFile } from "@/lib/excel-utils"

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

interface EditModalData {
  isOpen: boolean
  rowIndex: number
  rowData: any
}

export function ExcelProcessor() {
  const [file, setFile] = useState<File | null>(null)
  const [customPath, setCustomPath] = useState("seylancsatupdated")
  const [isProcessing, setIsProcessing] = useState(false)
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null)
  const [editedData, setEditedData] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [editModal, setEditModal] = useState<EditModalData>({
    isOpen: false,
    rowIndex: -1,
    rowData: {},
  })
  const [tempEditData, setTempEditData] = useState<any>({})

  const itemsPerPage = 10

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
        setEditedData([])
        setCurrentPage(1)
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
      setEditedData([...result.processedData]) // Create editable copy
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while processing the file")
    } finally {
      setIsProcessing(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }, [file, customPath])

  const openEditModal = useCallback(
    (rowIndex: number) => {
      const actualIndex = (currentPage - 1) * itemsPerPage + rowIndex
      const rowData = editedData[actualIndex]
      setEditModal({
        isOpen: true,
        rowIndex: actualIndex,
        rowData: { ...rowData },
      })
      setTempEditData({ ...rowData })
    },
    [editedData, currentPage, itemsPerPage],
  )

  const closeEditModal = useCallback(() => {
    setEditModal({
      isOpen: false,
      rowIndex: -1,
      rowData: {},
    })
    setTempEditData({})
  }, [])

  const saveEditChanges = useCallback(() => {
    const updatedData = [...editedData]
    const oldSlug = updatedData[editModal.rowIndex]["Link slug"]
    const newSlug = tempEditData["Link slug"]

    // Update the row data
    updatedData[editModal.rowIndex] = { ...tempEditData }

    // If slug changed, update the shorten URL
    if (oldSlug !== newSlug) {
      updatedData[editModal.rowIndex]["Shorten URL"] = `https://emo.run/${newSlug}`
    }

    setEditedData(updatedData)
    closeEditModal()
  }, [editedData, editModal.rowIndex, tempEditData, closeEditModal])

  const handleTempDataChange = useCallback((key: string, value: string) => {
    setTempEditData((prev) => ({
      ...prev,
      [key]: value,
    }))
  }, [])

  const generateFileName = useCallback(
    (type: string) => {
      const cleanPath = customPath.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "")
      return `${cleanPath}_${type}_${timestamp}`
    },
    [customPath],
  )

  const handleDownload = useCallback(
    async (type: "full" | "urls" | "shortio") => {
      if (!editedData.length) return

      try {
        let blob: Blob
        let fileName: string

        if (type === "shortio") {
          // CSV with just Original URL and Link slug
          const csvData = editedData.filter((row) => row["Link slug"] !== "ERROR")
          blob = await generateCSVFile(csvData, ["Original URL", "Link slug"])
          fileName = `${generateFileName("shortio")}.csv`
        } else {
          blob = await generateExcelFiles(
            type === "full"
              ? editedData
              : editedData.map((row) => row["Original URL"]).filter((url) => url !== "ERROR"),
            type,
            customPath,
          )
          fileName = `${generateFileName(type === "full" ? "full" : "urls")}.xlsx`
        }

        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (err) {
        setError("Failed to generate file")
      }
    },
    [editedData, generateFileName, customPath],
  )

  // Pagination logic
  const totalPages = Math.ceil(editedData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = editedData.slice(startIndex, endIndex)

  // Get column keys for display (excluding some internal ones)
  const displayColumns =
    editedData.length > 0
      ? Object.keys(editedData[0]).filter((key) => !key.includes("Formatted") && !key.includes("Base64"))
      : []

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
            Select an Excel file with location data. The system will generate unique, intelligent link slugs and create
            both original emojot.com URLs and shortened emo.run URLs
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

          {/* Preview Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5" />
                Preview & Edit
              </CardTitle>
              <CardDescription>
                Review your generated data and click the pencil icon to edit any record. All slugs are guaranteed to be
                unique.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Row</TableHead>
                      {displayColumns.slice(0, 4).map((key) => (
                        <TableHead key={key} className="min-w-[150px]">
                          {key}
                        </TableHead>
                      ))}
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentData.map((row, index) => {
                      const actualIndex = startIndex + index

                      return (
                        <TableRow key={actualIndex}>
                          <TableCell className="font-medium text-center">{actualIndex + 1}</TableCell>
                          {displayColumns.slice(0, 4).map((key) => (
                            <TableCell key={key} className="max-w-[200px]">
                              {key === "Link slug" ? (
                                <span className="font-mono text-sm bg-blue-50 px-2 py-1 rounded">
                                  {String(row[key])}
                                </span>
                              ) : key === "Shorten URL" ? (
                                <span className="text-blue-600 text-sm truncate block">{String(row[key])}</span>
                              ) : (
                                <span className="truncate block" title={String(row[key])}>
                                  {String(row[key])}
                                </span>
                              )}
                            </TableCell>
                          ))}
                          <TableCell>
                            {row["Link slug"] !== "ERROR" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditModal(index)}
                                className="h-8 w-8 p-0"
                                title="Edit record"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(endIndex, editedData.length)} of {editedData.length} records
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Download Results
              </CardTitle>
              <CardDescription>
                Download your processed data with meaningful file names based on your custom path.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Complete Data</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    All original columns plus generated fields, link slugs, and URLs
                  </p>
                  <Button onClick={() => handleDownload("full")} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download Full Data
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Original URLs Only</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Excel file with original emojot.com URLs (
                    {editedData.filter((row) => row["Original URL"] !== "ERROR").length} successful)
                  </p>
                  <Button onClick={() => handleDownload("urls")} variant="outline" className="w-full">
                    <Link className="h-4 w-4 mr-2" />
                    Download URLs Only
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Download and Upload in Short.oiL</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    CSV with Original URL and Link slug columns for short.io
                  </p>
                  <Button onClick={() => handleDownload("shortio")} variant="secondary" className="w-full">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Download CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Edit Modal */}
      <Dialog open={editModal.isOpen} onOpenChange={closeEditModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Record #{editModal.rowIndex + 1}</DialogTitle>
            <DialogDescription>
              Make changes to any field. The shorten URL will automatically update if you change the link slug.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {Object.keys(tempEditData).map((key) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`edit-${key}`} className="text-sm font-medium">
                  {key}
                </Label>
                <Input
                  id={`edit-${key}`}
                  value={String(tempEditData[key] || "")}
                  onChange={(e) => handleTempDataChange(key, e.target.value)}
                  className={key === "Link slug" ? "font-mono" : ""}
                  placeholder={`Enter ${key.toLowerCase()}`}
                />
                {key === "Link slug" && (
                  <p className="text-xs text-muted-foreground">
                    This will update the shorten URL: https://emo.run/{tempEditData[key] || "slug"}
                  </p>
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditModal}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={saveEditChanges}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
