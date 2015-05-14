var TestDataManager = require('coyno-mockup-data').Manager;


require('should');
var _ = require('lodash');
var log = require('coyno-log').child({component: 'ElectrumWalletTests'});

var SingleAddressesWallet = require('../lib/single-addresses');
var BIP32Wallet = require('../lib/bip32');
var Helper = require('./helper.js');

var testDataManager = new TestDataManager();

describe('Tests for armory wallet', function() {
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
      describe('Update armory wallet', function () {
        it('should generate 400 addresses for armory wallet', function (done) {
          Helper.getWallet(testDataManager.getWallet('armory'))
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

