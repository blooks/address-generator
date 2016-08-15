const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost/coyno-address-generator-tests'

var TestDataManager = require('@blooks/test-data').Manager

require('should')
var _ = require('lodash')
var Helper = require('./helper.js')
var helper = new Helper(MONGO_URL)
var testDataManager = new TestDataManager(MONGO_URL)
var async = require('async')

describe('Tests for Package Coyno Wallets', function () {
  describe('Unit tests', function () {})

  describe('Integration tests', function () {
    before(function (done) {
      async.parallel([
        (callback) => {
          testDataManager.start(function (err) {
            if (err) return done(err)
            testDataManager.fillDB(['exchangeRates'], callback)
          })
        },
        helper.start.bind(helper)
      ], done)
    })
    after(function (done) {
      async.parallel([
        testDataManager.stop.bind(testDataManager),
        helper.stop.bind(helper)
      ], done)
    })

    describe('Wallet jobs tests', function () {
      before(function (done) {
        testDataManager.fillDB(['wallets'], done)
      })

      after(function (done) {
        testDataManager.emptyDB(['wallets', 'transfers', 'addresses'], done)
      })
      describe('Update bitcoin wallet', function () {
        it('should update all transactions for bitcoin wallet', function (done) {
          helper.getWallet(testDataManager.getWallet('bip32'))
            .then(helper.updateWallet)
            .then(helper.getWallet)
            .then(helper.checkWallet)
            .then(helper.checkAddresses)
            .then(done).catch(done)
        })
      })
    })
    if (process.env.HEAVY_DUTY) {
      describe('Heavy duty tests', function () {
        this.timeout(120000)
        before(function (done) {
          testDataManager.fillDB(['wallets', 'addresses'], done)
        })

        after(function (done) {
          testDataManager.emptyDB(['wallets', 'transfers', 'addresses'], done)
        })
        describe('Update bitcoin wallet', function () {
          it('should update all transactions for bitcoin wallet', function (done) {
            getWallet(testDataManager.getWallet('bip32'))
              .then(updateWallet)
              .then(getWallet)
              .then(checkWallet)
              .then(checkTransfers)
              .then(done).catch(done)
          })
        })
      })
    }
  })
})
