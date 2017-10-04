// @flow

// See http://www.rricard.me/es6/aws/lambda/nodejs/2015/11/29/es6-on-aws-lambda.html
// See https://github.com/rricard/lambda-es6-example/blob/master/lib/lambda-types.js

type AmazonCognitoIdentity = {
    cognito_identity_id: number | string,
    cognito_identity_pool_id: number | string
};

type AWSMobileSDKClient = {
    installation_id: number | string,
    app_title: string,
    app_version_name: string,
    app_version_code: number | string,
    app_package_name: string
};

type AWSMobileSDKClientEnv = {
    platform_version: number | string,
    platform: string,
    make: any,
    model: any,
    locale: string
};


type AWSMobileSDKClientContext = {
    client: AWSMobileSDKClient,
    Custom: any,
    env: AWSMobileSDKClientEnv
};

type CallbackFunction = (error: Error, result: any) => void;

type InvokedContext = {
    succeed: (result: any) => void,
    fail: (error: Error) => void,
    done: CallbackFunction,
    getRemainingTimeInMillis: () => number,
    functionName: string,
    functionVersion: number | string,
    invokedFunctionArn: string,
    memoryLimitInMB: number,
    awsRequestId: number | string,
    logGroupName: string,
    logStreamName: string,
    identity: ?AmazonCognitoIdentity,
    clientContext: ?AWSMobileSDKClientContext
};

type InvokingContext = {
    functionName: string,
    functionVersion: number | string,
    invokedFunctionArn: string,
    memoryLimitInMB: number,
    awsRequestId: number | string,
    logGroupName: string,
    logStreamName: string,
    identity: ?AmazonCognitoIdentity,
    clientContext: ?AWSMobileSDKClientContext
};

type InvokedFunction = (event: any, context: InvokedContext, callback: CallbackFunction) => void;

type InvokingFunction = (event: any, context: InvokingContext, callback: CallbackFunction) => Promise<any>;

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
    promiseToCallLambda(handler: InvokedFunction): InvokingFunction {
        return (event: any, context: InvokingContext, callback: CallbackFunction) => new Promise((resolve, reject) => {
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
