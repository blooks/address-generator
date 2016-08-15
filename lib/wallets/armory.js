'use strict'

var _ = require('lodash')
var Wallet = require('./wallet')
var armory = require('bitcore-armory')
var log = require('@blooks/log').child({component: 'Armory Wallet'})
var async = require('async')

class ArmoryWallet extends Wallet {
  _derive (startIndex, endIndex, chain) {
    return function (callback) {
      if (chain === 'change') {
        log.debug('Computing change addresses for armory. Armory does not have change chain. Doing nothing.')
        return callback()
      }
      var masterPublicKey = new armory.ArmoryRootPublicKey(this.hdseed.id, this.hdseed.data)
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
              var key = masterPublicKey.derive(index)
              address.address = key.toAddress().toString()
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

module.exports = ArmoryWallet
