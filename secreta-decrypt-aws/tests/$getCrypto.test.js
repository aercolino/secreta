const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const sinonTest = require('sinon-test')(sinon);

chai.use(chaiAsPromised);
chai.use(sinonChai);
const { expect } = chai;
// --

const AWS = require('mock-aws');
let pki = require('node-forge').pki;

function stubRSA(test, error = null, result = null) {
    pki.privateKeyFromPem = test.stub().returns(result);
}

function stubSsmGetParameter(test, error = null, result = null) {
    const ssmGetParameter = test.stub().callsArgWith(1, error, result);
    AWS.mock('SSM', 'getParameter', ssmGetParameter);
    return ssmGetParameter;
}

// This is needed to avoid hitting a cache, so it's an alternative to reload(path).
let counter = 0;

function makeUnique(x) {
    return `${x}_${counter++}`;
}

// --
const secretaDecrypt = require('../src/index.js');

describe('secreta-decrypt', function () {

    describe('$getCrypto', function () {

        it('should throw when its pairId argument is not a string', sinonTest(function (done) {
            expect(() => {
                secretaDecrypt.$getCrypto(1);
            }).to.throw();
            done();
        }));

        it('should throw when its pairId argument is an empty string', sinonTest(function (done) {
            expect(() => {
                secretaDecrypt.$getCrypto('');
            }).to.throw();
            done();
        }));

        it('should call SSM getParameter with name Secreta/privateKey/<pairId>', sinonTest(function () {
            const ssmGetParameter = stubSsmGetParameter(this, null, { Parameter: { Value: 'private key stuff' } });
            stubRSA(this);
            const pairId = makeUnique('juanito');
            return secretaDecrypt.$getCrypto(pairId).then(() => {
                expect(ssmGetParameter).to.have.been.calledWithMatch(sinon.match({
                    Name: sinon.match(new RegExp(`^/Secreta/privateKey/${pairId}$`)),
                    WithDecryption: sinon.match(true),
                }));
            });
        }));

        it('should cache cryptos', sinonTest(function () {
            const ssmGetParameter = stubSsmGetParameter(this, null, { Parameter: { Value: 'private key stuff' } });
            stubRSA(this);
            const pairID = makeUnique('juanito');
            return secretaDecrypt.$getCrypto(pairID)
                .then(() => secretaDecrypt.$getCrypto(pairID)
                    .then(() => expect(ssmGetParameter).to.have.been.calledOnce))
        }));

        it('should throw when SSM getParameter returns an error', sinonTest(function (done) {
            const ssmGetParameter = stubSsmGetParameter(this, new Error('ParameterNotFound'));
            stubRSA(this);
            secretaDecrypt.$getCrypto(makeUnique('juanito'))
                .then(() => done(new Error('Expected a rejection.')))
                .catch(err => {
                    expect(err.message).to.match(/ParameterNotFound/);
                    done();
                });
        }));

    });

});
