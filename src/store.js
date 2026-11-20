import { onBeforeUnmount, shallowRef } from 'vue'
import { initialData, reduce } from './model.js'
import { api } from './api.js'

const clone = (value) => JSON.parse(JSON.stringify(value))

function demoStore(account) {
  const key = `gamebaby-teaching-demo:${account}`
  let initial
  try {
    initial = JSON.parse(localStorage.getItem(key))
  } catch {
    /* 使用演示初始数据 */
  }
  const data = shallowRef(initial || initialData())
  return {
    data,
    dispatch(action) {
      data.value = reduce(clone(data.value), action)
      try {
        localStorage.setItem(key, JSON.stringify(data.value))
      } catch {
        /* 当前页面仍可演示 */
      }
    },
  }
}

export function createStore(initialState, demoAccount) {
  if (!initialState) return demoStore(demoAccount)
  const data = shallowRef(initialState)
  let outstanding = 0
  let queue = Promise.resolve()
  let revision = 0
  let mounted = true
  const notify = (error) =>
    window.dispatchEvent(new CustomEvent('gamebaby-study-error', { detail: error.message }))

  async function reload() {
    if (outstanding || !mounted) return
    const requestedRevision = revision
    try {
      const latest = await api('/my/study-state')
      if (mounted && requestedRevision === revision) data.value = latest
    } catch (error) {
      if (mounted) notify(error)
    }
  }
  window.addEventListener('focus', reload)
  onBeforeUnmount(() => {
    mounted = false
    window.removeEventListener('focus', reload)
  })

  function dispatch(action) {
    const plain = clone(action)
    data.value = reduce(clone(data.value), plain)
    revision++
    outstanding++
    queue = queue.then(async () => {
      let failed = false
      try {
        if (!mounted) return
        const result = await api('/my/study-state', { method: 'POST', body: plain })
        if (outstanding === 1 && mounted) data.value = result
      } catch (error) {
        failed = true
        if (mounted) notify(error)
      } finally {
        outstanding--
      }
      if (failed && !outstanding) await reload()
    })
  }
  return { data, dispatch }
}
