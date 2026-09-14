import { apiClient, extractErrorMessage } from '../../api/client'
import type { AppThunk } from '../../app/store'
import type { ChecklistItemDto, SurgeryAnesthesiaRecordDto, SurgeryChecklistDto, SurgeryNursingNoteDto, SurgeryRecoveryRecordDto } from '../../types'

export interface OtRecordsState {
  checklists: SurgeryChecklistDto[]
  anesthesiaRecords: SurgeryAnesthesiaRecordDto[]
  recoveryRecords: SurgeryRecoveryRecordDto[]
  nursingNotes: SurgeryNursingNoteDto[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: OtRecordsState = { checklists: [], anesthesiaRecords: [], recoveryRecords: [], nursingNotes: [], status: 'idle', error: null }

const START = 'otRecords/start'
const CHECKLISTS_SUCCESS = 'otRecords/checklistsSuccess'
const ANESTHESIA_SUCCESS = 'otRecords/anesthesiaSuccess'
const RECOVERY_SUCCESS = 'otRecords/recoverySuccess'
const NURSING_NOTES_SUCCESS = 'otRecords/nursingNotesSuccess'
const FAILURE = 'otRecords/failure'

type OtRecordsAction =
  | { type: typeof START }
  | { type: typeof CHECKLISTS_SUCCESS; payload: SurgeryChecklistDto[] }
  | { type: typeof ANESTHESIA_SUCCESS; payload: SurgeryAnesthesiaRecordDto[] }
  | { type: typeof RECOVERY_SUCCESS; payload: SurgeryRecoveryRecordDto[] }
  | { type: typeof NURSING_NOTES_SUCCESS; payload: SurgeryNursingNoteDto[] }
  | { type: typeof FAILURE; payload: string }

export function otRecordsReducer(state = initialState, action: OtRecordsAction): OtRecordsState {
  switch (action.type) {
    case START: return { ...state, status: 'loading', error: null }
    case CHECKLISTS_SUCCESS: return { ...state, status: 'succeeded', checklists: action.payload }
    case ANESTHESIA_SUCCESS: return { ...state, status: 'succeeded', anesthesiaRecords: action.payload }
    case RECOVERY_SUCCESS: return { ...state, status: 'succeeded', recoveryRecords: action.payload }
    case NURSING_NOTES_SUCCESS: return { ...state, status: 'succeeded', nursingNotes: action.payload }
    case FAILURE: return { ...state, status: 'failed', error: action.payload }
    default: return state
  }
}

export const fetchChecklists = (surgeryId: number): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch({ type: START })
  try {
    const { data } = await apiClient.get<SurgeryChecklistDto[]>(`/operationtheatre/${surgeryId}/checklists`)
    dispatch({ type: CHECKLISTS_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export const saveChecklist = (surgeryId: number, checklistType: string, items: ChecklistItemDto[], remarks?: string): AppThunk<Promise<void>> =>
  async (dispatch) => {
    try {
      await apiClient.post('/operationtheatre/checklists', { surgeryId, checklistType, items, remarks })
      await dispatch(fetchChecklists(surgeryId))
    } catch (error) {
      dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
      throw error
    }
  }

export const fetchAnesthesiaRecords = (surgeryId: number): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch({ type: START })
  try {
    const { data } = await apiClient.get<SurgeryAnesthesiaRecordDto[]>(`/operationtheatre/${surgeryId}/anesthesia-records`)
    dispatch({ type: ANESTHESIA_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export interface RecordAnesthesiaPayload {
  surgeryId: number
  anesthesiaType?: string
  bloodPressure?: string
  pulseRate?: number
  spO2?: number
  temperature?: number
  remarks?: string
}

export const recordAnesthesia = (payload: RecordAnesthesiaPayload): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    await apiClient.post('/operationtheatre/anesthesia-records', payload)
    await dispatch(fetchAnesthesiaRecords(payload.surgeryId))
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}

export const fetchRecoveryRecords = (surgeryId: number): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch({ type: START })
  try {
    const { data } = await apiClient.get<SurgeryRecoveryRecordDto[]>(`/operationtheatre/${surgeryId}/recovery-records`)
    dispatch({ type: RECOVERY_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export interface RecordRecoveryPayload {
  surgeryId: number
  activity: number
  respiration: number
  circulation: number
  consciousness: number
  oxygenSaturation: number
  bloodPressure?: string
  pulse?: number
  spO2?: number
  remarks?: string
}

export const recordRecovery = (payload: RecordRecoveryPayload): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    await apiClient.post('/operationtheatre/recovery-records', payload)
    await dispatch(fetchRecoveryRecords(payload.surgeryId))
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}

export const dischargeFromRecovery = (recordId: number, surgeryId: number): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    await apiClient.put(`/operationtheatre/recovery-records/${recordId}/discharge`)
    await dispatch(fetchRecoveryRecords(surgeryId))
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}

// Nursing Notes - append-only, stylus-capable (see HandwritingField) log kept against a scheduled surgery.
export const fetchNursingNotes = (surgeryId: number): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch({ type: START })
  try {
    const { data } = await apiClient.get<SurgeryNursingNoteDto[]>(`/operationtheatre/${surgeryId}/nursing-notes`)
    dispatch({ type: NURSING_NOTES_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export const addNursingNote = (surgeryId: number, noteText: string): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    await apiClient.post('/operationtheatre/nursing-notes', { surgeryId, noteText })
    await dispatch(fetchNursingNotes(surgeryId))
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}
