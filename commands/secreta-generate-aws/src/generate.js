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

const lambdaFilename = path.resolve(`${__dirname}/lambda/dist/generateKeyPair.js`);

const { $callMethod } = require('promise-to-call');

const AwsServiceError = SuperError.subclass('AwsServiceError');
const AwsLambdaExecError = SuperError.subclass('AwsLambdaExecError');

let lambdaService;
const functionName = 'Secreta_GenerateKeyPair';

module.exports = (pairId, options = {}) => {
    const keyDir = (options.key && path.resolve(options.key)) || os.homedir();

    const region = options.region || 'us-east-1';
    if (!/^[a-z]{2}-[a-z]+-\d{1,2}$/.test(region)) { // not a perfect match
        throw new Error(`Expected an AWS region (e.g.: us-east-1). (${account})`);
    }

    const { account } = options;
    if (!/^\d{12}$/.test(account)) { // a perfect match
        throw new Error(`Expected an AWS account number (e.g.: 123456789012). (${account})`);
    }

    const memory = options.memory || 512;
    if (!/^\d+$/.test(memory)) {
        throw new Error(`Expected a memory size, in MB (e.g.: 512). (${memory})`);
    }

    const timeout = options.timeout || 60;
    if (!/^\d+$/.test(timeout)) {
        throw new Error(`Expected a timeout, in seconds (e.g.: 60). (${timeout})`);
    }

    displayLog(`> secreta-generate ${pairId} 
    --key ${keyDir} 
    --region ${region}
    --account ${account}
    --memory ${memory}
    --timeout ${timeout}`);

    lambdaService = new AWS.Lambda({ region });

    return deployedFunction()
        .then((functionArn) => {
            if (functionArn) {
                return null;
            }
            return zipFunction()
                .then(zipFile => deployFunction(zipFile, account, memory, timeout));
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

function deployFunction(zipFile, account, memory, timeout) {
    const params = {
        Code: {
            ZipFile: zipFile,
        },
        FunctionName: functionName,
        Handler: 'generateKeyPair.handler',
        Role: `arn:aws:iam::${account}:role/${functionName}`,
        Runtime: 'nodejs6.10',
        Description: 'Secreta function to create a pair of keys, store the private key, return the public key.',
        MemorySize: memory,
        Timeout: timeout,
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
