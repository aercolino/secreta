const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const sinonTest = require('sinon-test')(sinon);

chai.use(chaiAsPromised);
chai.use(sinonChai);
const { expect } = chai;
// --

const fs = require('fs');
const fixtures = `${__dirname}/fixtures`;

const AWS = require('mock-aws');
let pki = require('node-forge').pki;

require('console.mute');
const { $wrapPromise } = require('@aercolino/wrap-promise');
process.env.SUPPRESS_NO_CONFIG_WARNING = true;
const config = require('config');

function stubRSA(test, error = null, result = null) {
    pki.privateKeyFromPem = test.stub().returns(result);
}

function stubSsmGetParameter(test, error = null, result = null) {
    const ssmGetParameter = test.stub().callsArgWith(1, error, result);
    AWS.mock('SSM', 'getParameter', ssmGetParameter);
    return ssmGetParameter;
}

// --
const spk = require('../src/index.js');

describe('secreta-decrypt', function () {

    describe('$mergeSecrets', function () {

        it('should throw when some secret is missing', sinonTest(function (done) {
            const configWithSecrets = config.util.loadFileConfigs(`${fixtures}/$mergeSecrets/missing-secret/config`);
            spk.$mergeSecrets(configWithSecrets, `${fixtures}/$mergeSecrets/missing-secret/**/*.spk`)
                .then((data) => {
                    done(new Error('Expected a rejection.'));
                })
                .catch((err) => {
                    expect(err).to.match(/\bExpected a secret for Customer.credit.initialLimit\b/);
                    done();
                });
        }));

        it('should merge secrets when nothing is missing', sinonTest(function (done) {
            const configWithSecrets = config.util.loadFileConfigs(`${fixtures}/$mergeSecrets/all-fine/config`);
            spk.$mergeSecrets(configWithSecrets, `${fixtures}/$mergeSecrets/all-fine/**/*.spk`)
                .then((data) => {
                    expect(data.Customer.dbConfig.host).to.equal('localhost');
                    expect(data.Customer.dbConfig.port).to.equal(5984);
                    expect(data.Customer.dbConfig.dbName).to.equal('customers');
                    expect(data.Customer.credit.initialLimit).to.equal(100);
                    expect(data.Customer.credit.initialDays).to.equal(1);
                    done();
                })
                .catch((err) => {
                    done(new Error('Expected a fulfillment.'));
                });
        }));

    });

});
