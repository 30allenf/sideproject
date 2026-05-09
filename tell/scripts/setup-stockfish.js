#!/usr/bin/env node
/**
 * Copies Stockfish WASM files from node_modules into public/stockfish/
 * Run: pnpm setup:stockfish
 */
const fs   = require('fs')
const path = require('path')

const SRC_DIR  = path.join(__dirname, '..', 'node_modules', 'stockfish', 'src')
const DEST_DIR = path.join(__dirname, '..', 'public', 'stockfish')

if (!fs.existsSync(DEST_DIR)) fs.mkdirSync(DEST_DIR, { recursive: true })

const candidates = [
  'stockfish-nnue-16-single.js',
  'stockfish-nnue-16.js',
  'stockfish.js',
]

let copied = false
for (const file of candidates) {
  const src = path.join(SRC_DIR, file)
  if (fs.existsSync(src)) {
    const dest = path.join(DEST_DIR, 'stockfish-worker.js')
    fs.copyFileSync(src, dest)
    console.log(`✓ Copied ${file} → public/stockfish/stockfish-worker.js`)
    copied = true

    // Also copy WASM if present
    const wasm = src.replace('.js', '.wasm')
    if (fs.existsSync(wasm)) {
      fs.copyFileSync(wasm, path.join(DEST_DIR, 'stockfish-worker.wasm'))
      console.log(`✓ Copied WASM binary`)
    }
    break
  }
}

if (!copied) {
  console.error('✗ Could not find Stockfish JS file. Run `pnpm install` first.')
  process.exit(1)
}
