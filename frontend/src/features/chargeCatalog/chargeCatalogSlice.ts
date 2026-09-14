import { apiClient, extractErrorMessage } from '../../api/client'
import type { AppThunk } from '../../app/store'
import type { ChargeCatalogItemDto, ChargeCatalogCategory } from '../../types'

export interface ChargeCatalogState {
  items: ChargeCatalogItemDto[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: ChargeCatalogState = { items: [], status: 'idle', error: null }

const START = 'chargeCatalog/start'
const SUCCESS = 'chargeCatalog/success'
const FAILURE = 'chargeCatalog/failure'

type ChargeCatalogAction =
  | { type: typeof START }
  | { type: typeof SUCCESS; payload: ChargeCatalogItemDto[] }
  | { type: typeof FAILURE; payload: string }

export function chargeCatalogReducer(state = initialState, action: ChargeCatalogAction): ChargeCatalogState {
  switch (action.type) {
    case START: return { ...state, status: 'loading', error: null }
    case SUCCESS: return { ...state, status: 'succeeded', items: action.payload }
    case FAILURE: return { ...state, status: 'failed', error: action.payload }
    default: return state
  }
}

export interface UpsertChargeCatalogPayload { category: ChargeCatalogCategory; itemName: string; rate: number; isActive?: boolean }

// Rate master for Nurse Charges / General Service / Others - Room Tariff/Consultation/Investigation each
// already have their own home (Rooms, Doctors, Lab Test Catalog).
export const fetchChargeCatalog = (includeInactive = false): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch({ type: START })
  try {
    const { data } = await apiClient.get<ChargeCatalogItemDto[]>('/chargecatalog', { params: { includeInactive } })
    dispatch({ type: SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export const addChargeCatalogItem = (payload: UpsertChargeCatalogPayload): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    await apiClient.post('/chargecatalog', payload)
    await dispatch(fetchChargeCatalog(true))
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}

export const updateChargeCatalogItem = (id: number, payload: UpsertChargeCatalogPayload): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    await apiClient.put(`/chargecatalog/${id}`, payload)
    await dispatch(fetchChargeCatalog(true))
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}

export const deleteChargeCatalogItem = (id: number): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    await apiClient.delete(`/chargecatalog/${id}`)
    await dispatch(fetchChargeCatalog(true))
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}
