export const formatDate = (value?: string): string => {
  if (!value) return "-"
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

// Convert various date strings to an <input type="date"> value (YYYY-MM-DD)
export const toDateInputValue = (input?: string | number): string => {
  if (input == null || input === '') return ''
  const pad = (n: number) => String(n).padStart(2, '0')

  // If already YYYY-MM-DD, return as-is
  const asString = String(input)
  if (/^\d{4}-\d{2}-\d{2}$/.test(asString)) return asString

  // Try to parse with Date
  const d = new Date(asString)
  if (isNaN(d.getTime())) return ''
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  return `${yyyy}-${mm}-${dd}`
}

// From date input value back to a string to send to API (keep YYYY-MM-DD)
export const fromDateInputValue = (val?: string): string | undefined => {
  if (!val) return undefined
  // Keep as YYYY-MM-DD (most APIs accept DATE columns like this)
  return val
}
