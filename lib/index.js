var wallets = require('./wallets')

var log = require('@blooks/log')
var kue = require('kue')
const Jobs = require('@blooks/jobs')

var Mongo = require('@blooks/mongo')

class AddressGenerator {
  constructor (redisUrl, mongoUrl) {
    this._queue = kue.createQueue({
      redis: redisUrl
    })
    this._jobs = new Jobs(redisUrl)
    this._mongo = new Mongo(mongoUrl)
  }

  _getWalletByType (wallet) {
    switch (wallet.type) {
      case 'armory':
        return new wallets.ArmoryWallet(wallet, this._mongo, this._jobs)
      case 'bitcoin-wallet':
      case 'trezor':
      case 'mycelium':
      case 'electrum2':
        return new wallets.BIP32Wallet(wallet, this._mongo, this._jobs)
      case 'electrum':
        return new wallets.ElectrumWallet(wallet, this._mongo, this._jobs)
      case 'single-addresses':
        return new wallets.SingleAddressesWallet(wallet, this._mongo, this._jobs)
    }
  }

  loadWallet (walletId, userId, callback) {
    this._mongo.db.collection('bitcoinwallets').findOne({ _id: walletId, userId: userId }, callback)
  }

  start (callback) {
    this._mongo.start((err) => {
      if (err) {
        throw err
      }
      this._queue.process('wallet.update', (job, done) => {
        log.info({ wallet: job.data.walletId }, 'Processing job for wallet update')
        if (!job.data.walletId) {
          log.error('Invalid Wallet Id')
          return done('Invalid Wallet Id')
        }
        if (!job.data.userId) {
          log.error('Invalid User Id')
          return done('Invalid User Id')
        }
        var complete = job.data.complete

        this.loadWallet(job.data.walletId, job.data.userId, (err, wallet) => {
          if (err) {
            return done(err)
          }
          if (!wallet) {
            log.error({
              job: job.data
            }, 'Wallet not found')
            return done('Wallet not found')
          }

          wallet = this._getWalletByType(wallet)

          if (!wallet) {
            return done('Invalid wallet type')
          }
          wallet.update(complete, done)
        })
      })
      callback()
    })
  }
}

module.exports = AddressGenerator
