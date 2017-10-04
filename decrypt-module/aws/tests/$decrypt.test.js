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
const pki = require('node-forge').pki;

function stubSsmGetParameter(test, error = null, result = null) {
    const ssmGetParameter = test.stub().callsArgWith(1, error, result);
    AWS.mock('SSM', 'getParameter', ssmGetParameter);
    return ssmGetParameter;
}

// --
const spk = require('../src/index.js');

describe('spk-decrypt', function () {

    describe('$decrypt', function () {

        it('should decrypt a message', sinonTest(function () {
            const privateKeyAsPem = fs.readFileSync(`${fixtures}/private-pepito.pem`, 'utf8');
            stubSsmGetParameter(this, null, { Parameter: { Value: privateKeyAsPem } });
            const ciphertext = fs.readFileSync(`${fixtures}/$decrypt/pepito.spk`).toString();
            const plaintext = fs.readFileSync(`${fixtures}/$decrypt/plaintext.json`, 'utf8');
            return expect(spk.$decrypt({pairId: 'pepito', ciphertext})).to.eventually.eql(plaintext);
        }));

    });

});
