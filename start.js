var log = require('@blooks/log')

var AddressGenerator = require('./index.js')

if (!process.env.REDIS_URL) {
  log.warn('No REDIS_URL set in environment. Defaulting to localhost.')
}
if (!process.env.REDIS_URL) {
  log.warn('No MONGO_URL set in environment. Defaulting to localhost.')
}
var redisUrl = process.env.REDIS_URL || 'redis://localhost'
var mongoUrl = process.env.MONGO_URL || 'mongodb://localhost/blooks'

var addressGenerator = new AddressGenerator(redisUrl, mongoUrl)

addressGenerator.start(function (err) {
  if (err) {
    return log.error(err)
  }
  log.info('Address Generator started')
})
