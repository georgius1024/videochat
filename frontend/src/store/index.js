import { combineReducers, createStore } from 'redux'
import reducers from './reducers'

const mainReducer = combineReducers({
  publication: reducers.publicationReducer,
  subscriptions: reducers.subscriptionsReducer,
  audio: reducers.audioReducer,
  video: reducers.videoReducer,
  userName: reducers.usernameReducer
})

const store = createStore(mainReducer)

export default store
