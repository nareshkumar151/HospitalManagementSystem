import { apiClient, extractErrorMessage } from '../../api/client'
import type { AppThunk } from '../../app/store'
import type { AppointmentDto, DoctorSlotAvailabilityDto, PagedResult } from '../../types'

export interface AppointmentsState {
  list: PagedResult<AppointmentDto> | null
  slots: DoctorSlotAvailabilityDto[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: AppointmentsState = { list: null, slots: [], status: 'idle', error: null }

const START = 'appointments/start'
const LIST_SUCCESS = 'appointments/listSuccess'
const SLOTS_SUCCESS = 'appointments/slotsSuccess'
const FAILURE = 'appointments/failure'

type AppointmentsAction =
  | { type: typeof START }
  | { type: typeof LIST_SUCCESS; payload: PagedResult<AppointmentDto> }
  | { type: typeof SLOTS_SUCCESS; payload: DoctorSlotAvailabilityDto[] }
  | { type: typeof FAILURE; payload: string }

export function appointmentsReducer(state = initialState, action: AppointmentsAction): AppointmentsState {
  switch (action.type) {
    case START: return { ...state, status: 'loading', error: null }
    case LIST_SUCCESS: return { ...state, status: 'succeeded', list: action.payload }
    case SLOTS_SUCCESS: return { ...state, slots: action.payload }
    case FAILURE: return { ...state, status: 'failed', error: action.payload }
    default: return state
  }
}

export const fetchAppointments = (params: {
  pageNumber?: number; pageSize?: number; doctorId?: number; patientId?: number; date?: string; mine?: boolean
} = {}): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch({ type: START })
  try {
    const url = params.mine ? '/appointments/my' : '/appointments'
    const { data } = await apiClient.get<PagedResult<AppointmentDto>>(url, {
      params: { pageNumber: params.pageNumber ?? 1, pageSize: params.pageSize ?? 10, doctorId: params.doctorId, patientId: params.patientId, date: params.date },
    })
    dispatch({ type: LIST_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export const fetchDoctorSlots = (doctorId: number, date: string): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    const { data } = await apiClient.get<DoctorSlotAvailabilityDto[]>(`/appointments/doctor/${doctorId}/slots`, { params: { date } })
    dispatch({ type: SLOTS_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export const bookAppointment = (payload: {
  patientId: number; doctorId: number; departmentId: number; appointmentDate: string; timeSlot: string; type: string; branchId: number
}): AppThunk<Promise<AppointmentDto>> => async (dispatch) => {
  try {
    const { data } = await apiClient.post<AppointmentDto>('/appointments', payload)
    return data
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}

export const rescheduleAppointment = (id: number, newDate: string, newTimeSlot: string): AppThunk<Promise<void>> =>
  async (dispatch) => {
    try {
      await apiClient.put(`/appointments/${id}/reschedule`, { newDate, newTimeSlot })
    } catch (error) {
      dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
      throw error
    }
  }

export const cancelAppointment = (id: number, reason: string): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    await apiClient.put(`/appointments/${id}/cancel`, { reason })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}
