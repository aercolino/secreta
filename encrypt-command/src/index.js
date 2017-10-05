#!/usr/bin/env node

const cli = require('commander');
const code = require('./encrypt');

cli
    .version('0.1.0');

cli
    .command('encrypt <id>')
    .description('Encrypt secrets using your local public key.')
    .option('-k, --key <dir>', 'Directory from where to get the public key.')
    .option('-c, --config <dir>', 'Directory from where to get the names of the secrets.')
    .option('-s, --secrets <dir>', 'Directory from where to get the values of the secrets.')
    .option('-o, --output <dir>', 'Directory where to put the encrypted file.')
    .action(code);

cli.parse(process.argv);

const noCommandSpecified = cli.args.length === 0;

if (noCommandSpecified) {
    cli.help();
}

// --
// note to self
// (form 1) `.option('-k, --key <dir>'...)` vs (form 2) `.option('-k, --key [dir]'...)`
// (form 1) means that the value is required, (form 2) means that it is optional
// which in fact mean that (form 2) allows `$ secreta-generate pepito --key something` and
// `$ secreta-generate pepito --key` while (form 1) only allows `$ secreta-generate pepito --key something`
// and forbids `$ secreta-generate pepito --key` thus, for my use case, it only makes sense to use (1)
