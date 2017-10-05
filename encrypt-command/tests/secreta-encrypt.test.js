require('console.mute');
const { $wrapPromise } = require('@aercolino/wrap-promise');
process.env.SUPPRESS_NO_CONFIG_WARNING = true;
const config = require('config');

const lodash = require('lodash');
const fs = require('fs');
const forge = require('node-forge');

const pki = forge.pki;

const { fixtures } = require('./secreta-encrypt.fixtures');

const chai = require('chai');
const sinon = require('sinon');
const sinonTest = require('sinon-test')(sinon);
const sinonChai = require('sinon-chai');

chai.use(sinonChai);
const { expect } = chai;

const secretaEncrypt = require('../src/encrypt');


function stubConfigUtilLoadFileConfigsMulti(test, results) {
    const stub = test.stub(config.util, 'loadFileConfigs');
    lodash.forEach(results, (result, pattern) => {
        config.util.loadFileConfigs.withArgs(sinon.match(pattern)).returns(result);
    });
    config.util.loadFileConfigs.callThrough();
    return stub;
}

function stubPkiPublicKeyFromPem(test, err = null, data = null) {
    const stub = test.stub(pki, 'publicKeyFromPem');
    if (err) {
        pki.publicKeyFromPem.throws(err);
    } else {
        pki.publicKeyFromPem.returns({ encrypt() { return data; } });
    }
    return stub;
}

function stubFsExistsSync(test, pattern, result) {
    const stub = test.stub(fs, 'existsSync');
    fs.existsSync.withArgs(sinon.match(pattern)).returns(result);
    fs.existsSync.callThrough();
    return stub;
}

function stubFsExistsSyncMulti(test, results) {
    const stub = test.stub(fs, 'existsSync');
    lodash.forEach(results, (result, pattern) => {
        fs.existsSync.withArgs(sinon.match(pattern)).returns(result);
    });
    fs.existsSync.callThrough();
    return stub;
}

function stubFsWriteFileSync(test) {
    const stub = test.stub(fs, 'writeFileSync');
    return stub;
}

function $muted(fn, ...args) {
    return $wrapPromise(
        () => fn(...args),
        () => {
            console.mute();
        },
        () => {
            console.resume();
        }
    );
}

console.log('Node version', process.version);

