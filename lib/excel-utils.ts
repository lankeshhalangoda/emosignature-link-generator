import * as XLSX from "xlsx"

interface ExcelRow {
  [key: string]: any
}

interface ProcessingError {
  rowIndex: number
  rowData: ExcelRow
  error: string
}

interface ProcessedData {
  originalData: ExcelRow[]
  processedData: ExcelRow[]
  urlsOnly: string[]
  totalRecords: number
  successfulRecords: number
  failedRecords: number
  errors: ProcessingError[]
}

export async function processExcelFile(file: File, customPath: string): Promise<ProcessedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[]

        if (jsonData.length === 0) {
          reject(new Error("The Excel file appears to be empty"))
          return
        }

        const errors: ProcessingError[] = []
        let successfulCount = 0

        const processedData = jsonData.map((row, index) => {
          try {
            const formattedString = generateFormattedString(row)
            const base64String = toUrlSafeBase64(formattedString)
            const finalUrl = `https://emojot.com/${customPath}?emoSignature=${base64String}`

            successfulCount++
            return {
              ...row,
              "Generated String": formattedString,
              "Base64 Encoding": base64String,
              "Final URL": finalUrl,
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
            console.error(`Error processing row ${index + 1}:`, error)

            errors.push({
              rowIndex: index + 1,
              rowData: row,
              error: errorMessage,
            })

            return {
              ...row,
              "Generated String": `ERROR: ${errorMessage}`,
              "Base64 Encoding": "ERROR",
              "Final URL": "ERROR",
            }
          }
        })

        const urlsOnly = processedData.map((row) => row["Final URL"]).filter((url) => url !== "ERROR")

        resolve({
          originalData: jsonData,
          processedData,
          urlsOnly,
          totalRecords: jsonData.length,
          successfulRecords: successfulCount,
          failedRecords: errors.length,
          errors,
        })
      } catch (error) {
        reject(new Error("Failed to parse Excel file. Please ensure it's a valid Excel format."))
      }
    }

    reader.onerror = () => {
      reject(new Error("Failed to read the file"))
    }

    reader.readAsArrayBuffer(file)
  })
}

function toUrlSafeBase64(str: string): string {
  const base64 = btoa(str)
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}

function generateFormattedString(row: ExcelRow): string {
  // Get all column names from the row
  const columns = Object.keys(row)

  if (columns.length === 0) {
    throw new Error("No columns found in row")
  }

  // Create the formatted string using ONLY the actual columns from Excel
  const parts = columns.map((columnName) => {
    const value = String(row[columnName] || "").trim()
    return `${columnName}~~${value || "undefined"}`
  })

  return parts.join("__")
}

export async function generateExcelFiles(data: any[], type: "full" | "urls"): Promise<Blob> {
  let worksheetData: any[]

  if (type === "urls") {
    // For URLs only, create an array of objects with a single 'URL' column
    worksheetData = data.map((url, index) => ({
      Row: index + 1,
      "Final URL": url,
    }))
  } else {
    // For full data, use the processed data as-is
    worksheetData = data
  }

  const worksheet = XLSX.utils.json_to_sheet(worksheetData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, type === "urls" ? "URLs" : "Processed Data")

  // Generate Excel file as array buffer
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })

  return new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
}
