const forge = require('node-forge');
const AWS = require('mock-aws');

const chai = require('chai');
const sinon = require('sinon');
const sinonTest = require('sinon-test')(sinon);
const sinonChai = require('sinon-chai');

chai.use(sinonChai);
const { expect } = chai;

const fakeError = new Error('Fake error: 42.');

const { promiseToCallLambda } = require('./lambdas-utils');
const { handler } = require('../dist/generateKeyPair');  // run `$ npm start` to create / update `../dist`

const invoke = promiseToCallLambda(handler);

function stubRSA(test, error = null) {
    const { pki } = forge;
    const { rsa } = pki;
    rsa.generateKeyPair = test.stub().callsArgWith(1, error, error ? null : { privateKey: '', publicKey: '' });
    pki.privateKeyToPem = test.stub().returns(`-----BEGIN RSA PRIVATE KEY-----
             this looks like garbage
             -----END RSA PRIVATE KEY-----`);
    pki.publicKeyToPem = test.stub().returns(`-----BEGIN PUBLIC KEY-----
             this looks like garbage
             -----END PUBLIC KEY-----`);
}

function stubSsmPutParameter(test, error = null) {
    const ssmPutParameter = test.stub().callsArgWith(1, error);
    AWS.mock('SSM', 'putParameter', ssmPutParameter);
    return ssmPutParameter;
}

function stubSsmAddTagsToResource(test, error = null) {
    const ssmAddTagsToResource = test.stub().callsArgWith(1, error);
    AWS.mock('SSM', 'addTagsToResource', ssmAddTagsToResource);
    return ssmAddTagsToResource;
}

function cbArguments(spy) {
    const [err, data] = spy.getCall(0).args;
    return { err, data };
}

console.log('Node version', process.version);

describe('AWS Lambda: generateKeyPair', function () {
    this.timeout(10000);

    it('should create a pair of keys, store the private one, and return the public one', sinonTest(function () {
        // stubRSA(this);
        const ssmPutParameter = stubSsmPutParameter(this);
        const ssmAddTagsToResource = stubSsmAddTagsToResource(this);
        const callbackSpy = this.spy();

        return invoke({ pairId: 'pepito', region: 'us-east-1', account: '123456789012' }, {}, callbackSpy)
            .then(() => {
                expect(ssmPutParameter).to.have.been.calledWith(sinon.match({
                    Name: sinon.match('/Secreta/privateKey/pepito'),
                    Value: sinon.match(/^-----BEGIN RSA PRIVATE KEY-----[\s\S]+-----END RSA PRIVATE KEY-----\s*$/),
                }));

                expect(ssmAddTagsToResource).to.have.been.calledWith(sinon.match({
                    ResourceId: sinon.match(':us-east-1:123456789012:')
                        && sinon.match('/Secreta/privateKey/pepito'),
                    Tags: [{
                        Key: sinon.match('Secreta'),
                        Value: sinon.match('privateKey'),
                    }],
                }));

                const { err, data } = cbArguments(callbackSpy);
                expect(err).to.be.null;
                expect(data).to.not.have.property('privateKey');
                expect(data).to.have.property('publicKey');
                expect(data.publicKey).to.match(/^-----BEGIN PUBLIC KEY-----[\s\S]+-----END PUBLIC KEY-----\s*$/);

                AWS.restore();
            });
    }));

    it('should throw when the pair ID is not given', sinonTest(function () {
        return invoke({ region: 'us-east-1', account: '123456789012' }, {})
            .catch((err) => {
                expect(err.message).to.match(/\bpair ID\b/);
            });
    }));

    it('should throw when the region is not given', sinonTest(function () {
        return invoke({ pairId: 'pepito', account: '123456789012' }, {})
            .catch((err) => {
                expect(err.message).to.match(/\bregion\b/);
            });
    }));

    it('should be fine when the region is given as an environment variable', sinonTest(function () {
        stubRSA(this);
        stubSsmPutParameter(this);
        stubSsmAddTagsToResource(this);
        const callbackSpy = this.spy();
        const env = Object.assign({}, process.env);

        process.env.AWS_REGION = 'us-east-1';
        return invoke({ pairId: 'pepito', account: '123456789012' }, {}, callbackSpy)
            .then(() => {
                const { err, data } = cbArguments(callbackSpy);
                expect(err).to.be.null;
                expect(data).to.have.property('publicKey');

                process.env = env;

                AWS.restore();
            });
    }));

    it('should be fine when the account is given as an environment variable', sinonTest(function () {
        stubRSA(this);
        stubSsmPutParameter(this);
        stubSsmAddTagsToResource(this);
        const callbackSpy = this.spy();
        const env = Object.assign({}, process.env);

        process.env.AWS_ACCOUNT = '123456789012';
        return invoke({ pairId: 'pepito', region: 'us-east-1' }, {}, callbackSpy)
            .then(() => {
                const { err, data } = cbArguments(callbackSpy);
                expect(err).to.be.null;
                expect(data).to.have.property('publicKey');

                process.env = env;

                AWS.restore();
            });
    }));

    it('should be fine when the account is not given (will use current account)', sinonTest(function () {
        stubRSA(this);
        stubSsmPutParameter(this);
        stubSsmAddTagsToResource(this);
        const callbackSpy = this.spy();

        return invoke({ pairId: 'pepito', region: 'us-east-1' }, {}, callbackSpy)
            .then(() => {
                const { err, data } = cbArguments(callbackSpy);
                expect(err).to.be.null;
                expect(data).to.have.property('publicKey');

                AWS.restore();
            });
    }));

    it('should return error when AWS fails on the SSM PutParameter call', sinonTest(function () {
        stubRSA(this);
        stubSsmPutParameter(this, fakeError);
        stubSsmAddTagsToResource(this);
        const callbackSpy = this.spy();

        return invoke({ pairId: 'pepito', region: 'us-east-1', account: '123456789012' }, {}, callbackSpy)
            .then(() => {
                const { err, data } = cbArguments(callbackSpy);
                expect(data).to.be.undefined;
                expect(err.message).to.match(/\b42\b/);
            });
    }));

    it('should return error when AWS fails on the SSM AddTagsToResource call', sinonTest(function () {
        stubRSA(this);
        stubSsmPutParameter(this);
        stubSsmAddTagsToResource(this, fakeError);
        const callbackSpy = this.spy();

        return invoke({ pairId: 'pepito', region: 'us-east-1', account: '123456789012' }, {}, callbackSpy)
            .then(() => {
                const { err, data } = cbArguments(callbackSpy);
                expect(data).to.be.undefined;
                expect(err.message).to.match(/\b42\b/);
            });
    }));
});
