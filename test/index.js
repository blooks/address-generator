
var TestDataManager = require('./testData');

var mongo = require('coyno-mongo');
var should = require('should');
var _ = require('lodash');
var coynoWallets = require('../index');
var BIP32Wallet = coynoWallets.BIP32Wallet;
var testDataManager = new TestDataManager();

var getWallet = function(db, id) {
  return function (callback) {
    db.collection('bitcoinwallets').find({_id: id}).toArray(function (err, result) {
      var wallet;
      if (result && result.length >= 1) {
        wallet = result[0];
      }
      callback(err, wallet);
    });
  }
};

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
      getWallet(mongo.db, "E2kQargHKujeY442B")(function (err, result) {
        if (err) return done(err);
        var wallet = new BIP32Wallet(result);
        wallet.update(done);
      });
    });
  });
});

