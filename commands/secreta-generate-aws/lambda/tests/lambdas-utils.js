// See http://www.rricard.me/es6/aws/lambda/nodejs/2015/11/29/es6-on-aws-lambda.html
// See https://github.com/rricard/lambda-es6-example/blob/master/lib/lambda-types.js

const AmazonCognitoIdentitySchema = {
    id: '/AmazonCognitoIdentity',
    type: 'object',
    properties: {
        cognito_identity_id: {type: ['number', 'string']},
        cognito_identity_pool_id: {type: ['number', 'string']},
    },
};

const AWSMobileSDKClientSchema = {
    id: '/AWSMobileSDKClient',
    type: 'object',
    properties: {
        installation_id: {type: ['number', 'string']},
        app_title: {type: 'string'},
        app_version_name: {type: 'string'},
        app_version_code: {type: ['number', 'string']},
        app_package_name: {type: 'string'},
    },
};

const AWSMobileSDKClientEnvSchema = {
    id: '/AWSMobileSDKClientEnv',
    type: 'object',
    properties: {
        platform_version: {type: ['number', 'string']},
        platform: {type: 'string'},
        make: {type: 'any'},
        model: {type: 'any'},
        locale: {type: 'string'},
    },
};

const AWSMobileSDKClientContextSchema = {
    id: '/AWSMobileSDKClientContext',
    type: 'object',
    properties: {
        client: {"$ref": "/AWSMobileSDKClient"},
        Custom: {type: 'any'},
        env: {"$ref": "/AWSMobileSDKClientEnv"},
    },
};

// In the following, aliasing 'any' for expressing functions.. (workaround for documentation)

const CallbackFunctionSchema = {
    id: '/CallbackFunction',
    type: 'any', // (error: Error, result: any) => void
};

const SucceedCallbackSchema = {
    id: '/SucceedCallback',
    type: 'any', // (result: any) => void
};

const FailCallbackSchema = {
    id: '/FailCallback',
    type: 'any', // (error: Error) => void
};

const IntegerCallbackSchema = {
    id: '/IntegerCallback',
    type: 'any', // () => number
};

const InvokedContextSchema = {
    id: '/InvokedContext',
    type: 'object',
    properties: {
        succeed: {"$ref": "/SucceedCallback"},
        fail: {"$ref": "/FailCallback"},
        done: {"$ref": "/CallbackFunction"},
        getRemainingTimeInMillis: {"$ref": "/IntegerCallback"},
        functionName: {type: 'string'},
        functionVersion: {type: ['number', 'string']},
        invokedFunctionArn: {type: 'string'},
        memoryLimitInMB: {type: 'number'},
        awsRequestId: {type: ['number', 'string']},
        logGroupName: {type: 'string'},
        logStreamName: {type: 'string'},
        identity: {"$ref": "/AmazonCognitoIdentity"},
        clientContext: {"$ref": "/AWSMobileSDKClientContext"},
    },
};

const InvokedFunctionSchema = {
    id: '/InvokedFunction',
    type: 'any', // (event: any, context: InvokedContext, callback: CallbackFunction) => void
};

const InvokingFunctionSchema = {
    id: '/InvokingFunction',
    type: 'any', // (event: any, context: InvokingContext, callback: CallbackFunction) => Promise<any>
};

const defaultContext = {
    functionName: 'fakeLambda',
    functionVersion: '0',
    invokedFunctionArn: 'arn:aws:lambda:fake-region:fake-acc:function:fakeLambda',
    memoryLimitInMB: Infinity,
    awsRequestId: 'fakeRequest',
    logGroupName: 'fakeGroup',
    logStreamName: 'fakeStream',
    identity: null,
    clientContext: null,
};

// If the handler never calls succeed, fail, done, or callback then it could complete (nothing pending)
// or timeout (something pending) in a real scenario, but here in tests this promise will remain pending.
module.exports = {
    promiseToCallLambda(handler/*: InvokedFunction*/)/*: InvokingFunction*/ {
        return (event/*: any*/, context/*: InvokingContext*/, callback/*: CallbackFunction*/) => new Promise((resolve, reject) => {
            const invokedContext = Object.assign({}, defaultContext, context, {
                succeed: resolve,
                fail: reject,
                done: (err, data) => (err ? reject(err) : resolve(data)),
                getRemainingTimeInMillis: () => Infinity,
            });
            handler(event, invokedContext, (...args) => {
                if (callback) {
                    callback(...args);
                }
                resolve();
            });
        });
    },
};
