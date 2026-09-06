import { apiClient, extractErrorMessage } from '../../api/client'
import type { AppThunk } from '../../app/store'
import type { DialysisSessionDto, NutritionAssessmentDto, TransfusionReactionDto } from '../../types'

export interface NewDepartmentsState {
  transfusionReactions: TransfusionReactionDto[]
  dialysisSessions: DialysisSessionDto[]
  nutritionAssessments: NutritionAssessmentDto[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: NewDepartmentsState = { transfusionReactions: [], dialysisSessions: [], nutritionAssessments: [], status: 'idle', error: null }

const START = 'newDepts/start'
const TRANSFUSION_SUCCESS = 'newDepts/transfusionSuccess'
const DIALYSIS_SUCCESS = 'newDepts/dialysisSuccess'
const NUTRITION_SUCCESS = 'newDepts/nutritionSuccess'
const FAILURE = 'newDepts/failure'

type Action =
  | { type: typeof START }
  | { type: typeof TRANSFUSION_SUCCESS; payload: TransfusionReactionDto[] }
  | { type: typeof DIALYSIS_SUCCESS; payload: DialysisSessionDto[] }
  | { type: typeof NUTRITION_SUCCESS; payload: NutritionAssessmentDto[] }
  | { type: typeof FAILURE; payload: string }

export function newDepartmentsReducer(state = initialState, action: Action): NewDepartmentsState {
  switch (action.type) {
    case START: return { ...state, status: 'loading', error: null }
    case TRANSFUSION_SUCCESS: return { ...state, status: 'succeeded', transfusionReactions: action.payload }
    case DIALYSIS_SUCCESS: return { ...state, status: 'succeeded', dialysisSessions: action.payload }
    case NUTRITION_SUCCESS: return { ...state, status: 'succeeded', nutritionAssessments: action.payload }
    case FAILURE: return { ...state, status: 'failed', error: action.payload }
    default: return state
  }
}

export const fetchTransfusionReactions = (patientId: number): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch({ type: START })
  try {
    const { data } = await apiClient.get<TransfusionReactionDto[]>(`/bloodbank/transfusion-reactions/patient/${patientId}`)
    dispatch({ type: TRANSFUSION_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export const recordTransfusionReaction = (payload: {
  patientId: number; ipdAdmissionId?: number; bloodGroup?: string; componentTransfused: string
  unitsTransfused?: number; reactionType: string; symptoms?: string; actionTaken?: string; outcome: string; remarks?: string
}): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    await apiClient.post('/bloodbank/transfusion-reactions', payload)
    await dispatch(fetchTransfusionReactions(payload.patientId))
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}

export const fetchDialysisSessions = (patientId: number): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch({ type: START })
  try {
    const { data } = await apiClient.get<DialysisSessionDto[]>(`/dialysis/sessions/patient/${patientId}`)
    dispatch({ type: DIALYSIS_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export const recordDialysisSession = (payload: {
  patientId: number; ipdAdmissionId?: number; dialysisType: string; durationMinutes?: number
  preWeight?: number; postWeight?: number; preBloodPressure?: string; postBloodPressure?: string
  dialyzerType?: string; bloodFlowRate?: number; ufGoal?: number; ufAchieved?: number; complications?: string; remarks?: string
}): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    await apiClient.post('/dialysis/sessions', payload)
    await dispatch(fetchDialysisSessions(payload.patientId))
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}

export const fetchNutritionAssessments = (patientId: number): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch({ type: START })
  try {
    const { data } = await apiClient.get<NutritionAssessmentDto[]>(`/nutrition/assessments/patient/${patientId}`)
    dispatch({ type: NUTRITION_SUCCESS, payload: data })
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
  }
}

export const recordNutritionAssessment = (payload: {
  patientId: number; ipdAdmissionId?: number; heightCm?: number; weightKg?: number; dietType: string
  nutritionalRisk: string; dietaryHistory?: string; allergies?: string; recommendations?: string; reassessmentDate?: string
}): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    await apiClient.post('/nutrition/assessments', payload)
    await dispatch(fetchNutritionAssessments(payload.patientId))
  } catch (error) {
    dispatch({ type: FAILURE, payload: extractErrorMessage(error) })
    throw error
  }
}
