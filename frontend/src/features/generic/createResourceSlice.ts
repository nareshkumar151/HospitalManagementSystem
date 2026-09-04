import type { Action as ReduxAction } from 'redux'
import type { ThunkAction } from 'redux-thunk'
import { apiClient, extractErrorMessage } from '../../api/client'
import type { PagedResult } from '../../types'

// Deliberately NOT importing AppThunk/RootState here: this factory is used to build some of the very
// reducers RootState is composed from, so depending on RootState would create a circular type
// (RootState -> this factory's output -> AppThunk -> RootState). None of these generic thunks read
// state, so a State type of `unknown` is both accurate and cycle-free.
type GenericThunk<ReturnType> = ThunkAction<ReturnType, unknown, undefined, ReduxAction>

/**
 * Factory for the many simple "list + create" admin modules (Insurance, Radiology, Operation Theatre,
 * Medical Records, Employees, Inventory, Vendors, Payroll, Attendance, Notifications, Reports...).
 * Still plain Redux + Thunk under the hood - this only removes the copy-pasted boilerplate those
 * modules would otherwise repeat identically. Bespoke modules (auth, patients, appointments, opd,
 * pharmacy, billing, ipd, nursing, beds, doctors) keep their own hand-written slice for real logic.
 */
export interface ResourceState<T> {
  items: T[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

export type ResourceAction<T> =
  | { type: string & { __brand?: 'start' } }
  | { type: string; payload: T[] }
  | { type: string; payload: string }

export interface ResourceSlice<T> {
  reducer: (state: ResourceState<T> | undefined, action: ResourceAction<T>) => ResourceState<T>
  fetchAll: (params?: Record<string, unknown>, pathOverride?: string) => GenericThunk<Promise<void>>
  create: (payload: Record<string, unknown>, refetchParams?: Record<string, unknown>, createPathOverride?: string) => GenericThunk<Promise<T>>
  update: (id: number, payload: Record<string, unknown>, refetchParams?: Record<string, unknown>) => GenericThunk<Promise<void>>
}

export function createResourceSlice<T>(actionPrefix: string, endpoint: string): ResourceSlice<T> {
  const initialState: ResourceState<T> = { items: [], status: 'idle', error: null }

  const START = `${actionPrefix}/start`
  const SUCCESS = `${actionPrefix}/success`
  const FAILURE = `${actionPrefix}/failure`

  function reducer(state: ResourceState<T> = initialState, action: ResourceAction<T>): ResourceState<T> {
    switch (action.type) {
      case START:
        return { ...state, status: 'loading', error: null }
      case SUCCESS:
        return { ...state, status: 'succeeded', items: (action as { payload: T[] }).payload }
      case FAILURE:
        return { ...state, status: 'failed', error: (action as { payload: string }).payload }
      default:
        return state
    }
  }

  // `pathOverride` lets a handful of call sites (e.g. payroll's /payroll/period/{period}) reuse the same
  // list/status plumbing against a differently-shaped URL instead of the resource's default endpoint.
  const fetchAll = (params?: Record<string, unknown>, pathOverride?: string): GenericThunk<Promise<void>> => async (dispatch) => {
    dispatch({ type: START })
    try {
      const { data } = await apiClient.get<T[]>(pathOverride ?? endpoint, { params })
      dispatch({ type: SUCCESS, payload: data })
    } catch (error) {
      dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    }
  }

  // `createPathOverride` covers resources whose list endpoint is a specialized view (e.g. Operation
  // Theatre's `/operationtheatre/today`) rather than the collection's own base route - posting a new
  // record has to go to the real create endpoint (`/operationtheatre`), not the read-only "today" view,
  // even though fetchAll's default `endpoint` is correctly the "today" view for every GET.
  const create = (payload: Record<string, unknown>, refetchParams?: Record<string, unknown>, createPathOverride?: string): GenericThunk<Promise<T>> =>
    async (dispatch) => {
      try {
        const { data } = await apiClient.post<T>(createPathOverride ?? endpoint, payload)
        await dispatch(fetchAll(refetchParams))
        return data
      } catch (error) {
        dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
        throw error
      }
    }

  const update = (id: number, payload: Record<string, unknown>, refetchParams?: Record<string, unknown>): GenericThunk<Promise<void>> =>
    async (dispatch) => {
      try {
        await apiClient.put(`${endpoint}/${id}`, payload)
        await dispatch(fetchAll(refetchParams))
      } catch (error) {
        dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
        throw error
      }
    }

  return { reducer, fetchAll, create, update }
}

/**
 * Paged sibling of `createResourceSlice` for the modules whose list can realistically grow into the
 * hundreds/thousands (Notifications, Insurance claims, Radiology/Lab order queues, Inventory, Vendors,
 * Payroll, Leave requests, the IP patient list) - the server does the paging and searching instead of
 * shipping the whole table to the browser every time.
 */
export interface PagedResourceState<T> {
  list: PagedResult<T> | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

type PagedResourceAction<T> =
  | { type: string & { __brand?: 'start' } }
  | { type: string; payload: PagedResult<T> }
  | { type: string; payload: string }

export interface PagedResourceSlice<T> {
  reducer: (state: PagedResourceState<T> | undefined, action: PagedResourceAction<T>) => PagedResourceState<T>
  fetchPage: (params?: { pageNumber?: number; pageSize?: number; search?: string } & Record<string, unknown>, pathOverride?: string) => GenericThunk<Promise<void>>
  create: (payload: Record<string, unknown>, refetchParams?: Record<string, unknown>, createPathOverride?: string) => GenericThunk<Promise<T>>
  update: (id: number, payload: Record<string, unknown>, refetchParams?: Record<string, unknown>) => GenericThunk<Promise<void>>
}

export function createPagedResourceSlice<T>(actionPrefix: string, endpoint: string): PagedResourceSlice<T> {
  const initialState: PagedResourceState<T> = { list: null, status: 'idle', error: null }

  const START = `${actionPrefix}/start`
  const SUCCESS = `${actionPrefix}/success`
  const FAILURE = `${actionPrefix}/failure`

  function reducer(state: PagedResourceState<T> = initialState, action: PagedResourceAction<T>): PagedResourceState<T> {
    switch (action.type) {
      case START:
        return { ...state, status: 'loading', error: null }
      case SUCCESS:
        return { ...state, status: 'succeeded', list: (action as { payload: PagedResult<T> }).payload }
      case FAILURE:
        return { ...state, status: 'failed', error: (action as { payload: string }).payload }
      default:
        return state
    }
  }

  const fetchPage = (
    params: { pageNumber?: number; pageSize?: number; search?: string } & Record<string, unknown> = {},
    pathOverride?: string
  ): GenericThunk<Promise<void>> => async (dispatch) => {
    dispatch({ type: START })
    try {
      const { pageNumber = 1, pageSize = 10, search, ...rest } = params
      const { data } = await apiClient.get<PagedResult<T>>(pathOverride ?? endpoint, {
        params: { pageNumber, pageSize, search: search || undefined, ...rest },
      })
      dispatch({ type: SUCCESS, payload: data })
    } catch (error) {
      dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    }
  }

  const create = (payload: Record<string, unknown>, refetchParams?: Record<string, unknown>, createPathOverride?: string): GenericThunk<Promise<T>> =>
    async (dispatch) => {
      try {
        const { data } = await apiClient.post<T>(createPathOverride ?? endpoint, payload)
        await dispatch(fetchPage(refetchParams))
        return data
      } catch (error) {
        dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
        throw error
      }
    }

  const update = (id: number, payload: Record<string, unknown>, refetchParams?: Record<string, unknown>): GenericThunk<Promise<void>> =>
    async (dispatch) => {
      try {
        await apiClient.put(`${endpoint}/${id}`, payload)
        await dispatch(fetchPage(refetchParams))
      } catch (error) {
        dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
        throw error
      }
    }

  return { reducer, fetchPage, create, update }
}
