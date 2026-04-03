import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export async function GET() {
  const scenariosDir = join(process.cwd(), 'benchmark', 'scenarios')
  const files = readdirSync(scenariosDir).filter((f) => f.endsWith('.json'))

  const scenarios = files.map((f) => {
    const content = readFileSync(join(scenariosDir, f), 'utf-8')
    return JSON.parse(content) as {
      id: string
      name: string
      description: string
      messages: Array<{ role: string; content: string }>
    }
  })

  return Response.json({ scenarios })
}
