export default function addId(entity) {
  if (!entity) {
    throw new Error('Cannot add an id if entity is not defined')
  }
  if (entity.url) {
    const values = entity.url.split('/')
    for (let i = values.length; i > 0; i--) {
      const value = values[i]
      if (value != undefined && value !== '') {
        if (value.indexOf('?') === -1 && !isNaN(+value)) {
          return value
        }
      }
    }
    return 'unknown'
  }
}