describe('secreta-encrypt', function () {

    it('should throw when there is no file of a public key at the supposed place', sinonTest(function () {
        stubFsExistsSync(this, '/tmp/pepito.pem', false);
        return $muted(secretaEncrypt, 'pepito', { key: '/tmp' })
            .then((result) => {
                expect(result.err).to.match(/Expected a public key/);
            });
    }));

    it('should throw when there is no public key into the file at the supposed place', sinonTest(function () {
        stubPkiPublicKeyFromPem(this, new Error('some error from forge.pki'));
        return $muted(secretaEncrypt, 'pepito', { key: './tests' })
            .then((result) => {
                expect(result).to.have.property('err');
            });
    }));

    it('should throw when there is no output dir', sinonTest(function () {
        stubPkiPublicKeyFromPem(this);
        const outputDir = '/tmp/output-dir';
        const encryptedFilename = '/tmp/output-dir/pepito.secreta';
        const configDir = '/tmp/config-dir';
        const secretsDir = '/tmp/secrets-dir';
        stubFsExistsSyncMulti(this, {
            [outputDir]: false,
            [encryptedFilename]: false,
            [configDir]: true,
            [secretsDir]: true,
        });
        return $muted(secretaEncrypt, 'pepito', { key: './tests', output: outputDir, config: configDir, secrets: secretsDir })
            .then((result) => {
                expect(result.err).to.match(/Expected a directory/);
            });
    }));

    it('should throw when there is already a pem file in the output dir', sinonTest(function () {
        stubPkiPublicKeyFromPem(this);
        const outputDir = '/tmp/output-dir';
        const encryptedFilename = '/tmp/output-dir/pepito.secreta';
        const configDir = '/tmp/config-dir';
        const secretsDir = '/tmp/secrets-dir';
        stubFsExistsSyncMulti(this, {
            [outputDir]: true,
            [encryptedFilename]: true,
            [configDir]: true,
            [secretsDir]: true,
        });
        return $muted(secretaEncrypt, 'pepito', { key: './tests', output: outputDir, config: configDir, secrets: secretsDir })
            .then((result) => {
                expect(result.err).to.match(/Expected no file/);
            });
    }));

    it('should throw when there is no config dir in the options', sinonTest(function () {
        stubPkiPublicKeyFromPem(this);
        const outputDir = '/tmp/output-dir';
        const encryptedFilename = '/tmp/output-dir/pepito.secreta';
        const configDir = undefined;
        const secretsDir = '/tmp/secrets-dir';
        stubFsExistsSyncMulti(this, {
            [outputDir]: true,
            [encryptedFilename]: false,
            [configDir]: false,
            [secretsDir]: true,
        });
        return $muted(secretaEncrypt, 'pepito', { key: './tests', output: outputDir, config: configDir, secrets: secretsDir })
            .then((result) => {
                expect(result.err).to.match(/Expected the configuration directory/);
            });
    }));

    it('should throw when there is no config dir in the system', sinonTest(function () {
        stubPkiPublicKeyFromPem(this);
        const outputDir = '/tmp/output-dir';
        const encryptedFilename = '/tmp/output-dir/pepito.secreta';
        const configDir = '/tmp/config-dir';
        const secretsDir = '/tmp/secrets-dir';
        stubFsExistsSyncMulti(this, {
            [outputDir]: true,
            [encryptedFilename]: false,
            [configDir]: false,
            [secretsDir]: true,
        });
        return $muted(secretaEncrypt, 'pepito', { key: './tests', output: outputDir, config: configDir, secrets: secretsDir })
            .then((result) => {
                expect(result.err).to.match(/Expected the configuration directory/);
            });
    }));

    it('should throw when there is no secrets dir in the options', sinonTest(function () {
        stubPkiPublicKeyFromPem(this);
        const outputDir = '/tmp/output-dir';
        const encryptedFilename = '/tmp/output-dir/pepito.secreta';
        const configDir = '/tmp/config-dir';
        const secretsDir = undefined;
        stubFsExistsSyncMulti(this, {
            [outputDir]: true,
            [encryptedFilename]: false,
            [configDir]: true,
            [secretsDir]: false,
        });
        return $muted(secretaEncrypt, 'pepito', { key: './tests', output: outputDir, config: configDir, secrets: secretsDir })
            .then((result) => {
                expect(result.err).to.match(/Expected the secrets configuration directory/);
            });
    }));

    it('should throw when there is no secrets dir in the system', sinonTest(function () {
        stubPkiPublicKeyFromPem(this);
        const outputDir = '/tmp/output-dir';
        const encryptedFilename = '/tmp/output-dir/pepito.secreta';
        const configDir = '/tmp/config-dir';
        const secretsDir = '/tmp/secrets-dir';
        stubFsExistsSyncMulti(this, {
            [outputDir]: true,
            [encryptedFilename]: false,
            [configDir]: true,
            [secretsDir]: false,
        });
        return $muted(secretaEncrypt, 'pepito', { key: './tests', output: outputDir, config: configDir, secrets: secretsDir })
            .then((result) => {
                expect(result.err).to.match(/Expected the secrets configuration directory/);
            });
    }));

    fixtures.whenThereAreNoSecretsToProtect.forEach((value, index) =>
        it(`should see when There Are No Secrets To Protect ${index}: ${value.case}`, sinonTest(function () {
            stubPkiPublicKeyFromPem(this);
            const outputDir = '/tmp/output-dir';
            const encryptedFilename = '/tmp/output-dir/pepito.secreta';
            const configDir = '/tmp/config-dir';
            const secretsDir = '/tmp/secrets-dir';
            stubFsExistsSyncMulti(this, {
                [outputDir]: true,
                [encryptedFilename]: false,
                [configDir]: true,
                [secretsDir]: true,
            });
            stubConfigUtilLoadFileConfigsMulti(this, {
                [configDir]: value.config,
                [secretsDir]: value.secrets,
            });

            return $muted(secretaEncrypt, 'pepito', { key: './tests', output: outputDir, config: configDir, secrets: secretsDir })
                .then((result) => {
                    expect(result.data.length).to.eql(-1);
                });
        }))
    );

    fixtures.whenSomePlaintextSecretsAreMissing.forEach((value, index) =>
        it(`should throw when Some Plaintext Secrets Are Missing ${index}: ${value.case}`, sinonTest(function () {
            stubPkiPublicKeyFromPem(this);
            const outputDir = '/tmp/output-dir';
            const encryptedFilename = '/tmp/output-dir/pepito.secreta';
            const configDir = '/tmp/config-dir';
            const secretsDir = '/tmp/secrets-dir';
            stubFsExistsSyncMulti(this, {
                [outputDir]: true,
                [encryptedFilename]: false,
                [configDir]: true,
                [secretsDir]: true,
            });
            stubConfigUtilLoadFileConfigsMulti(this, {
                [configDir]: value.config,
                [secretsDir]: value.secrets,
            });

            return $muted(secretaEncrypt, 'pepito', { key: './tests', output: outputDir, config: configDir, secrets: secretsDir })
                .then((result) => {
                    expect(result.err).to.match(/No plaintext available/);
                });
        }))
    );

    fixtures.whenEverythingIsJustAsItShouldBe.forEach((value, index) =>
        it(`should work when Everything Is Just As It Should Be ${index}: ${value.case}`, sinonTest(function () {
            const encrypt = stubPkiPublicKeyFromPem(this, null, 'the garbage-looking ciphertext');
            const outputDir = '/tmp/output-dir';
            const encryptedFilename = '/tmp/output-dir/pepito.secreta';
            const configDir = '/tmp/config-dir';
            const secretsDir = '/tmp/secrets-dir';
            stubFsExistsSyncMulti(this, {
                [outputDir]: true,
                [encryptedFilename]: false,
                [configDir]: true,
                [secretsDir]: true,
            });
            stubConfigUtilLoadFileConfigsMulti(this, {
                [configDir]: value.config,
                [secretsDir]: value.secrets,
            });
            const fsWriteFileSync = stubFsWriteFileSync(this);

            return $muted(secretaEncrypt, 'pepito', { key: './tests', output: outputDir, config: configDir, secrets: secretsDir })
                .then((result) => {
                    expect(encrypt).to.have.been.called;
                    expect(fsWriteFileSync).to.have.been.called;
                    expect(result.data.length).to.eql('the garbage-looking ciphertext'.length);
                });
        }))
    );

});
