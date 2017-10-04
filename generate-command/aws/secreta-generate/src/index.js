#!/usr/bin/env node

const cli = require('commander');
const code = require('./generate');

cli
    .version('1.0');

cli
    .arguments('<id>')
    .description('Create a pair of PKI keys on AWS, store private there, store public here.')
    .option('-k, --key <dir>', 'Where to save the public key.')
    .option('-r, --region <aws region>', 'The region to use. Overrides config/env settings.')
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
// which in fact mean that (form 2) allows `$ spk create pepito --key something` and `$ spk create pepito --key`
// while (form 1) only allows `$ spk create pepito --key something` and forbids `$ spk create pepito --key`
// thus, in the following use cases, it only makes sense to use (1)
