
export function extractJson(text: string): string {
  const cleaned = text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim()

  const start = cleaned.indexOf('{')

  if (start === -1) {
    throw new Error('No JSON object found')
  }

  let depth = 0

  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === '{') depth++

    if (cleaned[i] === '}') {
      depth--

      if (depth === 0) {
        return cleaned.slice(start, i + 1)
      }
    }
  }

  throw new Error('Incomplete JSON')
}