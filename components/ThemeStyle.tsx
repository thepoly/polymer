import type { ThemeColors } from '@/lib/getTheme'

type Props = {
  lightMode: ThemeColors
  darkMode: ThemeColors
}

// Allow only valid CSS color values: hex, rgb(), rgba(), hsl(), hsla(), named colors.
// Strips anything that could be used for CSS injection (semicolons, braces, etc).
function sanitizeCssColor(value: string): string {
  const trimmed = value.trim()
  // Allow hex, rgb/rgba/hsl/hsla functions, and simple alphanumeric color names
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return trimmed
  if (/^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(,\s*[\d.]+\s*)?\)$/.test(trimmed)) return trimmed
  if (/^hsla?\(\s*[\d.]+\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*(,\s*[\d.]+\s*)?\)$/.test(trimmed)) return trimmed
  if (/^[a-zA-Z]+$/.test(trimmed)) return trimmed
  // Unrecognized format — return empty string so the CSS variable gets no value
  return ''
}

function colorVars(colors: ThemeColors): string {
  const lines: string[] = [
    ['--background', colors.background],
    ['--foreground', colors.foreground],
    ['--foreground-muted', colors.foregroundMuted],
    ['--accent-color', colors.accent],
    ['--border-color', colors.borderColor],
    ['--rule-color', colors.ruleColor],
    ['--rule-strong-color', colors.ruleStrongColor],
    ['--header-top-bg', colors.headerTopBg],
    ['--header-top-text', colors.headerTopText],
    ['--header-nav-bg', colors.headerNavBg],
    ['--header-nav-text', colors.headerNavText],
    ['--header-border', colors.headerBorder],
  ]
    .map(([prop, val]) => {
      const safe = sanitizeCssColor(val)
      return safe ? `  ${prop}: ${safe};` : null
    })
    .filter(Boolean) as string[]

  return lines.join('\n')
}

export default function ThemeStyle({ lightMode, darkMode }: Props) {
  const css = `:root {\n${colorVars(lightMode)}\n}\nhtml.dark {\n${colorVars(darkMode)}\n}`
  // Values are sanitized above — only valid CSS color syntax passes through.
  // eslint-disable-next-line react/no-danger
  return <style dangerouslySetInnerHTML={{ __html: css }} />
}
