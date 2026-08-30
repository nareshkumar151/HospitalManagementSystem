import { apiClient, extractErrorMessage } from '../../api/client'
import type { AppThunk } from '../../app/store'
import type { BillDto, RazorpayOrderResponseDto } from '../../types'

export interface BillingState {
  pending: BillDto[]
  byPatient: BillDto[]
  current: BillDto | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: BillingState = { pending: [], byPatient: [], current: null, status: 'idle', error: null }

const START = 'billing/start'
const PENDING_SUCCESS = 'billing/pendingSuccess'
const PATIENT_BILLS_SUCCESS = 'billing/patientBillsSuccess'
const ONE_SUCCESS = 'billing/oneSuccess'
const FAILURE = 'billing/failure'

type BillingAction =
  | { type: typeof START }
  | { type: typeof PENDING_SUCCESS; payload: BillDto[] }
  | { type: typeof PATIENT_BILLS_SUCCESS; payload: BillDto[] }
  | { type: typeof ONE_SUCCESS; payload: BillDto }
  | { type: typeof FAILURE; payload: string }

export function billingReducer(state = initialState, action: BillingAction): BillingState {
  switch (action.type) {
    case START: return { ...state, status: 'loading', error: null }
    case PENDING_SUCCESS: return { ...state, status: 'succeeded', pending: action.payload }
    case PATIENT_BILLS_SUCCESS: return { ...state, status: 'succeeded', byPatient: action.payload }
    case ONE_SUCCESS: return { ...state, status: 'succeeded', current: action.payload }
    case FAILURE: return { ...state, status: 'failed', error: action.payload }
    default: return state
  }
}

export const fetchPendingBills = (): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch({ type: START })
  try {
    const { data } = await apiClient.get<BillDto[]>('/billing/pending')
    dispatch({ type: PENDING_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export const fetchBillsByPatient = (patientId: number): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch({ type: START })
  try {
    const { data } = await apiClient.get<BillDto[]>(`/billing/patient/${patientId}`)
    dispatch({ type: PATIENT_BILLS_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export const createBill = (payload: {
  patientId: number; opdVisitId?: number; ipdAdmissionId?: number; type: string
  items: { description: string; quantity: number; unitPrice: number }[]
  discountAmount: number; gstPercent: number; branchId: number
}): AppThunk<Promise<BillDto>> => async (dispatch) => {
  try {
    const { data } = await apiClient.post<BillDto>('/billing', payload)
    dispatch({ type: ONE_SUCCESS, payload: data })
    return data
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}

export const collectPayment = (payload: { billId: number; amount: number; mode: string; transactionReference?: string }): AppThunk<Promise<void>> =>
  async (dispatch) => {
    try {
      await apiClient.post('/billing/payments', payload)
    } catch (error) {
      dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
      throw error
    }
  }

/** Step 1 of a Razorpay Checkout payment - see RazorpayCheckoutButton, which drives the rest of the flow. */
export const createRazorpayOrder = (billId: number): AppThunk<Promise<RazorpayOrderResponseDto>> => async (dispatch) => {
  try {
    const { data } = await apiClient.post<RazorpayOrderResponseDto>(`/billing/${billId}/razorpay/create-order`)
    return data
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}

export const verifyRazorpayPayment = (payload: {
  billId: number; razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string
}): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    await apiClient.post('/billing/razorpay/verify', payload)
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}
