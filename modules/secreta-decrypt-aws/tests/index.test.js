const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const sinonTest = require('sinon-test')(sinon);

chai.use(chaiAsPromised);
chai.use(sinonChai);
const { expect } = chai;
// --

// --
const secretaDecrypt = require('../src/index.js');

console.log('Node version', process.version);

describe('secreta-decrypt', function () {

    it('should export $mergeSecrets, $decrypt, and $getCrypto functions', sinonTest(function (done) {
        expect(secretaDecrypt.$mergeSecrets).to.be.a('function');
        expect(secretaDecrypt.$decrypt).to.be.a('function');
        expect(secretaDecrypt.$getCrypto).to.be.a('function');
        done();
    }));

});


// This is useful to reset the closure of a module.
function reload(path) {
    delete require.cache[require.resolve(path)];
    return require(path);
}
