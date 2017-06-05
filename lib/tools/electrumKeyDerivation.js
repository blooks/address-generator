import request from 'superagent'

export default ({oracleUrl} = {}) => {
  if (!oracleUrl) {
    throw new Error('Need to provide oracle URL!')
  }
  return ({mpk, from, to}) => {
    return request.get(`${oracleUrl}/${mpk}`).type('json').query({
      from,
      to
    }).then(({body}) => body)
  }
}
