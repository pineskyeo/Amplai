import { NextResponse } from 'next/server'

// Google Speech-to-Text v1 encoding map
const MIME_TO_ENCODING: Record<string, string> = {
  'audio/mpeg': 'MP3',
  'audio/mp3': 'MP3',
  'audio/wav': 'LINEAR16',
  'audio/wave': 'LINEAR16',
  'audio/x-wav': 'LINEAR16',
  'audio/ogg': 'OGG_OPUS',
  'audio/webm': 'WEBM_OPUS',
  'audio/flac': 'FLAC',
  'audio/x-flac': 'FLAC',
}

function getWavSampleRate(buffer: ArrayBuffer): number {
  // WAV header: bytes 24-27 are sample rate (little-endian uint32)
  const view = new DataView(buffer)
  return view.getUint32(24, true)
}

export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_CLOUD_STT_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'GOOGLE_CLOUD_STT_API_KEY not configured. Add it to .env.local to enable transcription.',
      },
      { status: 503 }
    )
  }

  const formData = await req.formData()
  const audio = formData.get('audio') as File | null
  if (!audio) {
    return NextResponse.json(
      { error: 'No audio file provided' },
      { status: 400 }
    )
  }

  const encoding = MIME_TO_ENCODING[audio.type]
  if (!encoding) {
    return NextResponse.json(
      {
        error: `Unsupported format: ${audio.type}. Please use MP3, WAV, OGG, WEBM, or FLAC.`,
      },
      { status: 400 }
    )
  }

  const bytes = await audio.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')

  const config: Record<string, unknown> = {
    encoding,
    languageCode: 'ko-KR',
    alternativeLanguageCodes: ['en-US'],
    enableAutomaticPunctuation: true,
  }

  // WAV requires explicit sample rate
  if (encoding === 'LINEAR16') {
    config.sampleRateHertz = getWavSampleRate(bytes)
  }

  try {
    const res = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, audio: { content: base64 } }),
      }
    )

    const data = (await res.json()) as {
      results?: Array<{ alternatives: Array<{ transcript: string }> }>
      error?: { message: string }
    }

    if (!res.ok || data.error) {
      return NextResponse.json(
        { error: data.error?.message ?? 'Google Speech-to-Text error' },
        { status: 500 }
      )
    }

    const transcript =
      data.results
        ?.map((r) => r.alternatives[0]?.transcript ?? '')
        .join('\n') ?? ''

    return NextResponse.json({ transcript })
  } catch {
    return NextResponse.json(
      { error: 'Transcription request failed' },
      { status: 500 }
    )
  }
}
