
require('should');
var mongo = require('coyno-mongo');
var _ = require('lodash');
var Q = require('q');
var log = require('coyno-log').child({component: 'ElectrumWalletTests'});

var BIP32Wallet = require('../lib/bip32');
var SingleAddressesWallet = require('../lib/single-addresses');
var ElectrumWallet = require('../lib/electrum');
var ArmoryWallet = require('../lib/armory');


var checkAddresses = function (wallet) {
  var deferred = Q.defer();
  log.debug('Checking Addresses');
  mongo.db.collection('bitcoinaddresses').find({}).toArray(function(err, addresses) {
    if (err) return deferred.reject(err);
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
};


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
      case 'single-addresses':
        return deferred.resolve(new SingleAddressesWallet(result[0]));
      case 'electrum':
        return deferred.resolve(new ElectrumWallet(result[0]));
      case 'armory':
        return deferred.resolve(new ArmoryWallet(result[0]));
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


module.exports = {
  checkAddresses : checkAddresses,
  getWallet : getWallet,
  checkWallet: checkWallet,
  updateWallet: updateWallet
};
