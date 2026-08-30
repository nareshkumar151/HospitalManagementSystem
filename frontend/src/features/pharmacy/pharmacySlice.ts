import { apiClient, extractErrorMessage } from '../../api/client'
import type { AppThunk } from '../../app/store'
import type { MedicineDto, PagedResult, PharmacySaleDto } from '../../types'

export interface PharmacyState {
  medicines: PagedResult<MedicineDto> | null
  lowStock: MedicineDto[]
  lastSale: PharmacySaleDto | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: PharmacyState = { medicines: null, lowStock: [], lastSale: null, status: 'idle', error: null }

const START = 'pharmacy/start'
const MEDICINES_SUCCESS = 'pharmacy/medicinesSuccess'
const LOW_STOCK_SUCCESS = 'pharmacy/lowStockSuccess'
const SALE_SUCCESS = 'pharmacy/saleSuccess'
const FAILURE = 'pharmacy/failure'

type PharmacyAction =
  | { type: typeof START }
  | { type: typeof MEDICINES_SUCCESS; payload: PagedResult<MedicineDto> }
  | { type: typeof LOW_STOCK_SUCCESS; payload: MedicineDto[] }
  | { type: typeof SALE_SUCCESS; payload: PharmacySaleDto }
  | { type: typeof FAILURE; payload: string }

export function pharmacyReducer(state = initialState, action: PharmacyAction): PharmacyState {
  switch (action.type) {
    case START: return { ...state, status: 'loading', error: null }
    case MEDICINES_SUCCESS: return { ...state, status: 'succeeded', medicines: action.payload }
    case LOW_STOCK_SUCCESS: return { ...state, lowStock: action.payload }
    case SALE_SUCCESS: return { ...state, status: 'succeeded', lastSale: action.payload }
    case FAILURE: return { ...state, status: 'failed', error: action.payload }
    default: return state
  }
}

export const fetchMedicines = (params: { pageNumber?: number; pageSize?: number; search?: string } = {}): AppThunk<Promise<void>> =>
  async (dispatch) => {
    dispatch({ type: START })
    try {
      const { data } = await apiClient.get<PagedResult<MedicineDto>>('/pharmacy/medicines', {
        params: { pageNumber: params.pageNumber ?? 1, pageSize: params.pageSize ?? 20, search: params.search },
      })
      dispatch({ type: MEDICINES_SUCCESS, payload: data })
    } catch (error) {
      dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    }
  }

export const fetchLowStock = (): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    const { data } = await apiClient.get<MedicineDto[]>('/pharmacy/medicines/low-stock')
    dispatch({ type: LOW_STOCK_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export const dispenseSale = (payload: {
  patientId: number; prescriptionId?: number; items: { medicineId: number; quantity: number }[]
}): AppThunk<Promise<PharmacySaleDto>> => async (dispatch) => {
  try {
    const { data } = await apiClient.post<PharmacySaleDto>('/pharmacy/sales/dispense', payload)
    dispatch({ type: SALE_SUCCESS, payload: data })
    return data
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}

export const createMedicine = (payload: Record<string, unknown>): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    await apiClient.post('/pharmacy/medicines', payload)
    await dispatch(fetchMedicines())
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}

export const updateMedicine = (id: number, payload: Record<string, unknown>): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    await apiClient.put(`/pharmacy/medicines/${id}`, payload)
    await dispatch(fetchMedicines())
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}

export const purchaseMedicine = (payload: { medicineId: number; quantity: number; unitCost: number }): AppThunk<Promise<void>> =>
  async (dispatch) => {
    try {
      await apiClient.post('/pharmacy/medicines/purchase', payload)
      await dispatch(fetchMedicines())
    } catch (error) {
      dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
      throw error
    }
  }
