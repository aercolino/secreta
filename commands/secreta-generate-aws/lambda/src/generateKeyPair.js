/**
 * Create a pair of PKI keys for the given pairId.
 * Store the privateKey in an SSM parameter named /Secreta/privateKey/${event.pairId}.
 * Tag the parameter with key 'Secreta' and value 'privateKey'.
 *
 * Return the { publicKey: <PEM text> } object or an { error: <Error message> } object.
 *
 * @param event Object[pairId, region?: <current region>]
 * @param context
 * @param callback
 */
const dbg = require('debug')('Secreta');
const dbgKeys = require('debug')('Secreta:Keys');

const debug = (...args) => dbg('generateKeyPair', ...args);
const debugKeys = (...args) => dbgKeys('generateKeyPair', ...args);

const forge = require('node-forge');
const AWS = require('aws-sdk');

const { $callMethod } = require('promise-to-call');

let options;
let ssmService;

module.exports = {
    handler(event, context, callback) {
        options = {};
        try {
            setPairId(event);
            setRegion(event);
        } catch (e) {
            debug(e.message);
            callback(e);
            return;
        }
        ssmService = new AWS.SSM({
            region: options.region,
        });
        const pair = {};
        const parameterName = `/Secreta/privateKey/${options.pairId}`;
        debug('handler: about to run', options);
        createKeys(pair)
            .then(() => createParam(parameterName, pair.privateKey))
            .then(() => tagParam(parameterName, 'Secreta', 'privateKey'))
            .then(() => callback(null, { publicKey: pair.publicKey }))
            .catch((err) => {
                debug(err);
                callback(err);
            });
    },
};

function setPairId(event) {
    options.pairId = event.pairId;
    if (!(options.pairId && options.pairId.length)) {
        throw new Error('Expected a pair ID for your keys.');
    }
}

function setRegion(event) {
    options.region = event.region || process.env.AWS_REGION;
    if (!(options.region && options.region.length)) {
        throw new Error('Expected a region for your private key.');
    }
}

function createKeys(pair) {
    const { pki } = forge;
    const { rsa } = pki;
    const params = { bits: 2048, e: 0x10001, workers: -1 };
    debug('createKeys: about to call rsa.generateKeyPair', params);
    return $callMethod(rsa, 'generateKeyPair', params)
        .then((keys) => {
            pair.privateKey = pki.privateKeyToPem(keys.privateKey);
            pair.publicKey = pki.publicKeyToPem(keys.publicKey);
            debug('createKeys: done', {
                privateKey: `[${pair.privateKey.length} Bytes]`,
                publicKey: `[${pair.publicKey.length} Bytes]`,
            });
            debugKeys('privateKey', pair.privateKey);
            debugKeys('publicKey', pair.publicKey);
        });
}

function createParam(parameterName, parameterValue) {
    const params = {
        Name: parameterName,
        Value: parameterValue,
        Type: 'SecureString',
        AllowedPattern: '^-----BEGIN RSA PRIVATE KEY-----[\\s\\S]+-----END RSA PRIVATE KEY-----\\s*$',
        Description: 'Secreta RSA Private Key',
        Overwrite: false,
    };
    if (debug.enabled) {
        const cleanParams = Object.assign({}, params, { Value: `[${parameterValue.length} Bytes]` });
        debug('createParam: about to call ssm.putParameter', cleanParams);
    }
    return $callMethod(ssmService, 'putParameter', params)
        .then(() => {
            debug('createParam: done');
        });
}

function tagParam(parameterName, tagKey, tagValue) {
    // http://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-access.html  <- tag access
    // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SSM.html#addTagsToResource-property
    const params = {
        ResourceId: parameterName,
        ResourceType: 'Parameter',
        Tags: [
            {
                Key: tagKey,
                Value: tagValue,
            },
        ],
    };
    debug('tagParam: about to call ssm.addTagsToResource', params);
    return $callMethod(ssmService, 'addTagsToResource', params)
        .then(() => {
            debug('tagParam: done');
        });
}

debug('Secreta: generateKeyPair module loaded');
