import { getBenchmarkStatus } from '@/lib/benchmark-status'

export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json(getBenchmarkStatus())
}
