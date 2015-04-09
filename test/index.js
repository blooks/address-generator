
var TestDataManager = require('./testData');

var mongo = require('coyno-mongo');
var should = require('should');
var _ = require('lodash');
var Q = require('q');
var debug = require('debug')('coyno:wallet-tests');
var BIP32Wallet = require('../lib/bip32');
var testDataManager = new TestDataManager();

var getWallet = function(wallet) {
  var deferred = Q.defer();
  mongo.db.collection('bitcoinwallets').find({_id: wallet._id}).toArray(function (err, result) {
      if (!result || result.length < 1) {
        deferred.reject(new Error('Getting wallet but no wallet found in DB!'))
      } else {
        debug("Got wallet:");
        debug(result[0]);
        deferred.resolve(BIP32Wallet(result[0]));
      }
    });
  return deferred.promise;
};

var checkWallet = function(wallet) {
  var deferred = Q.defer();
  wallet.should.have.property('_id');
  wallet.updating.should.be.equal(false);
  deferred.resolve(wallet);
  return deferred.promise;
};

var updateWallet = function(wallet) {
  var deferred = Q.defer();
  wallet.update(function(err) {
    if (err) return deferred.reject(err);
    deferred.resolve(wallet);
  });
  return deferred.promise;
};

function checkTransfers() {

  var deferred = Q.defer();
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

before(function(done) {
  testDataManager.initDB(function(err) {
    done(err);
  });
});
after(function(done) {
  testDataManager.closeDB(function(err) {
    if (err) console.log(err);
    done(err);
  });
});


describe('Basic Tests', function() {

  before(function(done) {

    testDataManager.fillDB(function(err) {
      done(err);
    });
  });
  after(function(done) {
    testDataManager.emptyDB(function(err) {
      if (err) console.log(err);
      done(err);
    });
  });
  describe('Update bitcoin wallet', function () {
    it('should update all transactions for bitcoin wallet', function (done) {
      getWallet({_id:"E2kQargHKujeY442B"})
        .then(updateWallet)
        .then(getWallet)
        .then(checkWallet)
        .then(checkTransfers)
        .then(done).catch(done);
    });
  });
});

