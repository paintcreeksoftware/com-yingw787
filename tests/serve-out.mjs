import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'out',
)
const port = Number(process.env.PORT ?? 4173)

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
}

async function isFile(filePath) {
  try {
    const stat = await fs.stat(filePath)
    return stat.isFile()
  } catch {
    return false
  }
}

async function resolveFile(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0])
  const relativePath = cleanPath.replace(/^\/+/, '')
  const candidate = path.resolve(rootDir, relativePath)

  if (!candidate.startsWith(rootDir)) {
    return null
  }

  if (await isFile(candidate)) {
    return candidate
  }

  const indexFile = path.join(candidate, 'index.html')
  if (await isFile(indexFile)) {
    return indexFile
  }

  const htmlFile = `${candidate}.html`
  if (await isFile(htmlFile)) {
    return htmlFile
  }

  return null
}

const server = http.createServer(async (req, res) => {
  const method = req.method ?? 'GET'
  if (method !== 'GET' && method !== 'HEAD') {
    res.writeHead(405)
    res.end()
    return
  }

  const filePath = await resolveFile(req.url ?? '/')
  if (filePath) {
    const ext = path.extname(filePath).toLowerCase()
    const contentType = mimeTypes[ext] ?? 'application/octet-stream'
    const body = await fs.readFile(filePath)
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(method === 'HEAD' ? undefined : body)
    return
  }

  const notFoundPath = path.join(rootDir, '404.html')
  if (await isFile(notFoundPath)) {
    const body = await fs.readFile(notFoundPath)
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(method === 'HEAD' ? undefined : body)
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end(method === 'HEAD' ? undefined : 'Not Found')
})

server.listen(port, '127.0.0.1')
