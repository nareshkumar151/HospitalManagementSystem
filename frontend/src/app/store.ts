import { applyMiddleware, compose, legacy_createStore as createStore, type Action, type Reducer, type StoreEnhancer } from 'redux'
import { thunk, type ThunkAction, type ThunkDispatch } from 'redux-thunk'
import { rootReducer, type RootState } from './rootReducer'

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: typeof compose
  }
}

// Falls back to plain `compose` (an identity pass-through here, since there's only one enhancer) when the
// Redux DevTools browser extension isn't installed, so devtools support never risks breaking the store.
const composeEnhancers = (import.meta.env.DEV && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) || compose

const enhancer: StoreEnhancer = composeEnhancers(applyMiddleware(thunk))

// combineReducers' output type accepts a `Partial<RootState>` preloaded state (each slice reducer tolerates
// `undefined` on first call), which trips up legacy_createStore's overload resolution in strict mode when no
// preloaded state is actually passed in. Re-typing to the plain 2-generic Reducer form sidesteps that -
// the runtime behavior (each reducer independently defaults its own slice) is unaffected.
export const store = createStore(rootReducer as unknown as Reducer<RootState, Action>, enhancer)

export type { RootState }
export type AppDispatch = ThunkDispatch<RootState, undefined, Action> & typeof store.dispatch
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, undefined, Action>
