import { apiClient, extractErrorMessage } from '../../api/client'
import type { AppThunk } from '../../app/store'
import type { IpdAdmissionDto, PagedResult } from '../../types'

export interface IpdState {
  active: IpdAdmissionDto[]
  /** IPD/Admissions list screen: searchable, date-filterable, paginated - the full admission history,
   * separate from `active` (which is always "who's admitted right now", used by the IPD billing picker). */
  list: PagedResult<IpdAdmissionDto> | null
  current: IpdAdmissionDto | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: IpdState = { active: [], list: null, current: null, status: 'idle', error: null }

const START = 'ipd/start'
const LIST_SUCCESS = 'ipd/listSuccess'
const SEARCH_SUCCESS = 'ipd/searchSuccess'
const ONE_SUCCESS = 'ipd/oneSuccess'
const FAILURE = 'ipd/failure'

type IpdAction =
  | { type: typeof START }
  | { type: typeof LIST_SUCCESS; payload: IpdAdmissionDto[] }
  | { type: typeof SEARCH_SUCCESS; payload: PagedResult<IpdAdmissionDto> }
  | { type: typeof ONE_SUCCESS; payload: IpdAdmissionDto }
  | { type: typeof FAILURE; payload: string }

export function ipdReducer(state = initialState, action: IpdAction): IpdState {
  switch (action.type) {
    case START: return { ...state, status: 'loading', error: null }
    case LIST_SUCCESS: return { ...state, status: 'succeeded', active: action.payload }
    case SEARCH_SUCCESS: return { ...state, status: 'succeeded', list: action.payload }
    case ONE_SUCCESS: return { ...state, status: 'succeeded', current: action.payload }
    case FAILURE: return { ...state, status: 'failed', error: action.payload }
    default: return state
  }
}

export const fetchActiveAdmissions = (): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch({ type: START })
  try {
    const { data } = await apiClient.get<IpdAdmissionDto[]>('/ipdadmissions/active')
    dispatch({ type: LIST_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export const searchAdmissions = (params: {
  pageNumber?: number; pageSize?: number; search?: string; fromDate?: string; toDate?: string; status?: string
} = {}): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch({ type: START })
  try {
    const { data } = await apiClient.get<PagedResult<IpdAdmissionDto>>('/ipdadmissions', {
      params: {
        pageNumber: params.pageNumber ?? 1, pageSize: params.pageSize ?? 10,
        search: params.search || undefined, fromDate: params.fromDate || undefined, toDate: params.toDate || undefined,
        status: params.status || undefined,
      },
    })
    dispatch({ type: SEARCH_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export const fetchAdmissionById = (id: number): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    const { data } = await apiClient.get<IpdAdmissionDto>(`/ipdadmissions/${id}`)
    dispatch({ type: ONE_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export const admitPatient = (payload: {
  patientId: number; doctorId: number; bedId: number; admissionType: string; reasonForAdmission?: string; branchId: number
}): AppThunk<Promise<IpdAdmissionDto>> => async (dispatch) => {
  try {
    const { data } = await apiClient.post<IpdAdmissionDto>('/ipdadmissions', payload)
    return data
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}

export const dischargePatient = (admissionId: number, payload: {
  diagnosis: string; chiefComplaint?: string; pastHistory?: string; physicalExamination?: string
  investigation?: string; courseInHospital?: string; conditionAtDischarge: string
  medicinesAdvised?: string; dietAdvice?: string; followUpDate?: string
}): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    await apiClient.post(`/discharge/admissions/${admissionId}`, payload)
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}
