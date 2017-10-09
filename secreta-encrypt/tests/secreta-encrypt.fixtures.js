module.exports.fixtures = {
    whenThereAreNoSecretsToProtect: [
        {
            case: 'no config at all',
            config: {},
            secrets: {},
        },
        {
            case: 'no SECRETUM',
            config: { plaintext: 'value' },
            secrets: { other: 'secret' },
        },
    ],

    whenSomePlaintextSecretsAreMissing: [
        {
            case: 'all SECRETUM, no secrets',
            config: { ciphertext: 'SECRETUM' },
            secrets: {},
        },
        {
            case: 'some SECRETUM without corresponding secret: missing scalar',
            config: { plaintext: 'value', ciphertext: 'SECRETUM', other: 'SECRETUM' },
            secrets: { other: 'secret' },
        },
        {
            case: 'some SECRETUM without corresponding secret: missing array index',
            config: { plaintext: 'value', ciphertext: ['plaintext', 'SECRETUM'], other: 'SECRETUM' },
            secrets: { other: 'secret', ciphertext: ['plaintext'] },
        },
        {
            case: 'some SECRETUM without corresponding secret: missing object key',
            config: { plaintext: 'value', ciphertext: { key1: 'plaintext', key2: 'SECRETUM' }, other: 'SECRETUM' },
            secrets: { other: 'secret', ciphertext: { key1: 'plaintext', key3: 'plaintext' } },
        },
        {
            case: 'some deep SECRETUM without corresponding deep secret',
            config: { some: { deeper: { plaintext: 'value', ciphertext: 'SECRETUM' } } },
            secrets: { some: { deeper: { other: 'secret' } } }, // it's possible to have this path here but not in config
        },
    ],

    whenEverythingIsJustAsItShouldBe: [
        {
            case: 'scalar secret',
            config: { plaintext: 'value', ciphertext: 'SECRETUM' },
            secrets: { ciphertext: 'some value' },
        },
        {
            case: 'array secret',
            config: { plaintext: 'value', ciphertext: 'SECRETUM' },
            secrets: { ciphertext: ['some', 'value'] },
        },
        {
            case: 'object secret',
            config: { plaintext: 'value', ciphertext: 'SECRETUM' },
            secrets: { ciphertext: { 'some': 'value' } },
        },
        {
            case: 'deep scalar secret',
            config: {
                some: { deeper: { plaintext: 'value', ciphertext: 'SECRETUM' } },
            },
            secrets: {
                some: { deeper: { ciphertext: 'some value' } },
            },
        },
        {
            case: 'deep array secret',
            config: {
                some: { deeper: { plaintext: 'value', ciphertext: 'SECRETUM' } },
            },
            secrets: {
                some: { deeper: { ciphertext: ['some', 'value'] } },
            },
        },
        {
            case: 'deep object secret',
            config: {
                some: { deeper: { plaintext: 'value', ciphertext: 'SECRETUM' } },
            },
            secrets: {
                some: { deeper: { ciphertext: { 'some': 'value' } } },
            },
        },
    ],
};
