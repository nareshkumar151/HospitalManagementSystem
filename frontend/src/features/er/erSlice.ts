import { apiClient, extractErrorMessage } from '../../api/client'
import type { AppThunk } from '../../app/store'
import type { ErDoctorAssessmentDto, ErNurseAssessmentDto, ErVisitDto } from '../../types'

export interface ErState {
  active: ErVisitDto[]
  current: ErVisitDto | null
  nurseAssessments: ErNurseAssessmentDto[]
  doctorAssessments: ErDoctorAssessmentDto[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: ErState = { active: [], current: null, nurseAssessments: [], doctorAssessments: [], status: 'idle', error: null }

const START = 'er/start'
const ACTIVE_SUCCESS = 'er/activeSuccess'
const VISIT_SUCCESS = 'er/visitSuccess'
const NURSE_SUCCESS = 'er/nurseSuccess'
const DOCTOR_SUCCESS = 'er/doctorSuccess'
const FAILURE = 'er/failure'

type ErAction =
  | { type: typeof START }
  | { type: typeof ACTIVE_SUCCESS; payload: ErVisitDto[] }
  | { type: typeof VISIT_SUCCESS; payload: ErVisitDto }
  | { type: typeof NURSE_SUCCESS; payload: ErNurseAssessmentDto[] }
  | { type: typeof DOCTOR_SUCCESS; payload: ErDoctorAssessmentDto[] }
  | { type: typeof FAILURE; payload: string }

export function erReducer(state = initialState, action: ErAction): ErState {
  switch (action.type) {
    case START: return { ...state, status: 'loading', error: null }
    case ACTIVE_SUCCESS: return { ...state, status: 'succeeded', active: action.payload }
    case VISIT_SUCCESS: return { ...state, status: 'succeeded', current: action.payload }
    case NURSE_SUCCESS: return { ...state, status: 'succeeded', nurseAssessments: action.payload }
    case DOCTOR_SUCCESS: return { ...state, status: 'succeeded', doctorAssessments: action.payload }
    case FAILURE: return { ...state, status: 'failed', error: action.payload }
    default: return state
  }
}

export const fetchActiveErVisits = (): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch({ type: START })
  try {
    const { data } = await apiClient.get<ErVisitDto[]>('/er/visits/active')
    dispatch({ type: ACTIVE_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export const registerErVisit = (payload: {
  patientId: number; modeOfArrival?: string; broughtBy?: string; chiefComplaint: string; triageCategory: string
}): AppThunk<Promise<ErVisitDto>> => async (dispatch) => {
  try {
    const { data } = await apiClient.post<ErVisitDto>('/er/visits', payload)
    await dispatch(fetchActiveErVisits())
    return data
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}

export const fetchErVisit = (id: number): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    const { data } = await apiClient.get<ErVisitDto>(`/er/visits/${id}`)
    dispatch({ type: VISIT_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export const fetchErNurseAssessments = (visitId: number): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    const { data } = await apiClient.get<ErNurseAssessmentDto[]>(`/er/visits/${visitId}/nurse-assessments`)
    dispatch({ type: NURSE_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export const recordErNurseAssessment = (visitId: number, payload: {
  bloodPressure?: string; pulse?: number; temperature?: number; respiratoryRate?: number; spO2?: number
  painScore?: number; gcsTotal?: number; initialActions?: string; remarks?: string
}): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    await apiClient.post(`/er/visits/${visitId}/nurse-assessment`, payload)
    await dispatch(fetchErNurseAssessments(visitId))
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}

export const fetchErDoctorAssessments = (visitId: number): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    const { data } = await apiClient.get<ErDoctorAssessmentDto[]>(`/er/visits/${visitId}/doctor-assessments`)
    dispatch({ type: DOCTOR_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export const recordErDoctorAssessment = (visitId: number, payload: {
  historyOfPresentIllness?: string; examinationFindings?: string; provisionalDiagnosis?: string
  treatmentGiven?: string; disposition: string; remarks?: string
}): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    await apiClient.post(`/er/visits/${visitId}/doctor-assessment`, payload)
    await dispatch(fetchErDoctorAssessments(visitId))
    await dispatch(fetchErVisit(visitId))
    await dispatch(fetchActiveErVisits())
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}

export const updateErDisposition = (visitId: number, status: string): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    await apiClient.put(`/er/visits/${visitId}/disposition`, { status })
    await dispatch(fetchActiveErVisits())
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}
