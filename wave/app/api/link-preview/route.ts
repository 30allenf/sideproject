import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'No URL' }, { status: 400 })

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Wave-Bot/1.0 (link preview)' },
    })
    clearTimeout(timeout)

    const html = await res.text()

    const getMeta = (prop: string) => {
      const match = html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*?)["']`, 'i'))
        ?? html.match(new RegExp(`<meta[^>]*content=["']([^"']*?)["'][^>]*(?:property|name)=["']${prop}["']`, 'i'))
      return match?.[1] ?? ''
    }

    const title = getMeta('og:title') || getMeta('twitter:title') || (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? '')
    const description = getMeta('og:description') || getMeta('twitter:description') || getMeta('description') || ''
    const imageUrl = getMeta('og:image') || getMeta('twitter:image') || ''

    return NextResponse.json({ url, title: title.slice(0, 120), description: description.slice(0, 240), imageUrl })
  } catch {
    return NextResponse.json({ url, title: '', description: '', imageUrl: '' })
  }
}
