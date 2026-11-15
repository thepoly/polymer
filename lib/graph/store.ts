import fs from 'node:fs'
import path from 'node:path'
import campusCrime from './seed/campus-crime.json'
import rareEarths from './seed/rare-earths.json'
import sexualViolence from './seed/sexual-violence.json'
import { cleanSettings } from './palette.js'

// Graph files: <GRAPH_DIR>/<name>.json, where the name is a short slug. Production sets
// GRAPH_DIR to /var/www/polymer/shared/graphs, which persists across deploys. Never point
// it inside /var/www/polymer-media: Payload serves every file under there publicly.

export const GRAPH_DIR = process.env.GRAPH_DIR || path.join(process.cwd(), '.graphs')

// The editor starts with the graphs made before it was hosted.
const SEED: Record<string, unknown> = {
  'campus-crime': campusCrime,
  'rare-earths': rareEarths,
  'sexual-violence': sexualViolence,
}

export type GraphFile = Record<string, unknown>

export const validName = (name: unknown): name is string =>
  typeof name === 'string' && /^[a-z0-9][a-z0-9-]{0,79}$/.test(name)

function ensureDir() {
  if (fs.existsSync(GRAPH_DIR)) return
  fs.mkdirSync(GRAPH_DIR, { recursive: true })
  for (const [name, graph] of Object.entries(SEED)) {
    fs.writeFileSync(path.join(GRAPH_DIR, `${name}.json`), formatJson(graph) + '\n')
  }
}

function graphPath(name: string) {
  if (!validName(name)) throw new Error(`"${name}" isn't a usable graph name. Use lowercase letters, numbers and dashes.`)
  return path.join(GRAPH_DIR, `${name}.json`)
}

const readJson = (file: string) => JSON.parse(fs.readFileSync(file, 'utf8')) as GraphFile

export function graphExists(name: string) {
  ensureDir()
  return validName(name) && fs.existsSync(graphPath(name))
}

export function listGraphs() {
  ensureDir()
  return fs
    .readdirSync(GRAPH_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => {
      const name = path.basename(f, '.json')
      const file = path.join(GRAPH_DIR, f)
      try {
        const g = readJson(file)
        return { name, title: g.title ?? '', kind: g.kind ?? 'ring', updated: fs.statSync(file).mtimeMs }
      } catch {
        return { name, title: '(unreadable file)', kind: '', updated: 0 }
      }
    })
}

export function readGraph(name: string): GraphFile {
  ensureDir()
  const file = graphPath(name)
  if (!fs.existsSync(file)) throw new Error(`No graph called "${name}".`)
  return readJson(file)
}

export function writeGraph(name: string, graph: unknown) {
  ensureDir()
  fs.writeFileSync(graphPath(name), formatJson(graph) + '\n')
}

export function deleteGraph(name: string) {
  fs.rmSync(graphPath(name))
}

/**
 * A graph as a page should be handed it: the file without what only the editor uses. The
 * editor's sheet can hold working notes and figures that were never meant to be published.
 */
export function displayGraph(name: string): GraphFile {
  const graph = { ...readGraph(name) }
  delete graph.sheet
  return graph
}

// ── Settings ──────────────────────────────────────────────
//
// One file for every graph: the brand colors, set at /graph/settings. It sits in a folder
// of its own so it's never taken for a graph. With no file, the built-in colors apply.

export type GraphSettings = { colors?: { name: string; base: string }[] }

const SETTINGS_FILE = path.join(GRAPH_DIR, 'settings', 'graph-settings.json')

export function readSettings(): GraphSettings {
  try {
    return cleanSettings(JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'))) as GraphSettings
  } catch {
    // No file yet, or one that can't be read: the built-in colors.
    return cleanSettings(null) as GraphSettings
  }
}

/** Checks and saves the settings, returning them as stored. Throws with a message a person can act on. */
export function writeSettings(input: unknown): GraphSettings {
  const settings = cleanSettings(input) as GraphSettings
  ensureDir()
  fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true })
  fs.writeFileSync(SETTINGS_FILE, formatJson(settings) + '\n')
  return settings
}

/**
 * JSON the way the hand-written graph files look: anything short enough stays on one
 * line, so each data row reads as a row.
 */
export function formatJson(value: unknown, indent = '', width = 100, lead = 0): string {
  const one = oneLine(value)
  if (value === null || typeof value !== 'object' || indent.length + lead + one.length <= width) return one
  const inner = indent + '  '
  if (Array.isArray(value)) {
    return `[\n${value.map((v) => inner + formatJson(v, inner, width)).join(',\n')}\n${indent}]`
  }
  const entries = Object.entries(value).filter(([, v]) => v !== undefined)
  const lines = entries.map(
    ([k, v]) => `${inner}${JSON.stringify(k)}: ${formatJson(v, inner, width, JSON.stringify(k).length + 2)}`,
  )
  return `{\n${lines.join(',\n')}\n${indent}}`
}

function oneLine(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(oneLine).join(', ')}]`
  const entries = Object.entries(value).filter(([, v]) => v !== undefined)
  return entries.length ? `{ ${entries.map(([k, v]) => `${JSON.stringify(k)}: ${oneLine(v)}`).join(', ')} }` : '{}'
}
