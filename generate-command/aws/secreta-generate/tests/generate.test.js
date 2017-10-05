require('console.mute');
const { $wrapPromise } = require('@aercolino/wrap-promise');

const fs = require('fs');
const AWS = require('mock-aws');

const { fixtures } = require('./generate.fixtures');

const chai = require('chai');
const sinon = require('sinon');
const sinonTest = require('sinon-test')(sinon);
const sinonChai = require('sinon-chai');

chai.use(sinonChai);
const { expect } = chai;

const zipitShell = require('../src/zipit-shell');
const secretaGenerate = require('../src/generate');

function stubZipit(test, error = null, result = null) {
    const stub = test.stub().callsArgWith(1, error, result);
    zipitShell.zipit = stub;
    return stub;
}

function stubLambdaGetFunctionConfiguration(test, error = null, result = null) {
    const stub = test.stub().callsArgWith(1, error, result);
    AWS.mock('Lambda', 'getFunctionConfiguration', stub);
    return stub;
}

function stubLambdaCreateFunction(test, error = null, result = null) {
    const stub = test.stub().callsArgWith(1, error, result);
    AWS.mock('Lambda', 'createFunction', stub);
    return stub;
}

function stubLambdaInvoke(test, error = null, result = null) {
    const stub = test.stub().callsArgWith(1, error, result);
    AWS.mock('Lambda', 'invoke', stub);
    return stub;
}

function stubFsWriteFileSync(test) {
    const stub = test.stub(fs, 'writeFileSync');
    return stub;
}

function stubFsExistsSync(test, result) {
    const stub = test.stub(fs, 'existsSync');
    fs.existsSync.withArgs(sinon.match(/\/generateKeyPair\.js$/)).returns(result);
    fs.existsSync.callThrough();
    return stub;
}

function $muted(fn, ...args) {
    return $wrapPromise(
        () => fn(...args),
        () => {
            console.mute();
        },
        () => {
            AWS.restore();
            console.resume();
        }
    );
}

console.log('Node version', process.version);

