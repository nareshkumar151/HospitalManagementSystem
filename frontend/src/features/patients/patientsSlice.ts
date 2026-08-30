import { apiClient, extractErrorMessage } from '../../api/client'
import type { AppThunk } from '../../app/store'
import type { PagedResult, PatientDto } from '../../types'

// ---------- State ----------
export interface PatientsState {
  list: PagedResult<PatientDto> | null
  current: PatientDto | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: PatientsState = { list: null, current: null, status: 'idle', error: null }

// ---------- Action types ----------
const FETCH_START = 'patients/fetchStart'
const FETCH_LIST_SUCCESS = 'patients/fetchListSuccess'
const FETCH_ONE_SUCCESS = 'patients/fetchOneSuccess'
const FETCH_FAILURE = 'patients/fetchFailure'
const CLEAR_CURRENT = 'patients/clearCurrent'

type PatientsAction =
  | { type: typeof FETCH_START }
  | { type: typeof FETCH_LIST_SUCCESS; payload: PagedResult<PatientDto> }
  | { type: typeof FETCH_ONE_SUCCESS; payload: PatientDto }
  | { type: typeof FETCH_FAILURE; payload: string }
  | { type: typeof CLEAR_CURRENT }

// ---------- Reducer ----------
export function patientsReducer(state = initialState, action: PatientsAction): PatientsState {
  switch (action.type) {
    case FETCH_START:
      return { ...state, status: 'loading', error: null }
    case FETCH_LIST_SUCCESS:
      return { ...state, status: 'succeeded', list: action.payload }
    case FETCH_ONE_SUCCESS:
      return { ...state, status: 'succeeded', current: action.payload }
    case FETCH_FAILURE:
      return { ...state, status: 'failed', error: action.payload }
    case CLEAR_CURRENT:
      return { ...state, current: null }
    default:
      return state
  }
}

// ---------- Thunks ----------
export interface UpsertPatientPayload {
  aadhaarNumber?: string; fullName: string; gender: string; dateOfBirth?: string; age?: number
  mobile: string; email?: string; address?: string; bloodGroup: string
  emergencyContactName?: string; emergencyContactNumber?: string
  referredByDoctorName?: string; referralHospital?: string; referralNotes?: string
  insuranceCompany?: string; insurancePolicyNumber?: string; allergies?: string; branchId: number
}

export const fetchPatients = (params: { pageNumber?: number; pageSize?: number; search?: string } = {}): AppThunk<Promise<void>> =>
  async (dispatch) => {
    dispatch({ type: FETCH_START })
    try {
      const { data } = await apiClient.get<PagedResult<PatientDto>>('/patients', {
        params: { pageNumber: params.pageNumber ?? 1, pageSize: params.pageSize ?? 10, search: params.search },
      })
      dispatch({ type: FETCH_LIST_SUCCESS, payload: data })
    } catch (error) {
      dispatch({ type: FETCH_FAILURE, payload: extractErrorMessage(error) })
    }
  }

export const fetchPatientById = (id: number): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch({ type: FETCH_START })
  try {
    const { data } = await apiClient.get<PatientDto>(`/patients/${id}`)
    dispatch({ type: FETCH_ONE_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FETCH_FAILURE, payload: extractErrorMessage(error) })
  }
}

export const createPatient = (payload: UpsertPatientPayload): AppThunk<Promise<PatientDto>> => async (dispatch) => {
  try {
    const { data } = await apiClient.post<PatientDto>('/patients', payload)
    dispatch({ type: FETCH_ONE_SUCCESS, payload: data })
    return data
  } catch (error) {
    dispatch({ type: FETCH_FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}

export const updatePatient = (id: number, payload: UpsertPatientPayload): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    await apiClient.put(`/patients/${id}`, payload)
    await dispatch(fetchPatientById(id))
  } catch (error) {
    dispatch({ type: FETCH_FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}

export const clearCurrentPatient = (): PatientsAction => ({ type: CLEAR_CURRENT })
