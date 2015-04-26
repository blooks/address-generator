var TestDataManager = require('coyno-mockup-data').Manager;


require('should');
var mongo = require('coyno-mongo');
var _ = require('lodash');
var Q = require('q');
var debug = require('debug')('coyno:wallet-tests');
var BIP32Wallet = require('../lib/bip32');
var SingleAddressesWallet = require('../lib/single-addresses');

var testDataManager = new TestDataManager();

var getWallet = function(wallet) {
  var deferred = Q.defer();
  debug('Getting Wallet');
  debug('Coyno Mongo Object:', mongo.db);
  mongo.db.collection('bitcoinwallets').find({_id: wallet._id}).toArray(function (err, result) {
    if (err) {
      return deferred.reject(err);
    }
    if (!result || result.length < 1) {
      return deferred.reject(new Error('Getting wallet but no wallet found in DB!'))
    }
    debug("Got wallet:", result[0]);
    if (result[0].type === 'single-addresses') {
      return deferred.resolve(SingleAddressesWallet(result[0]));
    }
    return deferred.resolve(BIP32Wallet(result[0]));
  });
  return deferred.promise;
};

var checkWallet = function(wallet) {
  var deferred = Q.defer();
  debug('Checking Wallet');
  wallet.should.have.property('_id');
  wallet.updating.should.be.equal(false);
  deferred.resolve(wallet);
  return deferred.promise;
};

var updateWallet = function(wallet) {
  var deferred = Q.defer();
  debug('Updating Wallet');
  wallet.update(function(err) {
    if (err) return deferred.reject(err);
    deferred.resolve(wallet);
  });
  return deferred.promise;
};

function checkTransfers() {

  var deferred = Q.defer();
  debug('Checking Transfers');
  mongo.db.collection('transfers').find({}).toArray(function(err, transfers) {
    if (err) return deferred.reject(err);
    transfers.length.should.be.above(90);
    transfers.forEach(function(transfer) {
      transfer.should.have.property('_id');
      transfer.should.have.property('foreignId');
      transfer.should.have.property('date');
      transfer.should.have.property('details');
      transfer.should.have.property('userId');
      transfer.should.have.property('sourceId');
      transfer.should.have.property('updatedAt');
      transfer.should.have.property('createdAt');
      transfer.should.have.property('representation');
      transfer.should.have.property('baseVolume');
    });
    deferred.resolve();
  });
  return deferred.promise;
}



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
          getWallet(testDataManager.getWallet('bip32'))
            .then(updateWallet)
            .then(getWallet)
            .then(checkWallet)
            .then(checkTransfers)
            .then(done).catch(done);
        });
      });
    });

    describe('Heavy duty tests', function() {


      before(function (done) {
        testDataManager.fillDB(['wallets','addresses'],done);
      });

      after(function (done) {
        testDataManager.emptyDB(['wallets','transfers','addresses'],done);
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

  });
});

