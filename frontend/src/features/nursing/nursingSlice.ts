import { apiClient, extractErrorMessage } from '../../api/client'
import type { AppThunk } from '../../app/store'
import type { NursingChartDto } from '../../types'

export interface NursingState {
  chart: NursingChartDto[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: NursingState = { chart: [], status: 'idle', error: null }

const START = 'nursing/start'
const CHART_SUCCESS = 'nursing/chartSuccess'
const FAILURE = 'nursing/failure'

type NursingAction =
  | { type: typeof START }
  | { type: typeof CHART_SUCCESS; payload: NursingChartDto[] }
  | { type: typeof FAILURE; payload: string }

export function nursingReducer(state = initialState, action: NursingAction): NursingState {
  switch (action.type) {
    case START: return { ...state, status: 'loading', error: null }
    case CHART_SUCCESS: return { ...state, status: 'succeeded', chart: action.payload }
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
}): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    await apiClient.post(`/nursing/admissions/${admissionId}/vitals`, payload)
    await dispatch(fetchNursingChart(admissionId))
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}
