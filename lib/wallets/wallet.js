'use strict'

var _ = require('lodash')
var async = require('async')
var log = require('@blooks/log').child({ component: 'Wallet' })
var Random = require('meteor-random')

var bufferSize = 200

class Wallet {
  constructor (walletData, mongoConnection, jobs) {
    _.extend(this, walletData)
    this._mongo = mongoConnection
    this._jobs = jobs
  }

  _loadDerivationParams (callback) {
    this.derivationParams = this.derivationParams || {}
    log.trace({ wallet: this }, 'Derivation params')
    if (!this.derivationParams.change || !this.derivationParams.change.lastDerived) {
      this.derivationParams = _.extend(this.derivationParams, {
        change: {
          lastDerived: 0
        }
      })
      if (!this.derivationParams.change.lastUsed) {
        this.derivationParams.change.lastUsed = 0
      }
    }
    if (!this.derivationParams.main || !this.derivationParams.main.lastDerived) {
      this.derivationParams = _.extend(this.derivationParams, {
        main: {
          lastDerived: 0
        }
      })
      if (!this.derivationParams.main.lastUsed) {
        this.derivationParams.main.lastUsed = 0
      }
    }
    if (this.complete) {
      this.derivationParams.main.lastDerived = 0
      this.derivationParams.change.lastDerived = 0
    }
    callback()
  }

  _metaData () {
    var now = new Date()
    return {
      _id: Random.id(),
      userId: this.userId,
      walletId: this._id,
      balance: 0,
      createdAt: now,
      updatedAt: now
    }
  }

  _saveAddresses (addresses, callback) {
    var self = this
    addresses = _.map(addresses, (address) => {
      return _.extend(address, self._metaData())
    })
    log.debug({ numAddresses: addresses.length }, 'Saving addresses to db.')
    var addressesCollection = this._mongo.db.collection('bitcoinaddresses')
    var bulk = addressesCollection.initializeUnorderedBulkOp()
    if (addresses.length > 0) {
      addresses.forEach((address) => {
        bulk.insert(address)
      })
      return bulk.execute((err) => {
        if (err) {
          if (err.code === 11000) {
            log.debug('Some addresses were already in the db.')
          } else {
            return callback(err)
          }
        }
        var addressStrings = _.map(addresses, 'address')
        var addressStringsChunks = _.chunk(addressStrings, 100)
        _.forEach(addressStringsChunks, (addressChunk) => {
          if (this._jobs) {
            this._jobs.addJob(
              'addresses.fetchTransactions',
              { addresses: addressChunk, userId: self.userId, walletId: self._id },
              (err) => {
                if (err) {
                  log.error({error: err}, 'Failed to save a job to fetch transactions for addresses')
                }
                log.debug('Sucessfully saved job to fetch transactions for addresses')
              }
            )
          } else {
            log.warn('No jobs connection present. Will not create jobs for transaction fetching.')
          }
        })
        callback()
      })
    }
    log.warn({ wallet: this._id }, 'No Addresses generated for wallet!')
    return callback()
  }

  _updateSingleAddresses (callback) {
    var self = this
    return this._mongo.db.collection('bitcoinaddresses').find({
      walletId: self._id,
      userId: self.userId,
      order: -1
    }).toArray((err, addresses) => {
      if (err) {
        return callback(err)
      }
      var addressStrings = _.map(addresses, (address) => {
        return address.address
      })
      log.debug({
        addresses: addressStrings
      }, 'Dispatching updates for single addresses')
      if (this._jobs) {
        this._jobs.addJob(
          'addresses.fetchTransactions',
          { addresses: addressStrings, userId: self.userId, walletId: self._id },
          (err) => {
            if (err) {
              log.error({error: err}, 'Failed to save a job to fetch transactions for addresses')
            }
            log.debug('Sucessfully saved job to fetch transactions for addresses')
          }
        )
      } else {
        log.warn('No jobs connection present. Will not create jobs for transaction fetching.')
      }
      return callback()
    })
  }

  _saveDerivationParams (callback) {
    if (!callback) {
      throw new Error('No callback object!')
    }
    var walletCollection = this._mongo.db.collection('bitcoinwallets')
    log.trace({ derivationParams: this.derivationParams }, 'Saving derivation params')
    walletCollection.update({ _id: this._id }, { $set: { 'derivationParams': this.derivationParams } }, callback)
  }

  update (complete, callback) {
    if (!callback) {
      throw new Error('No callback object!')
    }
    var self = this
    log.trace({ wallet: this._id }, 'Update wallet')

    this.complete = complete
    async.series([
      this._loadDerivationParams.bind(this),
      this.deriveAddresses.bind(this),
      this._saveDerivationParams.bind(this)
    ], (err) => {
      if (err) {
        log.error({
          error: err
        }, 'Wallet update failed')
        return callback(err)
      }
      if (complete) {
        return self._updateSingleAddresses(callback)
      } else {
        return callback(null)
      }
    })
  }

  remove (callback) {
    log.trace({ wallet: this._id }, 'Remove addresses from wallet')
    callback()
  }

  deriveAddresses (callback) {
    var self = this
    log.debug({ type: this.type }, 'Deriving Addresses for Wallet (version 1)')
    var derivationParams = self.derivationParams
    // TODO: Check whether we have an overlap here. So long better save than sorry.
    var startIndexMain = parseInt(derivationParams.main.lastDerived, 10)
    var endIndexMain = parseInt(derivationParams.main.lastUsed, 10) + parseInt(bufferSize, 10)
    // TODO: Same as above.
    var startIndexChange = parseInt(derivationParams.change.lastDerived, 10)
    var endIndexChange = parseInt(derivationParams.change.lastUsed, 10) + parseInt(bufferSize, 10)
    // Update last derived address index for both chains.
    this.derivationParams.change.lastDerived = parseInt(endIndexChange)
    this.derivationParams.main.lastDerived = parseInt(endIndexMain)
    async.parallel([
      self._derive(startIndexMain, endIndexMain, 'main').bind(this),
      self._derive(startIndexChange, endIndexChange, 'change').bind(this)
    ], (err, results) => {
      if (err) {
        return callback(err)
      }
      results = _.flatten(results)
      results = _.filter(results, (result) => {
        return (result !== undefined)
      })
      self._saveAddresses(results, callback)
    })
  }
}

module.exports = Wallet
