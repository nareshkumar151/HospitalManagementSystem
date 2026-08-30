import { apiClient, extractErrorMessage } from '../../api/client'
import type { AppThunk } from '../../app/store'
import type { AttendanceDto, AttendanceSummaryDto, LeaveRequestDto, LeaveStatus } from '../../types'

export interface AttendanceState {
  history: AttendanceDto[]
  monthMatrix: AttendanceDto[]
  summary: AttendanceSummaryDto | null
  myLeaveRequests: LeaveRequestDto[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: AttendanceState = { history: [], monthMatrix: [], summary: null, myLeaveRequests: [], status: 'idle', error: null }

const START = 'attendance/start'
const HISTORY_SUCCESS = 'attendance/historySuccess'
const MONTH_MATRIX_SUCCESS = 'attendance/monthMatrixSuccess'
const SUMMARY_SUCCESS = 'attendance/summarySuccess'
const MY_LEAVE_SUCCESS = 'attendance/myLeaveSuccess'
const FAILURE = 'attendance/failure'

type AttendanceAction =
  | { type: typeof START }
  | { type: typeof HISTORY_SUCCESS; payload: AttendanceDto[] }
  | { type: typeof MONTH_MATRIX_SUCCESS; payload: AttendanceDto[] }
  | { type: typeof SUMMARY_SUCCESS; payload: AttendanceSummaryDto }
  | { type: typeof MY_LEAVE_SUCCESS; payload: LeaveRequestDto[] }
  | { type: typeof FAILURE; payload: string }

export function attendanceReducer(state = initialState, action: AttendanceAction): AttendanceState {
  switch (action.type) {
    case START: return { ...state, status: 'loading', error: null }
    case HISTORY_SUCCESS: return { ...state, status: 'succeeded', history: action.payload }
    case MONTH_MATRIX_SUCCESS: return { ...state, status: 'succeeded', monthMatrix: action.payload }
    case SUMMARY_SUCCESS: return { ...state, summary: action.payload }
    case MY_LEAVE_SUCCESS: return { ...state, status: 'succeeded', myLeaveRequests: action.payload }
    case FAILURE: return { ...state, status: 'failed', error: action.payload }
    default: return state
  }
}

/** Self-service and Admin/HR share this - the API scopes the result to the caller's own record unless
 * they're Admin/HR, so `employeeId` here is always safe to pass as "whose history am I asking for". */
export const fetchAttendanceHistory = (employeeId: number, month?: string): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch({ type: START })
  try {
    const { data } = await apiClient.get<AttendanceDto[]>(`/attendance/employee/${employeeId}`, { params: { month } })
    dispatch({ type: HISTORY_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

/** Admin/HR only: every employee's attendance rows for one month, for the matrix widget. */
export const fetchAttendanceForMonth = (month: string): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch({ type: START })
  try {
    const { data } = await apiClient.get<AttendanceDto[]>('/attendance/all', { params: { month } })
    dispatch({ type: MONTH_MATRIX_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

/** Admin/HR only: headcount + present/on-leave-today + pending-approvals widgets. */
export const fetchAttendanceSummary = (): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    const { data } = await apiClient.get<AttendanceSummaryDto>('/attendance/summary')
    dispatch({ type: SUMMARY_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

/** For a self-service caller the backend ignores/overrides `employeeId` with the caller's own record, so
 * this is safe to call without knowing your own employee id up front. */
export const applyLeave = (payload: { employeeId: number; fromDate: string; toDate: string; reason: string }): AppThunk<Promise<void>> =>
  async (dispatch) => {
    try {
      await apiClient.post('/attendance/leave-requests', payload)
    } catch (error) {
      dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
      throw error
    }
  }

export const fetchMyLeaveRequests = (status?: LeaveStatus): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    const { data } = await apiClient.get<LeaveRequestDto[]>('/attendance/leave-requests', { params: { status } })
    dispatch({ type: MY_LEAVE_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}
