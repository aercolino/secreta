module.exports.fixtures = {
    whenThereAreNoSecretsToProtect: [
        {
            case: 'no config at all',
            config: {},
            secrets: {},
        },
        {
            case: 'no SPK_SECRET',
            config: { plaintext: 'value' },
            secrets: { other: 'secret' },
        },
    ],

    whenSomePlaintextSecretsAreMissing: [
        {
            case: 'all SPK_SECRET, no secrets',
            config: { ciphertext: 'SPK_SECRET' },
            secrets: {},
        },
        {
            case: 'some SPK_SECRET without corresponding secret: missing scalar',
            config: { plaintext: 'value', ciphertext: 'SPK_SECRET', other: 'SPK_SECRET' },
            secrets: { other: 'secret' },
        },
        {
            case: 'some SPK_SECRET without corresponding secret: missing array index',
            config: { plaintext: 'value', ciphertext: ['plaintext', 'SPK_SECRET'], other: 'SPK_SECRET' },
            secrets: { other: 'secret', ciphertext: ['plaintext'] },
        },
        {
            case: 'some SPK_SECRET without corresponding secret: missing object key',
            config: { plaintext: 'value', ciphertext: { key1: 'plaintext', key2: 'SPK_SECRET' }, other: 'SPK_SECRET' },
            secrets: { other: 'secret', ciphertext: { key1: 'plaintext', key3: 'plaintext' } },
        },
        {
            case: 'some deep SPK_SECRET without corresponding deep secret',
            config: { some: { deeper: { plaintext: 'value', ciphertext: 'SPK_SECRET' } } },
            secrets: { some: { deeper: { other: 'secret' } } }, // it's possible to have this path here but not in config
        },
    ],

    whenEverythingIsJustAsItShouldBe: [
        {
            case: 'scalar secret',
            config: { plaintext: 'value', ciphertext: 'SPK_SECRET' },
            secrets: { ciphertext: 'whatever' },
        },
        {
            case: 'array secret',
            config: { plaintext: 'value', ciphertext: 'SPK_SECRET' },
            secrets: { ciphertext: ['some', 'value'] },
        },
        {
            case: 'object secret',
            config: { plaintext: 'value', ciphertext: 'SPK_SECRET' },
            secrets: { ciphertext: { 'some': 'value' } },
        },
        {
            case: 'deep scalar secret',
            config: {
                some: { deeper: { plaintext: 'value', ciphertext: 'SPK_SECRET' } },
            },
            secrets: {
                some: { deeper: { ciphertext: 'SPK_SECRET' } },
            },
        },
        {
            case: 'deep array secret',
            config: {
                some: { deeper: { plaintext: 'value', ciphertext: 'SPK_SECRET' } },
            },
            secrets: {
                some: { deeper: { ciphertext: ['some', 'value'] } },
            },
        },
        {
            case: 'deep object secret',
            config: {
                some: { deeper: { plaintext: 'value', ciphertext: 'SPK_SECRET' } },
            },
            secrets: {
                some: { deeper: { ciphertext: { 'some': 'value' } } },
            },
        },
    ],
};
