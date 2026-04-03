import { getBenchmarkStatus } from '@/lib/benchmark-status'

export async function GET() {
  return Response.json(getBenchmarkStatus())
}
