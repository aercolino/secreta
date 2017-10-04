# Secreta

+ Initially for NodeJS / AWS only, later for other systems / providers too.
+ Project: `github:aercolino/secreta`
+ There are 4 packages.
    + The `secreta-generate` package, a CLI command for generating a pair of RSA keys (public and private).
    
        + The `secreta-generate-lambda` package, bundled with the `secreta-generate` package.
    
    + The `secreta-encrypt` package, a CLI command for encrypting configuration secrets with a public key.
    + The `secreta-decrypt` package, a node module for decrypting configuration secrets with a private key.


## Secrets storage



### Inside the project repository

+ Regular config files (eg: `config.yml`), not ignored by the repository
+ Used to select which secrets we are going to use
+ `<name_1>` is the name of a non-secret configuration value
+ `<name_2>` is the name of a secret configuration value

```
# config/development.yml
...
whatever:
  <name_1>: <plaintext-dev-value-1>
  <name_2>: SECRETUM
...
```

```
# config/production.yml
...
whatever:
  <name_1>: <plaintext-prod-value-1>
  <name_2>: SECRETUM
...
```

+ Special config files (eg: `secrets.yml`), ignored by the repository
+ Used to store all the secrets
+ These files need not to be 1:1 with the files in config
+ The only condition is that these files must configure the same structure

```
# secrets/development.yml
...
whatever:
  <name_2>: <plaintext-dev-value-2>
...
```

```
# secrets/production.yml
...
whatever:
  <name_2>: <plaintext-prod-value-2>
...
```



### Inside the provider (eg: AWS)

+ The non-secret configuration values are kept in plaintext into configuration files (eg: `config.yml`)
+ At rest, the secret configuration values are kept in ciphertext into the file at `secrets.spk`
+ At run time, decryption of `secrets.spk` occurs in memory and all the names of `SECRETUM` values are linked to the matching plaintext values




## Secreta packages



### `secreta-generate`

```
$ secreta-generate <ID> 
    --public-key [key_dir] 
    --config [region:account] 
    --provider AWS
```

+ if there is no `secreta-generate` serverless function on the provider, it uploads it
+ it invokes the `secreta-generate` function, which in turn

    + creates a key pair for the given `<ID>`
    + stores the private key (used for decryption) into a protected location (eg: an AWS SSM param at `/Secreta/privateKey/<ID>`)
    + protects the location so that only the serverless function will be able to access the private key (eg: creates a `Secreta = privateKey` tag for the SSM param and the role under which the Lambda function will run)
    + downloads the public key (used for encryption) to the file at `<key_path>/<ID>.pem`



### `secreta-encrypt`

```
$ secreta-encrypt <ID> 
    --public-key [key_dir] 
    --select [config_dir] 
    --from [secrets_dir] 
    --to [encrypted_dir]
```

+ it loads the configuration ([currently using `node-config`](https://github.com/lorenwest/node-config)) from the files in the directory at `<config_path>`
+ if the configuration has no `SECRETUM` values, then it returns
+ if the configuration has some `SECRETUM` values without a corresponding value (even empty) at a matching path into the secrets loaded from the directory at `<secrets_path>`, then it throws an exception
+ it copies each property with a `SECRETUM` value in the configuration from the file at `<secrets_path>` to a memory object
+ it JSON-stringifies the memory object to a plaintext
+ it encrypts the plaintext to a ciphertext, using the public key at `<key_path>/<ID>.pem`
+ it saves the `<ID>` and the ciphertext into the file at `<encrypted_path>/secrets.spk`, using the template `ServerlessPK/privateKey/${ID}\n${ciphertext}`



### `secreta-decrypt`

```
const configWithoutSecrets = buildConfig(); // configuration object, with some 'SECRETUM' placeholders
const pattern = '*.spk'; // default glob
const spk = require('secreta-decrypt').$mergeSecrets(configWithoutSecrets, pattern);

exports.handler = (event, context, callback) => $spk.then((config) => {

    const decryptedValue = config.at.your.secret.path;
    // ...

});
```

+ the exported `$mergeSecrets` function takes a glob pattern of encrypted files to decrypt and returns a promise
+ the `spk` constant above thus caches the resolved config

    + it gets each file matching the pattern
    + it extracts the `<ID>` of the private decryption key from the basename of the matched file
    + it retrieves the key from the protected location (eg: the AWS SSM param at `/Secreta/privateKey/<ID>`)
    + it reads the ciphertext from the matched file
    + it decrypts the ciphertext to plaintext, using the retrieved key
    + it JSON-parses the plaintext into a memory object
    + it overwrites all `SECRETUM` values it finds in `config` with the values at matching names in the memory object (thus binding names to plaintext values)
    + it throws for any `SECRETUM` which can't be replaced by a secret
    + it doesn't do anything for any secret which is not used to replace anything



--



### Secreta-PrivateKeyAccess Policy for LambdaBasicExecRole

```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ssm:GetParameter"
            ],
            "Resource": "*",
            "Condition": {
                "StringLike": {
                    "ssm:resourceTag/Secreta": [
                        "privateKey"
                    ]
                }
            }
        }
    ]
}
```
