import fetchWithCache from '@portal/fetchWithCache'

export function getPlanets(pageNum = 1) {
  return fetchWithCache(
    `planets/?page=${pageNum}`
  )
}

export function getPerson(peronNumber) {
  return fetchWithCache(
    `people/${peronNumber}/`
  )
}
