/**
 * Repaints the app's brand-* palette (see index.css's @theme block) in a single hospital-chosen color.
 * Every `bg-brand-*`/`text-brand-*`/`border-brand-*` Tailwind utility across the app compiles to
 * `var(--color-brand-*)` rather than a literal hex, so overriding those custom properties on :root at
 * runtime repaints the whole app with no per-component changes.
 */

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim())
  if (!m) return null
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
}

function rgbToHs(r: number, g: number, b: number): [number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0, s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      default: h = (r - g) / d + 4
    }
    h /= 6
  }
  return [h * 360, s * 100]
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let [r, g, b] = [0, 0, 0]
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// Lightness targets that reproduce the visual spread of the default teal ramp in index.css (50 nearly
// white, 900 dark-but-still-the-hue) - keeps every hospital's ramp readable at the same weights the app was
// designed against (bg-brand-600 buttons with white text, text-brand-600 on white, etc).
const LIGHTNESS_BY_STEP: Record<string, number> = {
  '50': 96, '100': 90, '200': 80, '300': 68, '400': 54, '500': 42, '600': 33, '700': 26, '800': 20, '900': 16,
}
const STEPS = Object.keys(LIGHTNESS_BY_STEP)

/** Pass a hospital's chosen hex color to repaint the app in it; pass null/undefined to restore the default
 * teal (e.g. on logout, or for a hospital that hasn't picked one). */
export function applyHospitalThemeColor(hex: string | null | undefined): void {
  const root = document.documentElement
  if (!hex) {
    STEPS.forEach((step) => root.style.removeProperty(`--color-brand-${step}`))
    return
  }
  const rgb = hexToRgb(hex)
  if (!rgb) return
  const [h, s] = rgbToHs(...rgb)
  const saturation = Math.max(s, 35) // a near-gray pick would otherwise wash out at the light end
  STEPS.forEach((step) => root.style.setProperty(`--color-brand-${step}`, hslToHex(h, saturation, LIGHTNESS_BY_STEP[step])))
}
