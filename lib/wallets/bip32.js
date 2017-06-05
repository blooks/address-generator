'use strict'

var bitcore = require('bitcore-lib')
var Wallet = require('./wallet')
var log = require('@blooks/log').child({component: 'BIP32Wallet'})
var async = require('async')

class BIP32Wallet extends Wallet {
  _derive (startIndex, endIndex, chain) {
    return function (callback) {
      var masterPublicKey = new bitcore.HDPublicKey(this.hdseed)
      var index = startIndex
      var addresses = []
      var batchSize = endIndex - startIndex
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
              var key = masterPublicKey.derive(('m/0/' + index).toString()).publicKey
              address.address = bitcore.Address.fromPublicKey(key).toString()
              break
            case 'change':
              var changeKey = masterPublicKey.derive(('m/1/' + index).toString()).publicKey
              address.address = bitcore.Address.fromPublicKey(changeKey).toString()
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

module.exports = BIP32Wallet
