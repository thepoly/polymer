/**
 * Streaming MariaDB/MySQL dump parser.
 *
 * Reads a .sql.gz dump (gunzipping on the fly) and yields rows for the named
 * tables. Only handles the subset of dump syntax mysqldump emits: extended
 * `INSERT INTO ` <name> ` VALUES (...),(...),...;` statements with
 * single-quoted strings using backslash escape sequences (`\'`, `\"`, `\n`,
 * `\r`, `\t`, `\\`, `\0`, `\Z`).
 *
 * Multi-row inserts can span many lines (long post_content fields) so we
 * accumulate bytes until we have a complete statement (terminated by `;`
 * outside any quoted string) before tokenizing. Strings are tokenized with a
 * simple state machine that respects the escape rules.
 *
 * This is deliberately not a full SQL parser. It assumes mysqldump output and
 * will choke on hand-written SQL.
 */
import fs from 'node:fs'
import zlib from 'node:zlib'
import readline from 'node:readline'

export type SqlValue = string | number | null

/**
 * Stream rows from a gzipped MariaDB dump for a single table.
 *
 * Yields each row as an array of column values in declared order. Caller is
 * responsible for mapping positional values to a named record.
 */
export async function* streamTableRows(
  dumpPath: string,
  tableName: string,
): AsyncGenerator<SqlValue[]> {
  const fileStream = fs.createReadStream(dumpPath)
  const gunzip = zlib.createGunzip()
  fileStream.pipe(gunzip)

  const rl = readline.createInterface({
    input: gunzip,
    crlfDelay: Infinity,
  })

  const insertPrefix = 'INSERT INTO `' + tableName + '` VALUES '
  let pending: string | null = null
  let inString = false
  let escapeNext = false

  for await (const rawLine of rl) {
    if (pending === null) {
      if (!rawLine.startsWith(insertPrefix)) continue
      pending = rawLine
      const scan = scanForStatementEnd(pending, 0, false, false)
      if (scan.complete) {
        for (const row of parseInsertStatement(pending, insertPrefix)) {
          yield row
        }
        pending = null
        inString = false
        escapeNext = false
      } else {
        inString = scan.inString
        escapeNext = scan.escapeNext
      }
    } else {
      const resumeIndex = pending.length
      pending = pending + '\n' + rawLine
      const scan = scanForStatementEnd(pending, resumeIndex, inString, escapeNext)
      if (scan.complete) {
        for (const row of parseInsertStatement(pending, insertPrefix)) {
          yield row
        }
        pending = null
        inString = false
        escapeNext = false
      } else {
        inString = scan.inString
        escapeNext = scan.escapeNext
      }
    }
  }
}

function parseInsertStatement(stmt: string, insertPrefix: string): SqlValue[][] {
  let body = stmt
  if (body.startsWith(insertPrefix)) body = body.slice(insertPrefix.length)
  if (body.endsWith(';')) body = body.slice(0, -1)
  return [...parseInsertValues(body)]
}

/**
 * Scan a partial INSERT statement starting at `from` and figure out whether
 * the statement has hit its terminating `;` (outside of any string).
 *
 * Returns the resulting in-string / escape-next flags so the caller can
 * resume on the next line without rescanning.
 */
function scanForStatementEnd(
  s: string,
  from: number,
  inString: boolean,
  escapeNext: boolean,
): { complete: boolean; inString: boolean; escapeNext: boolean } {
  let i = from
  while (i < s.length) {
    const ch = s.charCodeAt(i)
    if (inString) {
      if (escapeNext) {
        escapeNext = false
      } else if (ch === 92 /* \ */) {
        escapeNext = true
      } else if (ch === 39 /* ' */) {
        inString = false
      }
    } else {
      if (ch === 39 /* ' */) {
        inString = true
        escapeNext = false
      } else if (ch === 59 /* ; */) {
        return { complete: true, inString: false, escapeNext: false }
      }
    }
    i++
  }
  return { complete: false, inString, escapeNext }
}

/**
 * Parse the values portion of an extended INSERT. Input shape:
 *   (v1,v2,...),(v1,v2,...),(v1,v2,...)
 *
 * Yields one array of SqlValue per tuple.
 */
function* parseInsertValues(body: string): Generator<SqlValue[]> {
  let i = 0
  while (i < body.length) {
    while (i < body.length && (body[i] === ' ' || body[i] === ',' || body[i] === '\n' || body[i] === '\r' || body[i] === '\t')) {
      i++
    }
    if (i >= body.length) break
    if (body[i] !== '(') {
      throw new Error(`SQL parse: expected '(' at index ${i}, got ${JSON.stringify(body[i])}`)
    }
    i++
    const row: SqlValue[] = []
    while (i < body.length) {
      while (i < body.length && (body[i] === ' ' || body[i] === '\n' || body[i] === '\r' || body[i] === '\t')) {
        i++
      }
      const ch = body[i]
      if (ch === undefined) throw new Error('SQL parse: truncated tuple')
      if (ch === ')') {
        i++
        break
      }
      if (ch === "'") {
        i++
        let buf = ''
        while (i < body.length) {
          const c = body[i]
          if (c === '\\') {
            const next = body[i + 1]
            if (next === undefined) throw new Error('SQL parse: truncated escape')
            switch (next) {
              case 'n': buf += '\n'; break
              case 'r': buf += '\r'; break
              case 't': buf += '\t'; break
              case '0': buf += '\x00'; break
              case 'Z': buf += '\x1a'; break
              case 'b': buf += '\b'; break
              case "'": buf += "'"; break
              case '"': buf += '"'; break
              case '\\': buf += '\\'; break
              default: buf += next; break
            }
            i += 2
            continue
          }
          if (c === "'") {
            i++
            break
          }
          buf += c
          i++
        }
        row.push(buf)
      } else if (ch === 'N' && body.substr(i, 4) === 'NULL') {
        row.push(null)
        i += 4
      } else if ((ch >= '0' && ch <= '9') || ch === '-' || ch === '+' || ch === '.') {
        let j = i
        while (j < body.length && /[0-9eE.+\-]/.test(body[j])) j++
        const numStr = body.substring(i, j)
        const n = Number(numStr)
        row.push(Number.isFinite(n) ? n : numStr)
        i = j
      } else {
        let j = i
        while (j < body.length && body[j] !== ',' && body[j] !== ')') j++
        row.push(body.substring(i, j).trim())
        i = j
      }
      while (i < body.length && (body[i] === ' ' || body[i] === '\n' || body[i] === '\r' || body[i] === '\t')) {
        i++
      }
      if (body[i] === ',') {
        i++
      } else if (body[i] === ')') {
        i++
        break
      } else {
        throw new Error(`SQL parse: expected ',' or ')' at index ${i}, got ${JSON.stringify(body[i])}`)
      }
    }
    yield row
  }
}
