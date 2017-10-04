const dbgSecrets = require('debug')('ServerlessPK:Secrets');
const dbg = require('debug')('ServerlessPK');

const debugSecrets = (...args) => dbgSecrets('spk-decrypt', ...args);
const debug = (...args) => dbg('spk-decrypt', ...args);

const path = require('path');
const fs = require('fs');
const lodash = require('lodash');
const assert = require('assert');

const glob = require('glob');
const forge = require('node-forge');
const AWS = require('aws-sdk');

const { $callMethod, $callFunction } = require('promise-to-call');
const { selectPaths } = require('@aercolino/object-paths');

const ssmService = new AWS.SSM();

const pki = forge.pki;

const cryptoCache = {};

const self = module.exports = {
    $mergeSecrets(config, pattern = '*.spk') {
        return $callFunction(glob, pattern)
            .then((filenames) => {
                debug('$mergeSecrets: filenames', filenames);
                const ciphertexts = getPairIdsAndCiphertextsFromFiles(filenames);
                debug('$mergeSecrets: ciphertexts', ciphertexts);
                return Promise.all(ciphertexts.map(self.$decrypt));
            })
            .then((plaintextStrings) => {
                debugSecrets('$mergeSecrets: plaintextStrings', plaintextStrings);
                const allSecrets = plaintextStrings
                    .map(JSON.parse)
                    .reduce((acc, plaintextObject) => Object.assign(acc, plaintextObject), {});
                debugSecrets('$mergeSecrets: allSecrets', allSecrets);
                const configPaths = selectPaths(config, /^SPK_SECRET$/);
                debugSecrets('$mergeSecrets: configPaths', configPaths);
                const result = lodash.cloneDeep(config);
                configPaths.forEach(configPath => {
                    if (!(configPath in allSecrets)) {
                        throw new Error(`Expected a secret for ${configPath}`);
                    }
                    lodash.set(result, configPath, allSecrets[configPath]);
                });
                debugSecrets('$mergeSecrets: result', result);
                return result;
            });
    },

    $decrypt({ pairId, ciphertext }) {
        return self.$getCrypto(pairId)
            .then(crypto => crypto.decrypt(ciphertext));
    },

    $getCrypto(pairId) {
        assert.equal(typeof pairId, 'string');
        assert.ok(pairId.length > 0);
        if (lodash.has(cryptoCache, pairId)) {
            return Promise.resolve(cryptoCache[pairId]);
        }
        const params = {
            Name: `/ServerlessPK/privateKey/${pairId}`,
            WithDecryption: true,
        };
        return $callMethod(ssmService, 'getParameter', params)
            .then((data) => {
                const privateKeyAsPem = data.Parameter.Value;
                const crypto = pki.privateKeyFromPem(privateKeyAsPem);
                cryptoCache[pairId] = crypto;
                return cryptoCache[pairId];
            });
    },
};

function getPairIdsAndCiphertextsFromFiles(filenames) {
    const encrypted = [];
    if (filenames && filenames.length) {
        filenames.forEach((filename) => {
            const [pairId] = path.basename(filename).split('.');
            encrypted.push({
                pairId,
                ciphertext: fs.readFileSync(filename).toString(),
            });
        });
    }
    return encrypted;
}
