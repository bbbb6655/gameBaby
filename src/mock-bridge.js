import { readData, STORAGE } from './model.js'
import { commit } from './store.js'

const peer = new URL(location.href)
peer.port = '82'
const origin = peer.origin
const send = (value) => parent.postMessage({ type: 'gamebaby-state', value }, origin)

if (parent !== window) {
  window.addEventListener('message', (event) => {
    if (event.source === parent && event.origin === origin && event.data?.type === 'gamebaby-action')
      send(commit(event.data.action))
  })
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE) send(readData())
  })
  send(readData())
}
