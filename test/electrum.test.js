import MONGO_URL from './mongo'

import Promise from 'bluebird'
require('should')
const async = require('async')

const TestDataManager = require('@blooks/test-data').Manager
const Helper = require('./helper.test.js')
const helper = new Helper(MONGO_URL)
const testDataManager = new TestDataManager(MONGO_URL)

describe.only('Tests for electrum wallet', function () {
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
      beforeEach(function (done) {
        testDataManager.fillDB(['wallets'], done)
      })
      afterEach(function (done) {
        testDataManager.emptyDB(['wallets', 'addresses'], done)
      })
      it('should generate 400 addresses for electrum wallet', function () {
        return helper.getWallet(testDataManager.getWallet('electrum'))
          .then(helper.updateWallet.bind(helper))
          .then(helper.getWallet.bind(helper))
          .then(helper.checkWallet.bind(helper))
          .then(helper.checkAddresses.bind(helper))
      })
    })
  })
})
