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
+ At rest, the secret configuration values are kept in ciphertext into the file at `<ID>.secreta`
+ At run time, decryption of `<ID>.secreta` occurs in memory and all the names of `SECRETUM` values are linked to the matching plaintext values




## Secreta packages



### `secreta-generate`

This is an npm package that installs the `secreta-generate` command.

`secreta-generate` is meant to be used by the person that has the role to generate a pair of private and public RSA keys.


#### Installation

```
$ npm install -g @aercolino/secreta-generate
```

##### Development
###### command

```
$ cd .../secreta/generate-command/aws/secreta-generate
$ npm install -g
$ npm link
```
###### lambda
```
$ cd .../secreta/generate-command/aws/secreta-generate-lambda
$ npm start
```

#### Usage

```
$ secreta-generate <key pair ID> 
    --key <dir for storing the public key> 
    --region <region where everything happens>
    --account <the 12 digits og the AWS account>
    --memory <how big the Lambda machine is (in megabytes)>
    --timeout <how long to wait before aborting (in seconds)>
```

+ if there is no `secreta-generate` serverless function on the provider, it uploads it
+ it invokes the `secreta-generate` function, which in turn

    + creates a key pair for the given `<ID>`
    + stores the private key (used for decryption) into a protected location (an AWS SSM param at `/Secreta/privateKey/<ID>`)
    + protects the location so that only the Lambda function will be able to access the private key (with a `Secreta = privateKey` tag)
    + downloads the public key (used for encryption) to the file at `<key>/<ID>.pem`



#### Examples


##### Happy path

When all gets through:

```
$ secreta-generate fulanito --region us-east-2 --account 123456789012
> secreta-generate fulanito
    --key /Users/andrea
    --region us-east-2
    --account 123456789012
    --memory 512
    --timeout 60
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


##### Error: Bad role

When you didn't properly configure a role for segreta-generate:

```
$ secreta-generate fulanito --region us-east-2 --account 123456789012
> secreta-generate fulanito
    --key /Users/andrea
    --region us-east-2
    --account 123456789012
    --memory 512
    --timeout 60
CreateFunction request failed. (InvalidParameterValueException: The role defined for the function cannot be assumed by Lambda.)
```

+ Role ARN: `arn:aws:iam::<account>:role/Secreta_GenerateKeyPair`
+ Permissions:

    + AmazonSSMFullAccess (AWS managed policy)
    + AWSLambdaBasicExecutionRole (AWS managed policy)


#### About the private key 

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

If the `secreta-generate` command ended showing a public key, it means that all went fine and the private key was saved to an SSM parameter named after the key pair ID. However, here it is:

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

If you are concerned about the fact that the name of the parameter discloses its contents (you paranoid), at the moment you are out much luck, because there is no way to use another name, as an option. However, a search and replace in the code, in `secreta-generate` and `secreta-decrypt`, should be successful.

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



### `secreta-encrypt`

This is an npm package that installs the `secreta-encrypt` command.

`secreta-encrypt` is meant to be used by the person that has the role to encrypt secrets with any of the available public keys.


#### Installation

```
$ npm install -g @aercolino/secreta-encrypt
```

For development:

```
$ cd .../secreta/generate-command/aws/secreta-encrypt
$ npm install -g
$ npm link
```


#### Usage

```
$ secreta-encrypt <ID> 
    --public-key <dir> 
    --config <dir> 
    --secrets <dir> 
    --output <dir>
```

+ it loads the configuration ([currently using `node-config`](https://github.com/lorenwest/node-config)) from the files in the directory at `<config_path>`
+ if the configuration has no `SECRETUM` values, then it returns
+ if the configuration has some `SECRETUM` values without a corresponding value (even empty) at a matching path into the secrets loaded from the directory at `<secrets_path>`, then it throws an exception
+ it copies each property with a `SECRETUM` value in the configuration from the file at `<secrets_path>` to a memory object
+ it JSON-stringifies the memory object to a plaintext
+ it encrypts the plaintext to a ciphertext, using the public key at `<key_path>/<ID>.pem`
+ it saves the `<ID>` and the ciphertext into the file at `<encrypted_path>/<ID>.secreta`



### `secreta-decrypt` module

This is an npm package that installs the `secreta-decrypt` module.

`secreta-decrypt` is meant to be used by the programmer that develops the Lambda function that will use a configuration object, with decrypted and merged secrets.


#### Installation

```
$ npm install --save @aercolino/secreta-decrypt
```


#### Usage

```
const configWithoutSecrets = buildConfig(); // configuration object, with some 'SECRETUM' placeholders
const pattern = '*.secreta'; // default glob
const configPromise = require('secreta-decrypt').$mergeSecrets(configWithoutSecrets, pattern);

exports.handler = (event, context, callback) => configPromise.then((config) => {

    const decryptedValue = config.at.your.secret.path;
    // ...

});
```

+ the exported `$mergeSecrets` function takes a glob pattern of encrypted files to decrypt and returns a promise
+ the `configPromise` constant above thus caches the resolved config

    + it gets each file matching the pattern
    + it extracts the `<ID>` of the private decryption key from the basename of the matched file
    + it retrieves the key from the protected location (eg: the AWS SSM param at `/Secreta/privateKey/<ID>`)
    + it reads the ciphertext from the matched file
    + it decrypts the ciphertext to plaintext, using the retrieved key
    + it JSON-parses the plaintext into a memory object
    + it overwrites all `SECRETUM` values it finds in `config` with the values at matching names in the memory object (thus binding names to plaintext values)
    + it throws for any `SECRETUM` which can't be replaced by a secret
    + it doesn't do anything for any secret which is not used to replace anything




## Trivia

### Choosing Secreta

*Secreta* and *secretum* are Latin for *secrets* and *secret*.

Before deciding, I looked for how to say **secret** in many languages (thanks to Google Translate).

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
