import { apiClient, extractErrorMessage } from '../../api/client'
import type { AppThunk } from '../../app/store'
import type { DashboardSummaryDto } from '../../types'

export interface DashboardState {
  summary: DashboardSummaryDto | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: DashboardState = { summary: null, status: 'idle', error: null }

const START = 'dashboard/start'
const SUCCESS = 'dashboard/success'
const FAILURE = 'dashboard/failure'

type DashboardAction =
  | { type: typeof START }
  | { type: typeof SUCCESS; payload: DashboardSummaryDto }
  | { type: typeof FAILURE; payload: string }

export function dashboardReducer(state = initialState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case START: return { ...state, status: 'loading', error: null }
    case SUCCESS: return { ...state, status: 'succeeded', summary: action.payload }
    case FAILURE: return { ...state, status: 'failed', error: action.payload }
    default: return state
  }
}

export const fetchDashboardSummary = (): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch({ type: START })
  try {
    const { data } = await apiClient.get<DashboardSummaryDto>('/dashboard/summary')
    dispatch({ type: SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}
