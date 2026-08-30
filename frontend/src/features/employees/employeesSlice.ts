import { apiClient, extractErrorMessage } from '../../api/client'
import type { AppThunk } from '../../app/store'
import type { PagedResult } from '../../types'

export interface EmployeeDto {
  id: number; employeeCode: string; fullName: string; departmentId: number; departmentName: string
  designation: string; salary: number; joiningDate: string; shift: string; contact: string
  emailId: string; emergencyContact: string | null; branchId: number; isActive: boolean; hasLogin: boolean
}

export interface EmployeesState {
  list: PagedResult<EmployeeDto> | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: EmployeesState = { list: null, status: 'idle', error: null }

const START = 'employees/start'
const LIST_SUCCESS = 'employees/listSuccess'
const FAILURE = 'employees/failure'

type EmployeesAction =
  | { type: typeof START }
  | { type: typeof LIST_SUCCESS; payload: PagedResult<EmployeeDto> }
  | { type: typeof FAILURE; payload: string }

export function employeesReducer(state = initialState, action: EmployeesAction): EmployeesState {
  switch (action.type) {
    case START: return { ...state, status: 'loading', error: null }
    case LIST_SUCCESS: return { ...state, status: 'succeeded', list: action.payload }
    case FAILURE: return { ...state, status: 'failed', error: action.payload }
    default: return state
  }
}

export const fetchEmployees = (params: { pageNumber?: number; pageSize?: number; search?: string } = {}): AppThunk<Promise<void>> =>
  async (dispatch) => {
    dispatch({ type: START })
    try {
      const { data } = await apiClient.get<PagedResult<EmployeeDto>>('/employees', {
        params: { pageNumber: params.pageNumber ?? 1, pageSize: params.pageSize ?? 20, search: params.search },
      })
      dispatch({ type: LIST_SUCCESS, payload: data })
    } catch (error) {
      dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    }
  }

export const createEmployee = (payload: Record<string, unknown>): AppThunk<Promise<EmployeeDto>> => async (dispatch) => {
  try {
    const { data } = await apiClient.post<EmployeeDto>('/employees', payload)
    await dispatch(fetchEmployees())
    return data
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}
