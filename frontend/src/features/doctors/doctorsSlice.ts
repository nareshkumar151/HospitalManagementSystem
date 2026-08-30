import { apiClient, extractErrorMessage } from '../../api/client'
import type { AppThunk } from '../../app/store'
import type { DepartmentDto, DoctorDto, PagedResult } from '../../types'

export interface DoctorsState {
  list: PagedResult<DoctorDto> | null
  departments: DepartmentDto[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: DoctorsState = { list: null, departments: [], status: 'idle', error: null }

const START = 'doctors/start'
const LIST_SUCCESS = 'doctors/listSuccess'
const DEPTS_SUCCESS = 'doctors/deptsSuccess'
const FAILURE = 'doctors/failure'

type DoctorsAction =
  | { type: typeof START }
  | { type: typeof LIST_SUCCESS; payload: PagedResult<DoctorDto> }
  | { type: typeof DEPTS_SUCCESS; payload: DepartmentDto[] }
  | { type: typeof FAILURE; payload: string }

export function doctorsReducer(state = initialState, action: DoctorsAction): DoctorsState {
  switch (action.type) {
    case START: return { ...state, status: 'loading', error: null }
    case LIST_SUCCESS: return { ...state, status: 'succeeded', list: action.payload }
    case DEPTS_SUCCESS: return { ...state, departments: action.payload }
    case FAILURE: return { ...state, status: 'failed', error: action.payload }
    default: return state
  }
}

export const fetchDoctors = (params: { pageNumber?: number; pageSize?: number; search?: string } = {}): AppThunk<Promise<void>> =>
  async (dispatch) => {
    dispatch({ type: START })
    try {
      const { data } = await apiClient.get<PagedResult<DoctorDto>>('/doctors', {
        params: { pageNumber: params.pageNumber ?? 1, pageSize: params.pageSize ?? 50, search: params.search },
      })
      dispatch({ type: LIST_SUCCESS, payload: data })
    } catch (error) {
      dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    }
  }

export const fetchDepartments = (): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    const { data } = await apiClient.get<DepartmentDto[]>('/departments')
    dispatch({ type: DEPTS_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export const createDoctor = (payload: Record<string, unknown>): AppThunk<Promise<DoctorDto>> => async (dispatch) => {
  try {
    const { data } = await apiClient.post<DoctorDto>('/doctors', payload)
    await dispatch(fetchDoctors())
    return data
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}
