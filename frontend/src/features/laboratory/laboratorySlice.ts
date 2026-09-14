import { apiClient, extractErrorMessage } from '../../api/client'
import type { AppThunk } from '../../app/store'

export interface LabTestCatalogDto { id: number; testName: string; category: string; price: number; normalRange: string | null }

export interface LaboratoryState {
  catalog: LabTestCatalogDto[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: LaboratoryState = { catalog: [], status: 'idle', error: null }

const START = 'laboratory/start'
const CATALOG_SUCCESS = 'laboratory/catalogSuccess'
const FAILURE = 'laboratory/failure'

type LaboratoryAction =
  | { type: typeof START }
  | { type: typeof CATALOG_SUCCESS; payload: LabTestCatalogDto[] }
  | { type: typeof FAILURE; payload: string }

export function laboratoryReducer(state = initialState, action: LaboratoryAction): LaboratoryState {
  switch (action.type) {
    case START: return { ...state, status: 'loading', error: null }
    case CATALOG_SUCCESS: return { ...state, status: 'succeeded', catalog: action.payload }
    case FAILURE: return { ...state, status: 'failed', error: action.payload }
    default: return state
  }
}

export const fetchLabCatalog = (): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch({ type: START })
  try {
    const { data } = await apiClient.get<LabTestCatalogDto[]>('/laboratory/catalog')
    dispatch({ type: CATALOG_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

// Rate master for Investigation (Lab Test Catalog) - the backend has always supported this CRUD
// (LaboratoryController's catalog endpoints, AdminOnly for write); nothing in the UI ever called it.
export interface UpsertLabTestCatalogPayload { testName: string; category: string; price: number; normalRange?: string }

export const addLabCatalogItem = (payload: UpsertLabTestCatalogPayload): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    await apiClient.post('/laboratory/catalog', payload)
    await dispatch(fetchLabCatalog())
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}

export const updateLabCatalogItem = (id: number, payload: UpsertLabTestCatalogPayload): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    await apiClient.put(`/laboratory/catalog/${id}`, payload)
    await dispatch(fetchLabCatalog())
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}

export const deleteLabCatalogItem = (id: number): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    await apiClient.delete(`/laboratory/catalog/${id}`)
    await dispatch(fetchLabCatalog())
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}

export const orderLabTest = (payload: { patientId: number; labTestCatalogId: number; opdVisitId?: number; ipdAdmissionId?: number }): AppThunk<Promise<void>> =>
  async (dispatch) => {
    try {
      await apiClient.post('/laboratory/orders', payload)
    } catch (error) {
      dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
      throw error
    }
  }
