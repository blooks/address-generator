import { expect } from 'chai'
import nock from 'nock'
import _ from 'lodash'

import ElectrumKeyDerivation from './electrumKeyDerivation'
import { mpk, addresses } from './ekdData.test.json'

const electrumKeyDerivation = ElectrumKeyDerivation({oracleUrl: 'http://localhost.local'})

describe.only('Electrum Key Derivation Unit tests', function () {
  it('should throw an error when not providing oracleUrl', function () {
    return expect(() => { ElectrumKeyDerivation() }).to.throw(/oracle URL/)
  })
  describe('Single Address tests', function () {
    beforeEach(function () {
      nock('http://localhost.local')
        .get(`/${mpk}`)
        .query({from: 0, to: 0})
        .reply(200, {
          '0': addresses[0]
        })
    })
    it('should correctly derive a electrum address', function () {
      const expectedResult = {
        '0': addresses[0]
      }
      return electrumKeyDerivation({mpk, from: 0, to: 0}).then(result => {
        expect(result).to.deep.equal(expectedResult)
      })
    })
  })
  describe('Single Address tests', function () {
    beforeEach(function () {
      nock('http://localhost.local')
        .get(`/${mpk}`)
        .query({from: 0, to: 45})
        .reply(200, _.pick(addresses, _.range(0, 46)))
    })
    it('should correctly derive a electrum address', function () {
      const expectedResult = _.pick(addresses, _.range(0, 46))
      return electrumKeyDerivation({mpk, from: 0, to: 45}).then(result => {
        expect(result).to.deep.equal(expectedResult)
      })
    })
  })
})
