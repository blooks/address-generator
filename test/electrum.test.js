import MONGO_URL from './mongo'
import nock from 'nock'
import Promise from 'bluebird'
import 'should'
import { expect } from 'chai'
import _ from 'lodash'
import async from 'async'

import { mpk, addresses } from './electrum.data.test.json'
const TestDataManager = require('@blooks/test-data').Manager
const Helper = require('./helper.test.js')
const helper = new Helper(MONGO_URL)
const testDataManager = new TestDataManager(MONGO_URL)

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
      before(function () {
        nock('http://localhost.local')
          .get(`/${mpk}`)
          .query({
            from: 0,
            to: 99
          })
          .reply(200, _.pick(addresses, _.range(0, 46)))
        return Promise.promisify((callback) => testDataManager.fillDB(['wallets'], callback))
      })
      after(function (done) {
        testDataManager.emptyDB(['wallets', 'addresses'], done)
      })
      it('should generate 400 addresses for electrum wallet', function () {
        return helper.getWallet(testDataManager.getWallet('electrum'))
          .then(helper.updateWallet.bind(helper))
          .then(helper.getWallet.bind(helper))
          .then(helper.checkWallet.bind(helper))
          .then(helper.checkAddresses.bind(helper))
          .then(helper.getAddresses.bind(helper)).then(addresses => {
            expect(addresses).to.have.length(400)
          })
      })
    })
  })
})
