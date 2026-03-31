import { getConversationStats, getUsageLog } from '@/lib/token-tracker'

export async function GET() {
  return Response.json({
    stats: getConversationStats(),
    recentUsage: getUsageLog().slice(-20),
  })
}
