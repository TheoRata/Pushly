const BASE_URL = '/api'

async function request(method, url, body) {
  const opts = {
    method,
    headers: {},
  }

  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }

  const res = await fetch(`${BASE_URL}${url}`, opts)

  if (!res.ok) {
    let detail
    try {
      detail = await res.json()
    } catch {
      detail = { message: res.statusText }
    }
    const err = new Error(detail.message || `Request failed: ${res.status}`)
    err.status = res.status
    err.detail = detail
    throw err
  }

  // 204 No Content
  if (res.status === 204) return null

  return res.json()
}

export function useApi() {
  const get = (url) => request('GET', url)
  const post = (url, body) => request('POST', url, body)
  const put = (url, body) => request('PUT', url, body)
  const del = (url) => request('DELETE', url)

  return { get, post, put, del }
}
