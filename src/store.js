import { shallowRef } from 'vue'
import { initialData, readData, reduce, STORAGE } from './model.js'

let sessionData

export function commit(action) {
  const next = reduce(sessionData || readData(), action)
  try {
    localStorage.setItem(STORAGE, JSON.stringify(next))
  } catch {
    sessionData = next
  }
  return next
}

export function createStore(desktop = false) {
  const bridged = desktop && location.port === '82'
  const data = shallowRef(bridged ? initialData() : readData())
  let iframe
  let origin
  let connected = false
  const pending = []
  const send = (action) => iframe.contentWindow?.postMessage({ type: 'gamebaby-action', action }, origin)
  if (bridged) {
    const bridge = new URL('/mock-bridge.html', location.href)
    bridge.port = '81'
    origin = bridge.origin
    iframe = document.createElement('iframe')
    iframe.hidden = true
    iframe.title = '同步浏览器中的演示数据'
    iframe.src = bridge.href
    window.addEventListener('message', (event) => {
      if (
        event.origin !== origin ||
        event.source !== iframe.contentWindow ||
        event.data?.type !== 'gamebaby-state'
      )
        return
      data.value = event.data.value
      connected = true
      pending.splice(0).forEach(send)
    })
    document.body.append(iframe)
  } else {
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE) data.value = readData()
    })
  }

  function dispatch(action) {
    if (bridged) {
      const plain = JSON.parse(JSON.stringify(action))
      if (connected) send(plain)
      else pending.push(plain)
    } else {
      data.value = commit(action)
    }
  }
  return { data, dispatch }
}
