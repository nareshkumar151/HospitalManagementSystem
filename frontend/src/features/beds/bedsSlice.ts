import { apiClient, extractErrorMessage } from '../../api/client'
import type { AppThunk } from '../../app/store'
import type { BedDto, BedOccupancySummaryDto, RoomDto, WardDto } from '../../types'

export interface BedsState {
  wards: WardDto[]
  rooms: RoomDto[]
  beds: BedDto[]
  occupancy: BedOccupancySummaryDto | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: BedsState = { wards: [], rooms: [], beds: [], occupancy: null, status: 'idle', error: null }

const START = 'beds/start'
const WARDS_SUCCESS = 'beds/wardsSuccess'
const BEDS_SUCCESS = 'beds/bedsSuccess'
const OCCUPANCY_SUCCESS = 'beds/occupancySuccess'
const FAILURE = 'beds/failure'

type BedsAction =
  | { type: typeof START }
  | { type: typeof WARDS_SUCCESS; payload: WardDto[] }
  | { type: typeof BEDS_SUCCESS; payload: BedDto[] }
  | { type: typeof OCCUPANCY_SUCCESS; payload: BedOccupancySummaryDto }
  | { type: typeof FAILURE; payload: string }

export function bedsReducer(state = initialState, action: BedsAction): BedsState {
  switch (action.type) {
    case START: return { ...state, status: 'loading', error: null }
    case WARDS_SUCCESS: return { ...state, status: 'succeeded', wards: action.payload }
    case BEDS_SUCCESS: return { ...state, status: 'succeeded', beds: action.payload }
    case OCCUPANCY_SUCCESS: return { ...state, occupancy: action.payload }
    case FAILURE: return { ...state, status: 'failed', error: action.payload }
    default: return state
  }
}

export const fetchWards = (branchId: number): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    const { data } = await apiClient.get<WardDto[]>('/beds/wards', { params: { branchId } })
    dispatch({ type: WARDS_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export const fetchBeds = (params: { status?: string; roomType?: string } = {}): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch({ type: START })
  try {
    const { data } = await apiClient.get<BedDto[]>('/beds', { params })
    dispatch({ type: BEDS_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export const fetchOccupancySummary = (branchId: number): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    const { data } = await apiClient.get<BedOccupancySummaryDto>('/beds/occupancy-summary', { params: { branchId } })
    dispatch({ type: OCCUPANCY_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}
