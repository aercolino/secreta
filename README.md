# *Secreta*

*Secreta* is a little suite of tools for managing configuration secrets in AWS Lambda functions.

**Features**

1. Asymmetric encryption with RSA keys (public and private), directly generated on AWS.
1. Local encryption on disk with the public key: both this key and the ciphertext can be shared in the repo.
1. Remote decryption in memory with the private key: this key is stored encrypted, directly on AWS.

**Requirements**

1. AWS Lambda functions running in the 6.10 NodeJS platform.
1. [`config`](https://www.npmjs.com/package/config) module.

**Project**

[`secreta`](https://github.com/aercolino/secreta)

+ [`secreta-generate-aws`](https://github.com/aercolino/secreta-generate-aws) package: a CLI command for generating a pair of RSA keys (public and private).
+ `secreta-generate-aws/lambda` package, used by the `secreta-generate-aws` package.
+ [`secreta-encrypt`](https://github.com/aercolino/secreta-encrypt) package, a CLI command for encrypting configuration secrets with a public key.
+ [`secreta-decrypt-aws`](https://github.com/aercolino/secreta-decrypt-aws) package, a node module for decrypting configuration secrets with a private key.

**Contributors**

Welcome for any kind of improvement. 

##### TODO

1. Support more cloud providers.
1. Support more platforms of each provider.
1. Improve keys management.
1. Support Windows paths.
1. Inject the configuration module, instead of requiring [`config`](https://www.npmjs.com/package/config). At the moment, *Secreta* uses it just to load your configuration from a directory, and then it works directly on the configuration object. Any configuration module would be fine to build such an object, but we're not there yet.





# Overview

This overview briefly outlines how *Secreta* is designed to be used. In the following, *development* and *production* are stages of your AWS Lambda function.




## Development





### No secrets

The non-secret configuration values are kept in plaintext.

+ Regular plaintext configuration files (eg: `config.yml`), not to be ignored by the repository.
+ Used by *Secreta* only to select which secrets you want to deploy.

For example, you could have this regular configuration file

```
...
whatever:
  someName: a value that you don't need to hide
  someOtherName: SECRETUM
...
```



### Secrets

The secrets are kept in plaintext somewhere, and in ciphertext inside the repository.

+ Special plaintext config files (eg: `secrets.yml`), **to be ignored by the repository**.
+ Used by you to store all the secrets (i.e. plaintext values corresponding or not to `SECRETUM` values).
+ Feel free to use the best structure for these files: they only must configure the same final structure as the regular configuration.

For example, you could have this special configuration file

```
...
whatever:
  someOtherName: a value that you want to keep secret
...
```

which *Secreta* allows you to encrypt with your `pepito.pem` public key file into a `pepito.secreta` encrypted file. Of course, initially or whenever you see fit, *Secreta* also allows you to generate a new key pair on AWS, store the private key there, and save the public key to a local file.




## Production

+ At rest, the secret configuration values are kept in ciphertext into the file at `<key pair ID>.secreta`.
+ At run time, decryption of ciphertext occurs in memory and all `SECRETUM` values are replaced by their plaintext values.

Foe example, if you had the regular and special configuration files above, you would get this merged configuration file

```
{
  whatever: {
    someName: "a value that you don't need to hide",
    someOtherName: 'a value that you want to keep secret'
  }
}
```

which *Secreta* will have decrypted with your `pepito` private key from the deployed `pepito.secreta` file.





# Packages




## `secreta-generate-aws` command

This is an npm package that installs the `secreta-generate-aws` command.

`secreta-generate-aws` is meant to be used by the person that has the role to generate a pair of private and public RSA keys.



### Installation

```
$ npm install -g @aercolino/secreta-generate-aws
```



### Usage

```
$ secreta-generate-aws <key pair ID> 
    --key <dir where the public key will be stored> 
    --region <region where everything happens>
    --account <the 12 digits of your AWS account>
    --memory <how big the Lambda machine is (in megabytes)>
    --timeout <how long to wait before aborting (in seconds)>
```

+ if there is no `secreta-generate-aws` serverless function on the provider, it uploads it
+ it invokes the `secreta-generate-aws` function, which in turn

    + creates a key pair for the given `<key pair ID>`
    + stores the private key (used for decryption) into a protected location (an AWS SSM param at `/Secreta/privateKey/<key pair ID>`)
    + protects the location so that only the Lambda function will be able to access the private key (with a `Secreta = privateKey` tag)
    + downloads the public key (used for encryption) to the file at `<key>/<key pair ID>.pem`



### Examples


#### Happy path

When all gets through:

```
$ secreta-generate-aws fulanito --region us-east-2 --account 123456789012
> secreta-generate-aws fulanito
    --key /Users/andrea
    --region us-east-2
    --account 123456789012
    --memory 512
    --timeout 60

(... a few seconds wait ...)

-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwQkRI0k58CDpxH83nOrL
OyThcWfHWDAcH5Kn5MH+ZRBCqbOpNbqzRIsSRgJYk/G8JDgfQC+RF6reUhqiUqt0
mmnl4QKahe9y5ofz4rZGjaghkg8z1Lyaq1Mm8j/wfitd5Ur80EC5qPITV+akMZ2B
AMpwdBxTt6Makl2BZyHfD+VpDyJjKz/5JqdkTN76aDUCsQ9OuTIcbICBg0U+TDUU
KeQqmjn99+F+vYBLTIiJVEsxX8LtImRQK+Jq1+piQIGSWLun7fEIS0E1PqHryMbS
TaK4f3FJG3fGioNT919lkV8eOj2RZFL9AwilfxJQJ4XSZYwFUjfMqmfMJwx1ACgD
0wIDAQAB
-----END PUBLIC KEY-----

460 bytes saved to /Users/andrea/fulanito.pem
```



#### Error: Bad role

When you didn't properly configure a role for segreta-generate:

```
$ secreta-generate-aws fulanito --region us-east-2 --account 123456789012
> secreta-generate-aws fulanito
    --key /Users/andrea
    --region us-east-2
    --account 123456789012
    --memory 512
    --timeout 60
CreateFunction request failed. (InvalidParameterValueException: The role defined for the function cannot be assumed by Lambda.)
```

+ Role ARN: `arn:aws:iam::<account>:role/Secreta_GenerateKeyPair`
+ Permissions:

    + `AmazonSSMFullAccess` (AWS managed policy)
    + `AWSLambdaBasicExecutionRole` (AWS managed policy)



### About the private key 

Access to the private key should be limited to the Lambda function from which you need to use your secrets.

At the moment, you need to assign the following policy to the role your Lambda will use (e.g. `LambdaBasicExecRole`). As you see it's tag based access. 

Conventional name: `Secreta_GetPrivateKey` (not used in code)

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

You don't really need to see the private key, more so because a nice feature of *Secreta* is that the private key is not even seen by the person creating the key pair.

If the `secreta-generate-aws` command ended showing a public key, it means that all went fine and the private key was saved to an SSM parameter named after the key pair ID. However, here it is:

```
$ aws ssm get-parameter --name "/Secreta/privateKey/fulanito"
{
    "Parameter": {
        "Type": "SecureString",
        "Name": "/Secreta/privateKey/fulanito",
        "Value": "...2492 bytes for this key..."
    }
}
```

If you are concerned about the fact that the name of the parameter discloses its contents (you paranoid), at the moment you are out of much luck, because there is no way to use another name, as an option. However, a search and replace in the code, in `secreta-generate-aws` and `secreta-decrypt-aws`, should be successful.

Notice that the private key is a SecureString, thus [it is encrypted with your default KMS key](http://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-about.html#sysman-param-defaultkms):

```
$ aws kms describe-key --key-id alias/aws/ssm
{
    "KeyMetadata": {
        "Origin": "AWS_KMS",
        "KeyId": "a7c79bc4-6989-45de-a486-45ccb94c5cbb",
        "Description": "Default master key that protects my SSM parameters when no other key is defined",
        "KeyManager": "AWS",
        "Enabled": true,
        "KeyUsage": "ENCRYPT_DECRYPT",
        "KeyState": "Enabled",
        "CreationDate": 1504854843.885,
        "Arn": "arn:aws:kms:us-east-2:123456789012:key/a7c79bc4-6989-45de-a486-45ccb94c5cbb",
        "AWSAccountId": "123456789012"
    }
}
```




## `secreta-encrypt` command

This is an npm package that installs the `secreta-encrypt` command.

`secreta-encrypt` is meant to be used by the person that has the role to encrypt secrets with any of the available public keys.



### Installation

```
$ npm install -g @aercolino/secreta-encrypt
```



### Usage

```
$ secreta-encrypt <key pair ID> 
    --key <dir where the public key is stored>
    --config <dir where all the config files are stored> 
    --secrets <dir where the plaintext secrets are stored> 
    --output <dir where the encrypted secrets will be stored>
```

+ it loads the configuration ([currently using `node-config`](https://github.com/lorenwest/node-config)) from the files in the directory at `<config_dir>`
+ if the configuration has no `SECRETUM` values, then it returns
+ if the configuration has some `SECRETUM` values without a corresponding value (even empty) at a matching path into the secrets loaded from the directory at `<secrets_dir>`, then it throws an exception
+ it copies each property with a `SECRETUM` value in the configuration from the file at `<secrets_dir>` to a memory object
+ it JSON-stringifies the memory object to a plaintext
+ it encrypts the plaintext to a ciphertext, using the public key at `<key_dir>/<key pair ID>.pem`
+ it saves the `<key pair ID>` and the ciphertext into the file at `<encrypted_dir>/<key pair ID>.secreta`



### Example

#### config

```
$ cat ~/tmp/config/default.json
{
    "plaintext": "value",
    "scalarSecret": "SECRETUM",
    "arraySecret": "SECRETUM",
    "objectSecret": "SECRETUM",
    "some": {
        "deeper": {
            "plaintext": "value",
            "scalarSecret": "SECRETUM",
            "arraySecret": "SECRETUM",
            "objectSecret": "SECRETUM"
        }
    }
}
```

#### secrets

```
$ cat ~/tmp/secrets/default.json
{
    "scalarSecret": "some value",
    "arraySecret": ["some", "value"],
    "objectSecret": {
        "some": "value"
    },
    "some": {
        "deeper": {
            "scalarSecret": "some value",
            "arraySecret": ["some", "value"],
            "objectSecret": {
                "some": "value"
            }
        }
    }
}
```

#### command

```
$ secreta-encrypt fulanito --config ~/tmp/config --secrets ~/tmp/secrets
> secreta-encrypt fulanito
    --key /Users/andrea
    --config /Users/andrea/tmp/config
    --secrets /Users/andrea/tmp/secrets
    --output /Users/andrea
256 bytes saved to /Users/andrea/fulanito.secreta
```

#### result

```
$ xxd /Users/andrea/fulanito.secreta
00000000: 06c3 b50b c3a2 c2ba c392 3cc3 bec2 8fc3  ..........<.....
00000010: a877 c3b1 c38d c289 c3a9 18c3 9776 52c3  .w...........vR.
00000020: a7c3 940f 6fc2 a1c3 a138 c39e 635c 0ec3  ....o....8..c\..
00000030: bb61 c39d c2bb c393 67c2 9ac3 a845 2049  .a......g....E I
00000040: c394 c39d c39c c29d c2ad 0e3a c3b3 17c2  ...........:....
00000050: 9b04 724f c286 7508 c299 c3b4 c38a 4b79  ..rO..u.......Ky
00000060: 4776 c38b 15c2 b1c3 a471 c399 c2a4 c29f  Gv.......q......
00000070: c293 c290 c3ad c2a6 0028 c2b1 7f46 2cc3  .........(...F,.
00000080: 8144 c3bf 3a35 08c3 a9c3 9056 13c3 a354  .D..:5.....V...T
00000090: c3b4 015f 0038 45c3 8530 c397 13c3 8ac2  ..._.8E..0......
000000a0: b541 c2bc c39a 2ac3 b7c3 b1c2 b7c3 98c2  .A....*.........
000000b0: bec2 b724 7528 c3ae 4ec3 a8c3 862c c2bf  ...$u(..N....,..
000000c0: c39a c3ae 64c3 9dc3 abc2 99c3 89c3 87c3  ....d...........
000000d0: b416 49c3 b117 3cc3 9bc2 9838 c3bb c398  ..I...<....8....
000000e0: c297 2bc3 8c01 6249 66c2 83c2 90c2 961a  ..+...bIf.......
000000f0: 08c3 ab05 01c2 9423 c39a 70c3 a2c3 a340  .......#..p....@
00000100: 25c3 b91c 38c3 a517 53c2 8746 2927 c3b2  %...8...S..F)'..
00000110: 39c2 9079 0bc3 87c3 a0c3 b567 c3a0 c3a5  9..y.......g....
00000120: c2b4 0572 c39d c2af c38b c2b9 c383 c284  ...r............
00000130: c2a7 0130 c3b0 c3b2 c3b1 c3be c3a2 c287  ...0............
00000140: c2b5 c29f c28f c3a4 3cc3 8bc3 b1c2 b63e  ........<......>
00000150: 356b c387 6bc3 bec2 9a54 1576 c391 c28d  5k..k....T.v....
00000160: 55c3 85c2 b440 c2a3 58c2 b8c2 87c2 abc2  U....@..X.......
00000170: 84c2 bbc2 8d6d 3507 6b77 c291 51c2 a9c2  .....m5.kw..Q...
00000180: 8b08 c28f c391 c3b4 c3b0 28c2 afc3 88c2  ..........(.....
00000190: 80                                       .
```


## `secreta-decrypt-aws` module

This is an npm package that installs the `secreta-decrypt-aws` module.

`secreta-decrypt-aws` is meant to be used by the programmer that develops the Lambda function that will use a configuration object, with decrypted and merged secrets.



### Installation

```
$ npm install --save @aercolino/secreta-decrypt-aws
```



### Usage

```
const configWithoutSecrets = buildConfig(); // configuration object, with some 'SECRETUM' placeholders
const pattern = '*.secreta'; // default glob
const configPromise = require('secreta-decrypt-aws').$mergeSecrets(configWithoutSecrets, pattern);

exports.handler = (event, context, callback) => configPromise.then((config) => {

    const decryptedValue = config.at.your.secret.path;
    // ...

});
```

+ the exported `$mergeSecrets` function takes a glob pattern of encrypted files to decrypt and returns a promise
+ the `configPromise` constant above thus caches the resolved config

    + it gets each file matching the pattern
    + it extracts the `<key pair ID>` of the private decryption key from the basename of the matched file
    + it retrieves the key from the protected location (eg: the AWS SSM param at `/Secreta/privateKey/<key pair ID>`)
    + it reads the ciphertext from the matched file
    + it decrypts the ciphertext to plaintext, using the retrieved key
    + it JSON-parses the plaintext into a memory object
    + it overwrites all `SECRETUM` values it finds in `config` with the values at matching names in the memory object (thus binding names to plaintext values)
    + it throws for any `SECRETUM` which can't be replaced by a secret
    + it doesn't do anything for any secret which is not used to replace anything





# AWS CLI utilities




## Lambdas



### List

```
$ aws lambda list-functions
{
    "Functions": [
        {
            "TracingConfig": {
                "Mode": "PassThrough"
            },
            "Version": "$LATEST",
            "CodeSha256": "...",
            "FunctionName": "hello-world",
            "MemorySize": 128,
            "CodeSize": 258,
            "FunctionArn": "arn:aws:lambda:us-east-2:...:function:hello-world",
            "Handler": "index.handler",
            "Role": "arn:aws:iam::...:role/LambdaBasicExecRole",
            "Timeout": 3,
            "LastModified": "2017-09-16T19:10:57.542+0000",
            "Runtime": "nodejs6.10",
            "Description": "A function to experiment with"
        },
    ...
}
```

### Get

```
$ aws lambda get-function-configuration --function-name Secreta_GenerateKeyPair
{
    "TracingConfig": {
        "Mode": "PassThrough"
    },
    "CodeSha256": "...",
    "FunctionName": "Secreta_GenerateKeyPair",
    "CodeSize": 579250,
    "MemorySize": 512,
    "FunctionArn": "arn:aws:lambda:us-east-2:...:function:Secreta_GenerateKeyPair",
    "Version": "$LATEST",
    "Role": "arn:aws:iam::...:role/Secreta_GenerateKeyPair",
    "Timeout": 60,
    "LastModified": "2017-10-06T11:26:31.517+0000",
    "Handler": "generateKeyPair.handler",
    "Runtime": "nodejs6.10",
    "Description": "Secreta function to create a pair of keys, store the private key, return the public key."
}
```

### Delete

```
$ aws lambda delete-function --function-name Secreta_GenerateKeyPair
(no feedback means OK)
```




## Parameters



### List

```
$ aws ssm describe-parameters
{
    "Parameters": [
        {
            "KeyId": "alias/aws/ssm",
            "Name": "/ServerlessPK/privateKey/pepito",
            "LastModifiedDate": 1506347853.679,
            "AllowedPattern": "^-----BEGIN RSA PRIVATE KEY-----[\\s\\S]+-----END RSA PRIVATE KEY-----\\s*$",
            "LastModifiedUser": "arn:aws:sts::...:assumed-role/Secreta_GenerateKeyPair/Secreta_GenerateKeyPair",
            "Type": "SecureString",
            "Description": "Secreta RSA Private Key"
        },
        ...
    ]
}
```


### Get

```
$ aws ssm get-parameter --name "/Secreta/privateKey/pepito"
{
    "Parameter": {
        "Type": "SecureString",
        "Name": "/Secreta/privateKey/pepito",
        "Value": "..."
    }
}
```


### Delete

```
$ aws ssm delete-parameters --names "/Secreta/privateKey/pepito"
{
    "InvalidParameters": [],
    "DeletedParameters": [
        "/Secreta/privateKey/pepito"
    ]
}
```





# Contributor Guide

I started by having all packages inside the same project. Later I discovered the [npm issue 2974](https://github.com/npm/npm/issues/2974) and understood that the only feasible way to have independent packages for npm was to also have independent projects on GitHub.

I extracted the npm packages from the Secreta project and individually published each from GitHub to npm:


|package|repo|
|---|---|
|[@aercolino/secreta-generate-aws](https://www.npmjs.com/package/@aercolino/secreta-generate-aws)|https://github.com/aercolino/secreta-generate-aws|
|[@aercolino/secreta-encrypt](https://www.npmjs.com/package/@aercolino/secreta-encrypt)|https://github.com/aercolino/secreta-encrypt|
|[@aercolino/secreta-decrypt-aws](https://www.npmjs.com/package/@aercolino/secreta-decrypt-aws)|https://github.com/aercolino/secreta-decrypt-aws|

I included them back into the Secreta project ([using this guide](https://legacy-developer.atlassian.com/blog/2015/05/the-power-of-git-subtree/)), for convenience:

Example:

```
$ git subtree add --prefix commands/secreta-generate-aws https://github.com/aercolino/secreta-generate-aws.git master --squash
```

Result:

|project|directory|
|---|---|
|`secreta`|https://github.com/aercolino/secreta|
|`secreta-generate-aws`|https://github.com/aercolino/secreta/commands/secreta-generate-aws|
|`secreta-encrypt`|https://github.com/aercolino/secreta/commands/secreta-encrypt|
|`secreta-decrypt-aws`|https://github.com/aercolino/secreta/modules/secreta-decrypt-aws|

So, the development flow involves 

1. git clone https://github.com/aercolino/secreta
1. git commit to a feature branch and push to it as much as needed
1. when ready, merge the feature branch into master (this doesn't update extracted projects)
1. when needed, git subtree push [using this guide](https://medium.com/@v/git-subtrees-a-tutorial-6ff568381844) (this does update extracted projects)



## secreta-generate-aws



### command

```
$ cd .../secreta-generate-aws
$ npm install -g
$ npm link
```



### lambda

```
$ cd .../secreta-generate-aws/lambda
$ npm install
$ npm start
```

#### Testing

```
$ npm test
```

With debugging logs

```
$ DEBUG=Secreta npm test
```

For debugging keys

```
$ DEBUG=Secreta:Keys npm test
```



## secreta-encrypt



### command

```
$ cd .../secreta-encrypt
$ npm install -g
$ npm link
```





# Trivia




## Choosing the name

*Secreta* and *secretum* are Latin for *secrets* and *secret*.

Before deciding for *Secreta*, I looked for how to say **secret** in many languages (thanks to Google Translate).

asiri
bí mật
chinsinsi
geheim
geheimnis
gizli
gyfrinach
hemlighet
hemmelig
hemmelighed
imfihlo
lekunutu
leyndarmál
lihim
miafina
ngaro
noslēpums
nzuzo
paslaptis
qarsoodi ah
rahasia
rahsia
rúnda
saladus
salaisuus
secret
secreto
secretum
segredo
segreto
sekret
sekreta
sekreto
sekretua
sekrè
sigriet
sir
siri
skrivnost
tajna
tajný
tajomstvo
titok
tsis pub leejtwg paub
ìkọkọ

Including all these others that I can't even read (yet):

μυστικό
нууц
пинҳонӣ
сакрэт
секрет
тайна
тајна
құпия
գաղտնի
געהיים
סוֹד
خفیہ
راز
سر
गुप्त
गोप्य
গোপন
ગુપ્ત
இரகசிய
రహస్య
ರಹಸ್ಯ
രഹസ്യ
රහස්
ลับ
ຄວາມລັບ
လျှို့ဝှက်ချက်
საიდუმლო
សម្ងាត់
秘密
비밀

--
the end
