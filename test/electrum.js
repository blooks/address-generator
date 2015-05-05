var TestDataManager = require('coyno-mockup-data').Manager;


require('should');
var mongo = require('coyno-mongo');
var _ = require('lodash');
var Q = require('q');
var log = require('coyno-log').child({component: 'ElectrumWalletTests'});
var ElectrumWallet = require('../lib/electrum');
var SingleAddressesWallet = require('../lib/single-addresses');
var BIP32Wallet = require('../lib/bip32');


var testDataManager = new TestDataManager();

var getWallet = function(wallet) {
  var deferred = Q.defer();
  log.debug('Getting Wallet');
  mongo.db.collection('bitcoinwallets').find({_id: wallet._id}).toArray(function (err, result) {
    if (err) {
      return deferred.reject(err);
    }
    if (!result || result.length < 1) {
      return deferred.reject(new Error('Getting wallet but no wallet found in DB!'))
    }
    switch (result[0].type) {
      case 'singleAddresses':
        return deferred.resolve(new SingleAddressesWallet(result[0]));
      case 'electrum':
        return deferred.resolve(new ElectrumWallet(result[0]));
    }
    return deferred.resolve(new BIP32Wallet(result[0]));
  });
  return deferred.promise;
};

var checkWallet = function(wallet) {
  var deferred = Q.defer();
  log.debug('Checking Wallet');
  wallet.should.have.property('_id');
  wallet.should.have.property('userId');
  wallet.should.have.property('type');
  wallet.should.have.property('updating');
  deferred.resolve(wallet);
  return deferred.promise;
};

var updateWallet = function(wallet) {
  var deferred = Q.defer();
  log.debug('Updating Wallet');
  wallet.update(function(err) {
    if (err) return deferred.reject(err);
    deferred.resolve(wallet);
  });
  return deferred.promise;
};

function checkAddresses(wallet) {
  var deferred = Q.defer();
  log.debug('Checking Transfers');
  mongo.db.collection('bitcoinaddresses').find({}).toArray(function(err, addresses) {
    if (err) return deferred.reject(err);
    addresses.length.should.be.above(100);
    addresses.forEach(function(address) {
      address.should.have.property('userId');
      address.userId.should.be.equal(wallet.userId);
      address.should.have.property('_id');
      address.should.have.property('walletId');
      address.walletId.should.be.equal(wallet._id);
      address.should.have.property('derivationParams');
      address.should.have.property('address');
      address.should.have.property('balance');
      address.should.have.property('createdAt');
      address.should.have.property('updatedAt');
    });
    deferred.resolve();
  });
  return deferred.promise;
}



describe('Tests for electrum wallet', function() {
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
      describe('Update electrum wallet', function () {
        it('should generate 400 addresses for electrum wallet', function (done) {
          getWallet(testDataManager.getWallet('electrum'))
            .then(updateWallet)
            .then(getWallet)
            .then(checkWallet)
            .then(checkAddresses)
            .then(done).catch(done);
        });
      });
    });
  });
});

