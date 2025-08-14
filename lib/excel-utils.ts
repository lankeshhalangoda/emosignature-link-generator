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
        const usedSlugs = new Set<string>() // Track used slugs for uniqueness

        const processedData = jsonData.map((row, index) => {
          try {
            const formattedString = generateFormattedString(row)
            const base64String = toUrlSafeBase64(formattedString)
            const originalUrl = `https://emojot.com/${customPath}?emoSignature=${base64String}`

            const linkSlug = generateUniqueSlug(row, usedSlugs)
            const shortenUrl = `https://emo.run/${linkSlug}`

            successfulCount++
            return {
              ...row,
              "Generated String": formattedString,
              "Base64 Encoding": base64String,
              "Link slug": linkSlug,
              "Shorten URL": shortenUrl,
              "Original URL": originalUrl,
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
              "Link slug": "ERROR",
              "Shorten URL": "ERROR",
              "Original URL": "ERROR",
            }
          }
        })

        const urlsOnly = processedData.map((row) => row["Original URL"]).filter((url) => url !== "ERROR")

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

function generateUniqueSlug(row: ExcelRow, usedSlugs: Set<string>): string {
  const baseSlug = generateIntelligentSlug(row)
  let finalSlug = baseSlug
  let counter = 1

  // Ensure uniqueness by adding numbers if needed
  while (usedSlugs.has(finalSlug)) {
    finalSlug = `${baseSlug}${counter}`
    counter++
  }

  usedSlugs.add(finalSlug)
  return finalSlug
}

function generateIntelligentSlug(row: ExcelRow): string {
  const locationColumn = Object.keys(row).find(
    (key) =>
      key.toLowerCase().includes("location") ||
      key.toLowerCase().includes("branch") ||
      key.toLowerCase().includes("store") ||
      key.toLowerCase().includes("name"),
  )

  if (!locationColumn) {
    const firstColumn = Object.keys(row)[0]
    return generateAdvancedSlugFromText(String(row[firstColumn] || ""))
  }

  const locationText = String(row[locationColumn] || "")
  return generateAdvancedSlugFromText(locationText)
}