describe('secreta-generate', function () {

    it('should deploy the lambda function if it is not already deployed', sinonTest(function () {
        const lambdaGetFunctionConfiguration = stubLambdaGetFunctionConfiguration(
            this,
            new Error('ResourceNotFoundException')
        );
        stubFsExistsSync(this, true);
        const zipit = stubZipit(this, null, 'this is compressed and looks like garbage');
        const lambdaCreateFunction = stubLambdaCreateFunction(this, null, fixtures.createFunctionResponse);
        const lambdaInvoke = stubLambdaInvoke(this, null, fixtures.invokeResponse);
        const fsWriteFileSync = stubFsWriteFileSync(this);

        return $muted(secretaGenerate, 'pepito', { account: '123456789012' })
            .then((result) => {
                expect(lambdaGetFunctionConfiguration).to.have.been.called;
                expect(zipit).to.have.been.called;
                expect(lambdaCreateFunction).to.have.been.called;
                expect(lambdaInvoke).to.have.been.called;
                expect(fsWriteFileSync).to.have.been.called;

                expect(result.data).to.match(/^-----BEGIN PUBLIC KEY-----[\w\W]+-----END PUBLIC KEY-----\s*$/);
            });
    }));

    it('should use the already deployed lambda function if possible', sinonTest(function () {
        const lambdaGetFunctionConfiguration = stubLambdaGetFunctionConfiguration(
            this,
            null,
            fixtures.getFunctionConfigurationResponse
        );
        stubFsExistsSync(this, true);
        const zipit = stubZipit(this);
        const lambdaCreateFunction = stubLambdaCreateFunction(this);
        const lambdaInvoke = stubLambdaInvoke(this, null, fixtures.invokeResponse);
        const fsWriteFileSync = stubFsWriteFileSync(this);

        return $muted(secretaGenerate, 'pepito', { account: '123456789012' })
            .then((result) => {
                expect(lambdaGetFunctionConfiguration).to.have.been.called;
                expect(zipit).to.not.have.been.called;
                expect(lambdaCreateFunction).to.not.have.been.called;
                expect(lambdaInvoke).to.have.been.called;
                expect(fsWriteFileSync).to.have.been.called;

                expect(result.data).to.match(/^-----BEGIN PUBLIC KEY-----[\w\W]+-----END PUBLIC KEY-----\s*$/);
            });
    }));

    it('should see when an error happens because no file to zip is at the supposed place', sinonTest(function () {
        const lambdaGetFunctionConfiguration = stubLambdaGetFunctionConfiguration(
            this,
            new Error('ResourceNotFoundException')
        );
        stubFsExistsSync(this, false);
        const zipit = stubZipit(this);
        const lambdaCreateFunction = stubLambdaCreateFunction(this);
        const lambdaInvoke = stubLambdaInvoke(this);
        const fsWriteFileSync = stubFsWriteFileSync(this);

        return $muted(secretaGenerate, 'pepito', { account: '123456789012' })
            .then((result) => {
                expect(lambdaGetFunctionConfiguration).to.have.been.called;
                expect(zipit).to.not.have.been.called;
                expect(lambdaCreateFunction).to.not.have.been.called;
                expect(lambdaInvoke).to.not.have.been.called;
                expect(fsWriteFileSync).to.not.have.been.called;

                expect(result.err).to.match(/lambda function/);
            });
    }));

    it('should see when an error happens during lambdaService.invoke', sinonTest(function () {
        const lambdaGetFunctionConfiguration = stubLambdaGetFunctionConfiguration(
            this,
            null,
            fixtures.getFunctionConfigurationResponse
        );
        stubFsExistsSync(this, true);
        const zipit = stubZipit(this);
        const lambdaCreateFunction = stubLambdaCreateFunction(this);
        const lambdaInvoke = stubLambdaInvoke(this, new Error('failure 42 from executing AWS SDK'));
        const fsWriteFileSync = stubFsWriteFileSync(this);

        return $muted(secretaGenerate, 'pepito', { account: '123456789012' })
            .then((result) => {
                expect(lambdaGetFunctionConfiguration).to.have.been.called;
                expect(zipit).to.not.have.been.called;
                expect(lambdaCreateFunction).to.not.have.been.called;
                expect(lambdaInvoke).to.have.been.called;
                expect(fsWriteFileSync).to.not.have.been.called;

                expect(result.err.message).to.eql('Invoke request failed.');
            });
    }));

    it('should see when an error happens during Lambda execution', sinonTest(function () {
        const lambdaGetFunctionConfiguration = stubLambdaGetFunctionConfiguration(
            this,
            null,
            fixtures.getFunctionConfigurationResponse
        );
        stubFsExistsSync(this, true);
        const zipit = stubZipit(this);
        const lambdaCreateFunction = stubLambdaCreateFunction(this);
        const lambdaInvoke = stubLambdaInvoke(this, null, fixtures.invokeErrorResponse);
        const fsWriteFileSync = stubFsWriteFileSync(this);

        return $muted(secretaGenerate, 'pepito', { account: '123456789012' })
            .then((result) => {
                expect(lambdaGetFunctionConfiguration).to.have.been.called;
                expect(zipit).to.not.have.been.called;
                expect(lambdaCreateFunction).to.not.have.been.called;
                expect(lambdaInvoke).to.have.been.called;
                expect(fsWriteFileSync).to.not.have.been.called;

                expect(result.err.type).to.match(/Handled|Unhandled/);
            });
    }));

    it('should see when an error happens during lambdaService.createFunction', sinonTest(function () {
        const lambdaGetFunctionConfiguration = stubLambdaGetFunctionConfiguration(
            this,
            new Error('ResourceNotFoundException')
        );
        stubFsExistsSync(this, true);
        const zipit = stubZipit(this, null, 'this is compressed and looks like garbage');
        const lambdaCreateFunction = stubLambdaCreateFunction(this, new Error('failure 42 from executing AWS SDK'));
        const lambdaInvoke = stubLambdaInvoke(this);
        const fsWriteFileSync = stubFsWriteFileSync(this);

        return $muted(secretaGenerate, 'pepito', { account: '123456789012' })
            .then((result) => {
                expect(lambdaGetFunctionConfiguration).to.have.been.called;
                expect(zipit).to.have.been.called;
                expect(lambdaCreateFunction).to.have.been.called;
                expect(lambdaInvoke).to.not.have.been.called;
                expect(fsWriteFileSync).to.not.have.been.called;

                expect(result.err.message).to.eql('CreateFunction request failed.');
            });
    }));

    it('should see when an error happens during zipit', sinonTest(function () {
        const lambdaGetFunctionConfiguration = stubLambdaGetFunctionConfiguration(
            this,
            new Error('ResourceNotFoundException')
        );
        stubFsExistsSync(this, true);
        const zipit = stubZipit(this, new Error('some failure 42 coming from zipit'));
        const lambdaCreateFunction = stubLambdaCreateFunction(this);
        const lambdaInvoke = stubLambdaInvoke(this);
        const fsWriteFileSync = stubFsWriteFileSync(this);

        return $muted(secretaGenerate, 'pepito', { account: '123456789012' })
            .then((result) => {
                expect(lambdaGetFunctionConfiguration).to.have.been.called;
                expect(zipit).to.have.been.called;
                expect(lambdaCreateFunction).to.not.have.been.called;
                expect(lambdaInvoke).to.not.have.been.called;
                expect(fsWriteFileSync).to.not.have.been.called;

                expect(result.err.message).to.match(/42/);
            });
    }));

});
