import { apiClient, extractErrorMessage } from '../../api/client'
import type { AppThunk } from '../../app/store'
import type { NursingChartDto } from '../../types'

export interface NursingState {
  chart: NursingChartDto[]
  appointmentVitals: NursingChartDto | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: NursingState = { chart: [], appointmentVitals: null, status: 'idle', error: null }

const START = 'nursing/start'
const CHART_SUCCESS = 'nursing/chartSuccess'
const APPOINTMENT_VITALS_SUCCESS = 'nursing/appointmentVitalsSuccess'
const FAILURE = 'nursing/failure'

type NursingAction =
  | { type: typeof START }
  | { type: typeof CHART_SUCCESS; payload: NursingChartDto[] }
  | { type: typeof APPOINTMENT_VITALS_SUCCESS; payload: NursingChartDto | null }
  | { type: typeof FAILURE; payload: string }

export function nursingReducer(state = initialState, action: NursingAction): NursingState {
  switch (action.type) {
    case START: return { ...state, status: 'loading', error: null }
    case CHART_SUCCESS: return { ...state, status: 'succeeded', chart: action.payload }
    case APPOINTMENT_VITALS_SUCCESS: return { ...state, status: 'succeeded', appointmentVitals: action.payload }
    case FAILURE: return { ...state, status: 'failed', error: action.payload }
    default: return state
  }
}

export const fetchNursingChart = (admissionId: number): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch({ type: START })
  try {
    const { data } = await apiClient.get<NursingChartDto[]>(`/nursing/admissions/${admissionId}/vitals`)
    dispatch({ type: CHART_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export const recordVitals = (admissionId: number, payload: {
  temperature?: number; pulse?: number; bloodPressure?: string; oxygen?: number; weight?: number
  sugarLevel?: number; medicationSchedule?: string; dailyNotes?: string; patientMonitoring?: string
  respiratoryRate?: number; painScore?: number; consciousness?: string
}): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    await apiClient.post(`/nursing/admissions/${admissionId}/vitals`, payload)
    await dispatch(fetchNursingChart(admissionId))
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}

// Appointment-linked vitals: a single editable snapshot per appointment (see sp_NursingChart_UpsertForAppointment) -
// used from the Appointments page rather than the IPD ward chart.
export const fetchAppointmentVitals = (appointmentId: number): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch({ type: START })
  try {
    const { data } = await apiClient.get<NursingChartDto | null>(`/nursing/appointments/${appointmentId}/vitals`)
    dispatch({ type: APPOINTMENT_VITALS_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export const recordAppointmentVitals = (appointmentId: number, payload: {
  temperature?: number; pulse?: number; bloodPressure?: string; oxygen?: number; weight?: number
  sugarLevel?: number; medicationSchedule?: string; dailyNotes?: string; patientMonitoring?: string
  respiratoryRate?: number; painScore?: number; consciousness?: string
}): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    const { data } = await apiClient.post<NursingChartDto>(`/nursing/appointments/${appointmentId}/vitals`, payload)
    dispatch({ type: APPOINTMENT_VITALS_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}
