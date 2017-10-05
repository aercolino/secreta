const dbg = require('debug')('Secreta');

const debug = (...args) => dbg('secreta-generate', ...args);

const displayLog = console.log; // use console.log for developing/debugging, displayLog for functionality
const displayError = console.error; // use console.error for developing/debugging, displayError for functionality

const AWS = require('aws-sdk');
const os = require('os');
const fs = require('fs');
const path = require('path');
const zipitShell = require('./zipit-shell');
const SuperError = require('super-error');

const { $callMethod } = require('promise-to-call');

const AwsServiceError = SuperError.subclass('AwsServiceError');
const AwsLambdaExecError = SuperError.subclass('AwsLambdaExecError');

let lambdaService;
const functionName = 'Secreta_GenerateKeyPair';

module.exports = (pairId, options = {}) => {
    const { region } = options;
    lambdaService = region ? new AWS.Lambda({ region }) : new AWS.Lambda();
    const keyDir = (options.key && path.resolve(options.key)) || os.homedir();
    displayLog(`> secreta-generate ${pairId} 
    --key ${keyDir} 
    --region ${region}`);

    return deployedFunction()
        .then((functionArn) => {
            if (functionArn) {
                return null;
            }
            return zipFunction()
                .then(zipFile => deployFunction(zipFile));
        })
        .then(() => invokeFunction({ pairId, region }))
        .then((data) => {
            debug('main: done', data);
            displayLog(data);
            const filename = `${keyDir}/${pairId}.pem`;
            fs.writeFileSync(filename, data, 'utf8');
            displayLog(`${data.length} bytes saved to ${filename}`);
            return { data };
        })
        .catch((err) => {
            debug('main: err', err);
            displayError(`${err.message} (${err.details})`);
            return { err };
        });
};

function deployedFunction() {
    const params = {
        FunctionName: functionName,
    };
    debug('deployedFunction: about to call lambdaService.getFunctionConfiguration', params);
    return $callMethod(lambdaService, 'getFunctionConfiguration', params)
        .then((data) => {
            debug('deployedFunction: done', data);
            return data.FunctionArn;
        })
        .catch((err) => {
            debug('deployedFunction: err', err);
            return false;
        });
}

function deployFunction(zipFile) {
    const params = {
        Code: {
            ZipFile: zipFile,
        },
        FunctionName: functionName,
        Handler: 'generateKeyPair.handler',
        Role: `arn:aws:iam::123456789012:role/${functionName}`,
        Runtime: 'nodejs6.10',
        Description: 'Secreta function to create a pair of keys, store the private key, return the public key.',
        MemorySize: 128,
        Timeout: 60,
    };
    debug('deployFunction: about to call lambdaService.createFunction', params);
    return $callMethod(lambdaService, 'createFunction', params)
        .then((data) => {
            debug('deployFunction: done', data);
            return data.CodeSha256;
        })
        .catch((err) => {
            debug('deployFunction: err', err);
            throw new AwsServiceError({
                message: 'CreateFunction request failed.',
                details: err,
            });
        });
}

function invokeFunction(payload) {
    const params = {
        FunctionName: functionName,
        InvocationType: 'RequestResponse',
        LogType: 'None',
        Payload: JSON.stringify(payload),
    };
    debug('invokeFunction: about to call lambdaService.invoke', params);
    return $callMethod(lambdaService, 'invoke', params)
        .then((data) => {
            debug('invokeFunction: done', data);
            const result = JSON.parse(data.Payload);
            if (data.FunctionError) {
                throw new AwsLambdaExecError({
                    type: data.FunctionError,
                    message: `${result.errorType || '(ExecError)'}: ${result.errorMessage || data.FunctionError}`,
                    details: result,
                });
            }
            return result.publicKey;
        })
        .catch((err) => {
            debug('invokeFunction: err', err);
            if (err instanceof AwsLambdaExecError) {
                throw err;
            }
            throw new AwsServiceError({
                message: 'Invoke request failed.',
                details: err,
            });
        });
}

function zipFunction() {
    const lambdaFilename = path.resolve(`${__dirname}/../../lambdas/generateKeyPair/dist/generateKeyPair.js`);
    if (!fs.existsSync(lambdaFilename)) {
        throw new Error(`Expected a lambda function at ${lambdaFilename}`);
    }
    const params = {
        input: [
            lambdaFilename,
        ],
    };
    debug('zipFunction: about to call zipit', params);
    return $callMethod(zipitShell, 'zipit', params)
        .then((data) => {
            debug('zipFunction: done', `[${data.length} bytes]`);
            return data;
        })
        .catch((err) => {
            debug('zipFunction: err', err);
            throw err;
        });
}
