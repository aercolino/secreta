# Lambda Local

I tried to implement a test based on [lambda-local](https://github.com/ashiina/lambda-local) like this

```
const lambdaLocal = require('lambda-local');
const lambdaModule = require('../src/createPairOfKeys');
...
let invokeData;
let invokeErr;
const invokeLocal = (event, cb) => {
    const env = Object.assign({}, process.env);
    lambdaLocal.execute({
        event,
        lambdaFunc: lambdaModule,
        lambdaHandler: 'handler',
        timeoutMs: 3000,
        callback(_err, _data) {
            invokeErr = _err;
            invokeData = _data;
            process.env = env;
            cb();
        },
    });
};
...
it('should throw when the pair ID is not given', function () {
    expect(() => invokeLocal({ region: 'us-east-1', account: '123456789012' }, () => {})).to.throw(/\bpair ID\b/);
});
```

---

It worked flawlessly, except because:

  1. It was quite a bit slower than my simpler implementation.
  2. It forced 'us-east-1' region as default in process.env.
  3. It caused the following strange duplicity and extra time:

```
createKeys started
options { pairId: 'pepito', region: 'us-east-1' }
ssmService created
setAccount started
createKeys started
createKeys done { privateKey: '-----BEGIN RSA PRIVATE KEY-----\\n             this looks like garbage\\n             -----END RSA PRIVATE KEY-----',
  publicKey: '-----BEGIN PUBLIC KEY-----\\n             this looks like garbage\\n             -----END PUBLIC KEY-----' }
createKeys done { privateKey: '-----BEGIN RSA PRIVATE KEY-----\\n             this looks like garbage\\n             -----END RSA PRIVATE KEY-----',
  publicKey: '-----BEGIN PUBLIC KEY-----\\n             this looks like garbage\\n             -----END PUBLIC KEY-----' }
createParam started
about to call putParameter
createParam started
about to call putParameter
param '/ServerlessPK/privateKey/pepito' created.
param '/ServerlessPK/privateKey/pepito' created.
tagParam started
about to call addTagsToResource
tagParam started
about to call addTagsToResource
param '/ServerlessPK/privateKey/pepito' tagged.
param '/ServerlessPK/privateKey/pepito' tagged.
info: END
info: Message
info: ------
info: {
	"publicKey": "-----BEGIN PUBLIC KEY-----\\n             this looks like garbage\\n             -----END PUBLIC KEY-----"
}
    ✓ should be fine when the region is given as an environment variable (1991ms)
```
