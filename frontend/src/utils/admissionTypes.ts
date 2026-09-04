import type { AdmissionType } from '../types'

/** Selectable in the Admit-patient and IPD-billing forms - the hospital's current admission categories. */
export const ADMISSION_TYPES: { value: AdmissionType; label: string }[] = [
  { value: 'MedicalManagement', label: 'Medical Management' },
  { value: 'SurgicalManagement', label: 'Surgical Management' },
  { value: 'PostOpCare', label: 'Post OP Care' },
  { value: 'Observation', label: 'Observation' },
  { value: 'Daycare', label: 'Daycare' },
  { value: 'ICU', label: 'ICU' },
  { value: 'NICU', label: 'NICU' },
  { value: 'Delivery', label: 'Delivery' },
  { value: 'PICU', label: 'PICU' },
]

// Covers legacy values too (GeneralMedical/GeneralSurgical/Emergency), still stored on admissions created
// before this list changed, so those older records keep showing a readable label instead of raw enum text.
const LABELS: Record<string, string> = {
  GeneralMedical: 'General Medical',
  GeneralSurgical: 'General Surgical',
  Emergency: 'Emergency',
  ...Object.fromEntries(ADMISSION_TYPES.map((t) => [t.value, t.label])),
}

export function admissionTypeLabel(type: string): string {
  return LABELS[type] ?? type
}
