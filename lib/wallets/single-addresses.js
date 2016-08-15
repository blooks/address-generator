'use strict'

var _ = require('lodash')
var log = require('@blooks/log').child({component: 'SingleAddressesWallet'})

var Wallet = require('./wallet')

class SingleAddressesWallet extends Wallet {
  deriveAddresses (callback) {
    log.debug('Deriving Addresses for single address wallet. Nothing to do.')
    return callback(null)
  }
}
module.exports = SingleAddressesWallet
