const dbg = require('debug')('Secreta');

const debug = (...args) => dbg('secreta-encrypt', ...args);

const displayLog = console.log; // use console.log for developing/debugging, displayLog for functionality
const displayError = console.error; // use console.error for developing/debugging, displayError for functionality

process.env.SUPPRESS_NO_CONFIG_WARNING = true;
const config = require('config');
const os = require('os');
const fs = require('fs');
const path = require('path');
const lodash = require('lodash');
const forge = require('node-forge');

const pki = forge.pki;

const { selectPaths } = require('@aercolino/object-paths');


module.exports = (pairId, options = {}) => new Promise((resolve) => {
    const keyDir = (options.key && path.resolve(options.key)) || os.homedir();
    const publicKeyFilename = `${keyDir}/${pairId}.pem`;
    if (!fs.existsSync(publicKeyFilename)) {
        throw new Error(`Expected a public key at ${publicKeyFilename}`);
    }
    const publicKeyAsPem = fs.readFileSync(publicKeyFilename, 'utf8');
    const publicKey = pki.publicKeyFromPem(publicKeyAsPem);

    const outputDir = (options.output && path.resolve(options.output)) || keyDir;
    if (!fs.existsSync(outputDir)) {
        throw new Error(`Expected a directory for the encrypted secrets at ${outputDir}`);
    }
    const encryptedFilename = `${outputDir}/${pairId}.spk`;
    if (fs.existsSync(encryptedFilename)) {
        throw new Error(`Expected no file at ${encryptedFilename}`);
    }

    const configDir = options.config && path.resolve(options.config);
    if (!configDir) {
        throw new Error(`Expected the configuration directory`);
    }
    if (!fs.existsSync(configDir)) {
        throw new Error(`Expected the configuration directory at ${configDir}`);
    }

    const secretsDir = options.secrets && path.resolve(options.secrets);
    if (!secretsDir) {
        throw new Error(`Expected the secrets configuration directory`);
    }
    if (!fs.existsSync(secretsDir)) {
        throw new Error(`Expected the secrets configuration directory at ${secretsDir}`);
    }

    displayLog(`> secreta-encrypt ${pairId} 
    --key ${keyDir} 
    --config ${configDir} 
    --secrets ${secretsDir} 
    --output ${outputDir}`);


    const allValues = config.util.loadFileConfigs(configDir);
    const selectedSecretsPaths = selectPaths(allValues, /^SECRETUM$/);
    if (selectedSecretsPaths.length === 0) {
        displayLog('No secrets to protect.');
        return resolve({ length: -1 });
    }

    const allSecretsValues = config.util.loadFileConfigs(secretsDir);
    const allSecretsPaths = selectPaths(allSecretsValues);
    const unavailablePaths = lodash.difference(selectedSecretsPaths, allSecretsPaths);
    const unavailableNodes = unavailablePaths.filter(x => allSecretsPaths.every(y => y.indexOf(x) !== 0));
    if (unavailableNodes.length > 0) {
        throw new Error(`No plaintext available for these secrets: { ${unavailableNodes.join(', ')} }.`);
    }

    const selectedSecretsValues = lodash.at(allSecretsValues, selectedSecretsPaths);
    const selectedSecrets = lodash.zipObject(selectedSecretsPaths, selectedSecretsValues);
    const plaintext = JSON.stringify(selectedSecrets);
    const ciphertext = publicKey.encrypt(plaintext);
    fs.writeFileSync(encryptedFilename, ciphertext); // Buffer to binary file
    resolve({ length: ciphertext.length, filename: encryptedFilename });
})
    .then((data) => {
        debug('main: done', data);
        displayLog(`${data.length} bytes saved to ${data.filename}`);
        return { data };
    })
    .catch((err) => {
        debug('main: err', err);
        displayError(err.message);
        return { err };
    });
