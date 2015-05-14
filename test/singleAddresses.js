var TestDataManager = require('coyno-mockup-data').Manager;


require('should');
var mongo = require('coyno-mongo');
var _ = require('lodash');
var Q = require('q');
var log = require('coyno-log').child({component: 'SingleAddressesWalletTests'});

var SingleAddressesWallet = require('../lib/single-addresses');
var BIP32Wallet = require('../lib/bip32');
var Helper = require('./helper.js');

var testDataManager = new TestDataManager();


describe('Tests for single address wallet', function() {
  describe('Derivation tests', function () {
    before(function (done) {
      testDataManager.initDB(done);
    });
    after(function (done) {
      testDataManager.closeDB(done);
    });
    describe('Wallet jobs tests', function() {
      before(function (done) {
        testDataManager.fillDB(['wallets'],done);
      });
      after(function (done) {
        testDataManager.emptyDB(['wallets','addresses'],done);
      });
      describe('Update single address wallet', function () {
        it('should generate 0 addresses for single addresses wallet', function (done) {
          Helper.getWallet(testDataManager.getWallet('single-addresses'))
            .then(Helper.updateWallet)
            .then(Helper.getWallet)
            .then(Helper.checkWallet)
            .then(Helper.checkAddresses)
            .then(done).catch(done);
        });
      });
    });
  });
});

