import { apiClient, extractErrorMessage } from '../../api/client'
import type { AppThunk } from '../../app/store'
import type { ConsentRecordDto, ConsentContext, ConsentDecision } from '../../types'

export interface ConsentsState {
  patientHistory: ConsentRecordDto[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: ConsentsState = { patientHistory: [], status: 'idle', error: null }

const START = 'consents/start'
const HISTORY_SUCCESS = 'consents/historySuccess'
const FAILURE = 'consents/failure'

type ConsentsAction =
  | { type: typeof START }
  | { type: typeof HISTORY_SUCCESS; payload: ConsentRecordDto[] }
  | { type: typeof FAILURE; payload: string }

export function consentsReducer(state = initialState, action: ConsentsAction): ConsentsState {
  switch (action.type) {
    case START: return { ...state, status: 'loading', error: null }
    case HISTORY_SUCCESS: return { ...state, status: 'succeeded', patientHistory: action.payload }
    case FAILURE: return { ...state, status: 'failed', error: action.payload }
    default: return state
  }
}

export const fetchPatientConsents = (patientId: number): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch({ type: START })
  try {
    const { data } = await apiClient.get<ConsentRecordDto[]>(`/consents/patient/${patientId}`)
    dispatch({ type: HISTORY_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export interface CaptureConsentPayload {
  patientId: number
  templateId: number
  context: ConsentContext
  contextId?: number | null
  procedureName?: string | null
  decision: ConsentDecision
  signedByName: string
  relationToPatient?: string | null
  witnessName?: string | null
  witnessUserId?: number | null
  refusalReason?: string | null
  notes?: string | null
}

export const captureConsent = (payload: CaptureConsentPayload): AppThunk<Promise<ConsentRecordDto>> => async (dispatch) => {
  try {
    const { data } = await apiClient.post<ConsentRecordDto>('/consents', payload)
    await dispatch(fetchPatientConsents(payload.patientId))
    return data
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}
