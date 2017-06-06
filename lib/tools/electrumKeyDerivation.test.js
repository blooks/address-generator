import { expect } from 'chai'
import nock from 'nock'
import _ from 'lodash'

import ElectrumKeyDerivation from './electrumKeyDerivation'
import { mpk, addresses } from './ekdData.test.json'

const electrumKeyDerivation = ElectrumKeyDerivation({oracleUrl: 'http://localhost.local'})

describe('Electrum Key Derivation Unit tests', function () {
  it('should throw an error when not providing oracleUrl', function () {
    return expect(() => { ElectrumKeyDerivation() }).to.throw(/oracle URL/)
  })
  describe('Single Address tests', function () {
    beforeEach(function () {
      nock('http://localhost.local')
        .get(`/${mpk}`)
        .query({start: 0, end: 1})
        .reply(200, {
          '0': addresses[0]
        })
    })
    it('should correctly derive a electrum address', function () {
      const expectedResult = {
        '0': addresses[0]
      }
      return electrumKeyDerivation({mpk, start: 0, end: 1}).then(result => {
        expect(result).to.deep.equal(expectedResult)
      })
    })
  })
  describe('Single Address tests', function () {
    beforeEach(function () {
      nock('http://localhost.local')
        .get(`/${mpk}`)
        .query({start: 0, end: 45})
        .reply(200, _.pick(addresses, _.range(0, 45)))
    })
    it('should correctly derive a electrum address', function () {
      const expectedResult = _.pick(addresses, _.range(0, 45))
      return electrumKeyDerivation({mpk, start: 0, end: 45}).then(result => {
        expect(result).to.deep.equal(expectedResult)
      })
    })
  })
})
