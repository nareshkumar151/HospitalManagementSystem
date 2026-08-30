import { apiClient, extractErrorMessage } from '../../api/client'
import type { AppThunk } from '../../app/store'
import type { PrescriptionDto } from '../../types'

export interface PrescriptionsState {
  byPatient: PrescriptionDto[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: PrescriptionsState = { byPatient: [], status: 'idle', error: null }

const START = 'prescriptions/start'
const LIST_SUCCESS = 'prescriptions/listSuccess'
const FAILURE = 'prescriptions/failure'

type PrescriptionsAction =
  | { type: typeof START }
  | { type: typeof LIST_SUCCESS; payload: PrescriptionDto[] }
  | { type: typeof FAILURE; payload: string }

export function prescriptionsReducer(state = initialState, action: PrescriptionsAction): PrescriptionsState {
  switch (action.type) {
    case START: return { ...state, status: 'loading', error: null }
    case LIST_SUCCESS: return { ...state, status: 'succeeded', byPatient: action.payload }
    case FAILURE: return { ...state, status: 'failed', error: action.payload }
    default: return state
  }
}

export const fetchPrescriptionsByPatient = (patientId: number): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch({ type: START })
  try {
    const { data } = await apiClient.get<PrescriptionDto[]>(`/prescriptions/patient/${patientId}`)
    dispatch({ type: LIST_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export const createPrescription = (payload: {
  patientId: number; opdVisitId?: number; ipdAdmissionId?: number
  items: { medicineId: number; dosage: string; frequency: string; durationDays: number; instructions?: string }[]
}): AppThunk<Promise<PrescriptionDto>> => async (dispatch) => {
  try {
    const { data } = await apiClient.post<PrescriptionDto>('/prescriptions', payload)
    return data
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}
