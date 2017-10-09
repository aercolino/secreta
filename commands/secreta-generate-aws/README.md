# *Secreta*

*Secreta* is a little suite of tools for managing configuration secrets in AWS Lambda functions.

**Features**

1. Asymmetric encryption with RSA keys (public and private), directly generated on AWS.
1. Local encryption on disk with the public key: both this key and the ciphertext can be shared in the repo.
1. Remote decryption in memory with the private key: this key is stored encrypted, directly on AWS.

# *Secreta Generate for AWS*

[Documentation](https://github.com/aercolino/secreta)
