const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost/coyno-address-generator-tests'


var TestDataManager = require('@blooks/test-data').Manager

require('should')
var async = require('async')
var Helper = require('./helper.js')
var helper = new Helper(MONGO_URL)

var testDataManager = new TestDataManager(MONGO_URL)

describe('Tests for armory wallet', function () {
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
      describe('Update armory wallet', function () {
        it('should generate 400 addresses for armory wallet', function (done) {
          helper.getWallet(testDataManager.getWallet('armory'))
            .then(helper.updateWallet)
            .then(helper.getWallet)
            .then(helper.checkWallet)
            .then(helper.checkAddresses)
            .then(done).catch(done)
        })
      })
    })
  })
})