function generateAdvancedSlugFromText(text: string): string {
  if (!text || text.trim() === "") {
    return "unknown"
  }

  let slug = text.toLowerCase().trim()

  // Enhanced brand recognition
  const brandPatterns = {
    abans: /abans/gi,
    singer: /singer/gi,
    damro: /damro/gi,
    softlogic: /softlogic/gi,
    arpico: /arpico/gi,
    keells: /keells/gi,
    cargills: /cargills/gi,
    dialog: /dialog/gi,
    mobitel: /mobitel/gi,
    slt: /slt/gi,
  }

  let extractedBrand = ""
  for (const [brand, pattern] of Object.entries(brandPatterns)) {
    if (pattern.test(slug)) {
      extractedBrand = brand
      break
    }
  }

  const sriLankanPlaces = [
    // Major cities and towns
    "anuradhapura",
    "polonnaruwa",
    "kurunegala",
    "ratnapura",
    "badulla",
    "batticaloa",
    "trincomalee",
    "vavuniya",
    "jaffna",
    "matara",
    "galle",
    "kandy",
    "gampaha",
    "kegalle",
    "hambantota",
    "kalutara",
    "negombo",
    "chilaw",
    "puttalam",
    "mannar",

    // Colombo areas (keep numbers)
    "colombo",
    "col3",
    "col2",
    "col1",
    "col4",
    "col5",
    "col6",
    "col7",
    "col8",
    "col9",
    "col10",
    "col11",
    "col12",
    "col13",
    "col14",
    "col15",

    // Suburban areas
    "maharagama",
    "dehiwala",
    "moratuwa",
    "panadura",
    "homagama",
    "kadawatha",
    "malabe",
    "nugegoda",
    "rajagiriya",
    "wellawatte",
    "battaramulla",
    "kottawa",
    "piliyandala",
    "kesbewa",
    "boralesgamuwa",
    "mount_lavinia",
    "ratmalana",
    "kotahena",
    "pettah",
    "bambalapitiya",
    "kollupitiya",
    "cinnamon_gardens",
    "havelock",
    "kiribathgoda",
    "ja_ela",
    "ragama",
    "gampaha",
    "minuwangoda",
    "wattala",
    "hendala",
    "peliyagoda",
    "kelaniya",
    "kandana",
    "biyagama",
    "kolonnawa",
    "kotikawatta",
    "mulleriyawa",
    "avissawella",
    "hanwella",
    "padukka",
    "bandaragama",
    "kalubowila",
    "thalawathugoda",
    "battaramulla",
    "sri_jayawardenepura",
    "kotte",
    "nawala",
    "narahenpita",
    "kirulapone",
  ]

  const businessTermAbbreviations = {
    unlimited: "unltd",
    limited: "ltd",
    "service center": "srvcntr",
    "service centre": "srvcntr",
    "customer care": "custcare",
    "head office": "ho",
    "main office": "mainoff",
    "branch office": "branchoff",
    "super center": "sprcntr",
    "super centre": "sprcntr",
    "mega store": "megastr",
    showroom: "shwrm",
    warehouse: "wrhse",
    distribution: "dist",
    corporate: "corp",
    international: "intl",
    technologies: "tech",
    solutions: "sol",
    services: "srv",
    systems: "sys",
    communications: "comm",
    electronics: "elec",
    appliances: "appl",
    furniture: "furn",
    textiles: "text",
    garments: "garm",
    trading: "trd",
    imports: "imp",
    exports: "exp",
    manufacturing: "mfg",
    industries: "ind",
    enterprises: "ent",
    holdings: "hold",
    group: "grp",
    company: "co",
    corporation: "corp",
    private: "pvt",
    public: "pub",
  }

  // Apply business term abbreviations
  for (const [fullTerm, abbrev] of Object.entries(businessTermAbbreviations)) {
    const regex = new RegExp(`\\b${fullTerm.replace(/\s+/g, "\\s+")}\\b`, "gi")
    slug = slug.replace(regex, ` ${abbrev} `)
  }

  let extractedPlace = ""
  const words = slug
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1)

  for (const word of words) {
    const cleanWord = word.toLowerCase()
    if (sriLankanPlaces.includes(cleanWord)) {
      extractedPlace = cleanWord
      break
    }
    // Check for Colombo with numbers
    if (cleanWord.match(/^colombo\s*\d+$/)) {
      extractedPlace = cleanWord.replace(/\s+/g, "").replace("colombo", "col")
      break
    }
  }

  // Remove common business terms that don't add value
  const removeTerms = [
    "elite",
    "main",
    "outlet",
    "store",
    "shop",
    "center",
    "centre",
    "mega",
    "super",
    "branch",
    "plaza",
    "mall",
    "complex",
    "building",
    "tower",
    "retail",
    "depot",
    "hub",
    "junction",
    "square",
    "place",
    "avenue",
    "road",
    "street",
    "lane",
    "drive",
    "close",
    "gardens",
    "park",
    "the",
    "and",
    "for",
    "with",
    "from",
    "at",
    "in",
    "on",
    "by",
    "of",
  ]

  removeTerms.forEach((term) => {
    const regex = new RegExp(`\\b${term}\\b`, "gi")
    slug = slug.replace(regex, " ")
  })

  let finalParts: string[] = []

  if (extractedBrand) {
    finalParts.push(extractedBrand)
  }

  if (extractedPlace) {
    finalParts.push(extractedPlace)
  }

  // Add abbreviated business terms if any
  const remainingWords = slug
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .filter((word) => !extractedBrand || !word.includes(extractedBrand))
    .filter((word) => !extractedPlace || !word.includes(extractedPlace))
    .filter((word) => !["the", "and", "for", "with", "from", "at", "in", "on", "by"].includes(word.toLowerCase()))

  // Add one meaningful business term if available
  if (remainingWords.length > 0 && finalParts.length < 3) {
    finalParts.push(remainingWords[0])
  }

  // Ensure we have something meaningful
  if (finalParts.length === 0) {
    finalParts = words.slice(0, 2).filter((word) => word.length > 1)
  }

  let result = finalParts.join("").toLowerCase()
  result = result.replace(/[^a-z0-9]/g, "").substring(0, 15) // Increased length for full place names

  if (!result || result.length < 3) {
    result = "loc" + Math.random().toString(36).substring(2, 5)
  }

  return result
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

export async function generateExcelFiles(data: any[], type: "full" | "urls", customPath = "export"): Promise<Blob> {
  let worksheetData: any[]

  if (type === "urls") {
    worksheetData = data.map((url, index) => ({
      Row: index + 1,
      "Original URL": url,
    }))
  } else {
    worksheetData = data
  }

  const worksheet = XLSX.utils.json_to_sheet(worksheetData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, type === "urls" ? "URLs" : "Processed Data")

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })

  return new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
}

export async function generateCSVFile(data: any[], columns: string[]): Promise<Blob> {
  const csvData = data.map((row) => {
    const csvRow: any = {}
    columns.forEach((col) => {
      csvRow[col] = row[col] || ""
    })
    return csvRow
  })

  const worksheet = XLSX.utils.json_to_sheet(csvData)
  const csvBuffer = XLSX.utils.sheet_to_csv(worksheet)

  return new Blob([csvBuffer], { type: "text/csv;charset=utf-8;" })
}
