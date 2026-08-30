import { apiClient, extractErrorMessage } from '../../api/client'
import type { AppThunk } from '../../app/store'
import type { BranchDto, HospitalDto } from '../../types'

export interface OrganizationState {
  hospitals: HospitalDto[]
  branches: BranchDto[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: OrganizationState = { hospitals: [], branches: [], status: 'idle', error: null }

const START = 'organization/start'
const HOSPITALS_SUCCESS = 'organization/hospitalsSuccess'
const BRANCHES_SUCCESS = 'organization/branchesSuccess'
const FAILURE = 'organization/failure'

type OrganizationAction =
  | { type: typeof START }
  | { type: typeof HOSPITALS_SUCCESS; payload: HospitalDto[] }
  | { type: typeof BRANCHES_SUCCESS; payload: BranchDto[] }
  | { type: typeof FAILURE; payload: string }

export function organizationReducer(state = initialState, action: OrganizationAction): OrganizationState {
  switch (action.type) {
    case START: return { ...state, status: 'loading', error: null }
    case HOSPITALS_SUCCESS: return { ...state, status: 'succeeded', hospitals: action.payload }
    case BRANCHES_SUCCESS: return { ...state, status: 'succeeded', branches: action.payload }
    case FAILURE: return { ...state, status: 'failed', error: action.payload }
    default: return state
  }
}

export const fetchHospitals = (): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch({ type: START })
  try {
    const { data } = await apiClient.get<HospitalDto[]>('/organization/hospitals')
    dispatch({ type: HOSPITALS_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export const createHospital = (payload: { name: string; registrationNumber: string; address: string; contactNumber: string; email?: string }): AppThunk<Promise<void>> =>
  async (dispatch) => {
    try {
      await apiClient.post('/organization/hospitals', payload)
      await dispatch(fetchHospitals())
    } catch (error) {
      dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
      throw error
    }
  }

export const deleteHospital = (id: number): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    await apiClient.delete(`/organization/hospitals/${id}`)
    await dispatch(fetchHospitals())
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}

export const fetchBranches = (hospitalId?: number): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch({ type: START })
  try {
    const { data } = await apiClient.get<BranchDto[]>('/organization/branches', { params: { hospitalId } })
    dispatch({ type: BRANCHES_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export const createBranch = (payload: { hospitalId: number; name: string; address: string; city: string; contactNumber: string }): AppThunk<Promise<void>> =>
  async (dispatch) => {
    try {
      await apiClient.post('/organization/branches', payload)
      await dispatch(fetchBranches(payload.hospitalId))
    } catch (error) {
      dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
      throw error
    }
  }

export const deleteBranch = (id: number, hospitalId?: number): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    await apiClient.delete(`/organization/branches/${id}`)
    await dispatch(fetchBranches(hospitalId))
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}
