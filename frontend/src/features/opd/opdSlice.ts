import { apiClient, extractErrorMessage } from '../../api/client'
import type { AppThunk } from '../../app/store'
import type { OpdVisitDto } from '../../types'

export interface OpdState {
  todaysVisits: OpdVisitDto[]
  current: OpdVisitDto | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: OpdState = { todaysVisits: [], current: null, status: 'idle', error: null }

const START = 'opd/start'
const LIST_SUCCESS = 'opd/listSuccess'
const ONE_SUCCESS = 'opd/oneSuccess'
const FAILURE = 'opd/failure'

type OpdAction =
  | { type: typeof START }
  | { type: typeof LIST_SUCCESS; payload: OpdVisitDto[] }
  | { type: typeof ONE_SUCCESS; payload: OpdVisitDto }
  | { type: typeof FAILURE; payload: string }

export function opdReducer(state = initialState, action: OpdAction): OpdState {
  switch (action.type) {
    case START: return { ...state, status: 'loading', error: null }
    case LIST_SUCCESS: return { ...state, status: 'succeeded', todaysVisits: action.payload }
    case ONE_SUCCESS: return { ...state, status: 'succeeded', current: action.payload }
    case FAILURE: return { ...state, status: 'failed', error: action.payload }
    default: return state
  }
}

export const fetchDoctorVisits = (doctorId: number, date?: string): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch({ type: START })
  try {
    const { data } = await apiClient.get<OpdVisitDto[]>(`/opdvisits/doctor/${doctorId}`, { params: { date } })
    dispatch({ type: LIST_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export const fetchPatientVisits = (patientId: number): AppThunk<Promise<OpdVisitDto[]>> => async (dispatch) => {
  try {
    const { data } = await apiClient.get<OpdVisitDto[]>(`/opdvisits/patient/${patientId}`)
    return data
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}

export const startConsultation = (appointmentId: number): AppThunk<Promise<OpdVisitDto>> => async (dispatch) => {
  try {
    const { data } = await apiClient.post<OpdVisitDto>('/opdvisits/start-consultation', { appointmentId })
    dispatch({ type: ONE_SUCCESS, payload: data })
    return data
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}

export const completeConsultation = (id: number, payload: {
  symptoms?: string; diagnosis: string; clinicalNotes?: string; doctorNotes?: string
  admissionRecommended: boolean; referredToDepartmentId?: number; transferNotes?: string
}): AppThunk<Promise<OpdVisitDto>> => async (dispatch) => {
  try {
    const { data } = await apiClient.put<OpdVisitDto>(`/opdvisits/${id}/complete-consultation`, payload)
    dispatch({ type: ONE_SUCCESS, payload: data })
    return data
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}
