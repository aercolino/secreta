module.exports.fixtures = {
    getFunctionConfigurationResponse: {
        FunctionName: 'Secreta_GenerateKeyPair',
        FunctionArn: 'arn:aws:lambda:us-east-2:123456789012:function:Secreta_GenerateKeyPair',
        Runtime: 'nodejs6.10',
        Role: 'arn:aws:iam::123456789012:role/Secreta_GenerateKeyPair',
        Handler: 'generateKeyPair.handler',
        CodeSize: 568344,
        Description: 'Secreta function to create a pair of keys, store the private key, return the public key.',
        Timeout: 60,
        MemorySize: 128,
        LastModified: '2017-09-19T16:49:59.932+0000',
        CodeSha256: 'ae7XEnDV1pZYYVPQkHiH/XcaDlThSdeKyayHmYhRW5A=',
        Version: '$LATEST',
        KMSKeyArn: null,
        TracingConfig: { Mode: 'PassThrough' },
        MasterArn: null,
    },
    createFunctionResponse: {
        FunctionName: 'Secreta_GenerateKeyPair',
        FunctionArn: 'arn:aws:lambda:us-east-2:123456789012:function:Secreta_GenerateKeyPair',
        Runtime: 'nodejs6.10',
        Role: 'arn:aws:iam::123456789012:role/Secreta_GenerateKeyPair',
        Handler: 'generateKeyPair.handler',
        CodeSize: 568245,
        Description: 'Secreta function to create a pair of keys, store the private key, return the public key.',
        Timeout: 60,
        MemorySize: 128,
        LastModified: '2017-09-20T12:55:33.612+0000',
        CodeSha256: 'ohPe/zW6wc1MjCLW+vuiGvRvAZfpDcElaLIhw15Y8S8=',
        Version: '$LATEST',
        KMSKeyArn: null,
        TracingConfig: { Mode: 'PassThrough' },
        MasterArn: null,
    },
    invokeResponse: {
        StatusCode: 200,
        Payload: '{"publicKey":"-----BEGIN PUBLIC KEY-----\\r\\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgK' +
        'CAQEAjyW85oje7YIUyfnNtXqo\\r\\ngh2gPUAlixU8PrQlv8lamU77Tezo7AJQKWZ0ZReqKf8Xg9wsNjTRj7D73coAT6B' +
        'E\\r\\nwx5YMM92xgty7Cq2wOd8YmJWR0pS+8Pc414xZKKlV/FoTXv59nPPP2DAJ7osfVzK\\r\\nWePucb/ae3p8ZTYsY' +
        'wwniyJyO76xqbeLGwppemNsZGKWjQTNybZuMEvGHXV8O43u\\r\\nX7qe465EGHWDSnTJggP2OEQoiHI4DRecmx66B0z2H' +
        'g7EFeVY11oh105Tibvn/9Ja\\r\\nLrwOuNRGw/tdh61sH5+w9MyhsEis3gtMfpN3+uxgItZr+rdZU0R10yslRWN+k3jS' +
        '\\r\\n/wIDAQAB\\r\\n-----END PUBLIC KEY-----\\r\\n"}',
    },
    invokeErrorResponse: {
        StatusCode: 200,
        FunctionError: 'Handled',
        Payload: '{"errorMessage":null,"errorType":"InvalidResourceId","stackTrace":["Request.extractEr' +
        'ror (/var/task/generateKeyPair.js:2670:27)","Request.callListeners (/var/task/createPairOfKey' +
        's.js:7390:20)","Request.emit (/var/task/generateKeyPair.js:7362:10)","Request.emit (/var/task' +
        '/generateKeyPair.js:14617:14)","Request.transition (/var/task/generateKeyPair.js:13956:10)",' +
        '"AcceptorStateMachine.runTo (/var/task/generateKeyPair.js:14759:12)","/var/task/createPairOfK' +
        'eys.js:14771:10","Request.<anonymous> (/var/task/generateKeyPair.js:13972:9)","Request.<anony' +
        'mous> (/var/task/generateKeyPair.js:14619:12)","Request.callListeners (/var/task/createPairOf' +
        'Keys.js:7400:18)"]}',
    },
};
