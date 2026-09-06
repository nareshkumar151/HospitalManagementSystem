/** Item labels for the OT paper checklists, digitized as a checkbox list per HMS.Domain.Entities.SurgeryChecklist. */
export const CHECKLIST_TYPES = ['PreOp', 'InstrumentSwabCount', 'OTCleaning'] as const
export type ChecklistType = (typeof CHECKLIST_TYPES)[number]

export const CHECKLIST_LABELS: Record<ChecklistType, string> = {
  PreOp: 'Pre-Operative Checklist',
  InstrumentSwabCount: 'Operative Instruments & Swab Check Sheet',
  OTCleaning: 'OT Cleaning Checklist',
}

/** Default item set used to start a fresh checklist of each type - staff can still tick/untick and add remarks. */
export const CHECKLIST_DEFAULT_ITEMS: Record<ChecklistType, string[]> = {
  PreOp: [
    'Consent for surgery signed',
    'Consent for anesthesia signed',
    'NPO (nil by mouth) status confirmed',
    'Surgical site marked',
    'Pre-op investigations reviewed',
    'Blood arranged, if required',
    'Dentures / jewelry / prosthesis removed',
    'Identification band checked',
    'Allergies documented and communicated',
    'Pre-op vitals recorded',
  ],
  InstrumentSwabCount: [
    'Instrument count before incision',
    'Sponge / swab count before incision',
    'Needle count before incision',
    'Instrument count before closure',
    'Sponge / swab count before closure',
    'Needle count before closure',
    'Final count confirmed correct and documented',
  ],
  OTCleaning: [
    'OT table cleaned and disinfected',
    'Anesthesia machine cleaned',
    'Suction apparatus cleaned',
    'OT floor mopped with disinfectant',
    'Biomedical waste segregated and removed',
    'OT lights and equipment wiped down',
    'OT ready for next case',
  ],
}

/** Aldrete Score components for the Post-Op Recovery Room Record - each scored 0-2, max total 10. */
export const ALDRETE_COMPONENTS: { key: 'activity' | 'respiration' | 'circulation' | 'consciousness' | 'oxygenSaturation'; label: string; options: [string, string, string] }[] = [
  { key: 'activity', label: 'Activity', options: ['Unable to move', 'Moves 2 limbs', 'Moves 4 limbs'] },
  { key: 'respiration', label: 'Respiration', options: ['Apneic', 'Dyspnea / shallow', 'Breathes deeply / coughs'] },
  { key: 'circulation', label: 'Circulation (BP vs pre-op)', options: ['± >50%', '± 20-50%', '± 20%'] },
  { key: 'consciousness', label: 'Consciousness', options: ['Not responding', 'Arousable', 'Fully awake'] },
  { key: 'oxygenSaturation', label: 'O2 Saturation', options: ['<90% with O2', '>90% with O2', '>92% on room air'] },
]
