var TestDataManager = require('coyno-mockup-data').Manager;


require('should');
var _ = require('lodash');
var Helper = require('./helper.js');

var testDataManager = new TestDataManager();

describe('Tests for Package Coyno Wallets', function() {

  describe('Unit tests', function () {
  });

  describe('Integration tests', function () {
    before(function (done) {
      testDataManager.initDB(function (err) {
        if (err) return done(err);
        testDataManager.fillDB(['exchangeRates'], done);
      });
    });
    after(function (done) {
      testDataManager.closeDB(done);
    });

    describe('Wallet jobs tests', function() {


      before(function (done) {
        testDataManager.fillDB(['wallets'],done);
      });

      after(function (done) {
        testDataManager.emptyDB(['wallets','transfers','addresses'],done);
      });
      describe('Update bitcoin wallet', function () {
        it('should update all transactions for bitcoin wallet', function (done) {
          Helper.getWallet(testDataManager.getWallet('bip32'))
            .then(Helper.updateWallet)
            .then(Helper.getWallet)
            .then(Helper.checkWallet)
            .then(Helper.checkAddresses)
            .then(done).catch(done);
        });
      });
    });
    if (process.env.HEAVY_DUTY) {
      describe('Heavy duty tests', function () {
        this.timeout(120000);
        before(function (done) {
          testDataManager.fillDB(['wallets', 'addresses'], done);
        });

        after(function (done) {
          testDataManager.emptyDB(['wallets', 'transfers', 'addresses'], done);
        });
        describe('Update bitcoin wallet', function () {
          it('should update all transactions for bitcoin wallet', function (done) {
            getWallet(testDataManager.getWallet('single-addresses'))
              .then(updateWallet)
              .then(getWallet)
              .then(checkWallet)
              .then(checkTransfers)
              .then(done).catch(done);
          });
        });
      });
    }
  });
});

