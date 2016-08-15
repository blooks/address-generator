const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost/coyno-address-generator-tests'

var TestDataManager = require('@blooks/test-data').Manager

require('should')

var _ = require('lodash')

var log = require('@blooks/log').child({component: 'ElectrumWalletTests'})
var async = require('async')
var Helper = require('./helper.js')
var helper = new Helper(MONGO_URL)
var testDataManager = new TestDataManager(MONGO_URL)

describe('Tests for electrum wallet', function () {
  describe('Derivation tests', function () {
    before(function (done) {
      async.parallel([
        testDataManager.start.bind(testDataManager),
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
        testDataManager.emptyDB(['wallets', 'addresses'], done)
      })
      describe('Update electrum wallet', function () {
        it('should generate 400 addresses for electrum wallet', function (done) {
          helper.getWallet(testDataManager.getWallet('electrum'))
            .then(helper.updateWallet.bind(helper))
            .then(helper.getWallet.bind(helper))
            .then(helper.checkWallet.bind(helper))
            .then(helper.checkAddresses.bind(helper))
            .then(done).catch(done)
        })
      })
    })
  })
})
