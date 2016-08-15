require('should')
var Mongo = require('@blooks/mongo')
var mongo
var _ = require('lodash')
var Q = require('q')
var log = require('@blooks/log').child({ component: 'ElectrumWalletTests' })

var BIP32Wallet = require('../lib/wallets/bip32')
var SingleAddressesWallet = require('../lib/wallets/single-addresses')
var ElectrumWallet = require('../lib/wallets/electrum')
var ArmoryWallet = require('../lib/wallets/armory')

class Helper {
  constructor (mongoUrl) {
    this._mongo = new Mongo(mongoUrl)
  }

  start (callback) {
    this._mongo.start(callback)
  }

  stop (callback) {
    this._mongo.stop(callback)
  }

  checkAddresses (wallet) {
    var deferred = Q.defer()
    log.debug('Checking Addresses')
    this._mongo.db.collection('bitcoinaddresses').find({walletId: wallet._id}).toArray( (err, addresses) => {
      if (err) return deferred.reject(err)
      addresses.forEach( (address) => {
        address.should.have.property('userId')
        address.userId.should.be.equal(wallet.userId)
        address.should.have.property('_id')
        address.should.have.property('walletId')
        address.walletId.should.be.equal(wallet._id)
        address.should.have.property('derivationParams')
        address.should.have.property('address')
        address.should.have.property('balance')
        address.should.have.property('createdAt')
        address.should.have.property('updatedAt')
      })
      deferred.resolve()
    })
    return deferred.promise
  }

  getWallet (wallet) {
    var deferred = Q.defer()
    log.debug('Getting Wallet')
    this._mongo.db.collection('bitcoinwallets').find({ _id: wallet._id }).toArray((err, result) => {
      if (err) {
        return deferred.reject(err)
      }
      if (!result || result.length < 1) {
        return deferred.reject(new Error('Getting wallet but no wallet found in DB!'))
      }
      switch (result[ 0 ].type) {
        case 'single-addresses':
          return deferred.resolve(new SingleAddressesWallet(result[ 0 ], this._mongo))
        case 'electrum':
          return deferred.resolve(new ElectrumWallet(result[ 0 ], this._mongo))
        case 'armory':
          return deferred.resolve(new ArmoryWallet(result[ 0 ], this._mongo))
      }
      return deferred.resolve(new BIP32Wallet(result[ 0 ], this._mongo))
    })
    return deferred.promise
  }

  checkWallet (wallet) {
    var deferred = Q.defer()
    log.debug('Checking Wallet')
    wallet.should.have.property('_id')
    wallet.should.have.property('userId')
    wallet.should.have.property('type')
    wallet.should.have.property('updating')
    deferred.resolve(wallet)
    return deferred.promise
  }

  updateWallet (wallet) {
    var deferred = Q.defer()
    log.debug('Updating Wallet')
    wallet.update(true, (err) => {
      if (err) return deferred.reject(err)
      deferred.resolve(wallet)
    })
    return deferred.promise
  }
}

module.exports = Helper
