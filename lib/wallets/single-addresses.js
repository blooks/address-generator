'use strict'

var _ = require('lodash')
var log = require('@blooks/log').child({ component: 'SingleAddressesWallet' })

var Wallet = require('./wallet')

class SingleAddressesWallet extends Wallet {
  deriveAddresses (callback) {
    log.debug({
      id: this._id
    }, 'Deriving Addresses for single address wallet.')
    this._mongo.db.collection('bitcoinaddresses').findOne({ walletId: this._id }, (err, address) => {
      if (err) {
        return callback(err)
      }
      log.debug({
        hdseed: this.hdseed
      }, 'Looked up single address')
      if (!address) {
        return this._saveAddresses([{
          address: this.hdseed,
          order: -1
        }], callback)
      }
      callback()
    })
  }
}
module.exports = SingleAddressesWallet
