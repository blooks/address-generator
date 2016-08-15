'use strict'

var _ = require('lodash')
var Wallet = require('./wallet')
var log = require('@blooks/log').child({component: 'Electrum Wallet'})
var async = require('async')

class ElectrumWallet extends Wallet {
  _derive (startIndex, endIndex, chain) {
    return function (callback) {
      log.warn('Electrum Wallet. Doing nothing until library is fixed.')
      return callback(null)
      var masterPublicKey = new Electrum(this.hdseed)
      var index = startIndex
      var addresses = []
      var batchSize = Math.max(0, endIndex - startIndex)
      log.debug('Deriving ' + batchSize + ' Addresses')
      async.whilst(function () {
          return index < endIndex
        },
        function (cb) {
          var address = {
            derivationParams: {
              'chain': chain,
              'order': index
            }
          }
          switch (chain) {
            case 'main':
              var key = masterPublicKey.generatePubKey(index)
              address.address = bitcore.Address.fromPublicKey(new bitcore.PublicKey(key)).toString()
              break
            case 'change':
              var changekey = masterPublicKey.generateChangePubKey(index)
              address.address = bitcore.Address.fromPublicKey(new bitcore.PublicKey(changekey)).toString()
              break
          }
          addresses.push(address)
          ++index
          return cb()
        },
        function (err) {
          if (err) {
            return callback(err)
          }
          return callback(null, addresses)
        }
      )
    }
  }
}

module.exports = ElectrumWallet
