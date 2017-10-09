const fs = require('fs');
const path = require('path');

const name = 'generateKeyPair';

module.exports = {
    entry: {
        [name]: `${__dirname}/src/generateKeyPair.js`,
    },
    output: {
        path: `${__dirname}/dist`,
        library: '[name]',
        libraryTarget: 'commonjs2',
        filename: '[name].js',
    },
    target: 'node',
    module: {
        loaders: [ {
            test: /\.js$/,
            exclude: /node_modules/,
            loader: 'babel-loader',
            query: JSON.parse(fs.readFileSync(`${__dirname}/.babelrc`, { encoding: 'utf8' })),
        }, {
            test: /\.json$/,
            loader: 'json-loader',
        } ],
    },
};
