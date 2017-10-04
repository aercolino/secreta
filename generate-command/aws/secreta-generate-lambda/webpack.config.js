const fs = require('fs');
const path = require('path');

const name = path.basename(__dirname);

module.exports = {
    entry: {
        [name]: `${__dirname}/src/index.js`,
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
