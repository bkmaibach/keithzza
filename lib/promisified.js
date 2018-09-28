// Promisified functions return promises instead of calling callbacks and can be used with async/await

//Dependencies
const fs = require('fs');
const zlib = require('zlib');
const util = require('util');

let lib = {
    'fs' : {},
    'zlib' : {}
}

lib.fs.open = util.promisify(fs.open);
lib.fs.appendFile = util.promisify(fs.appendFile);
lib.fs.close = util.promisify(fs.close);
lib.fs.readFile = util.promisify(fs.readFile);
lib.fs.truncate = util.promisify(fs.truncate);
lib.fs.writeFile = util.promisify(fs.writeFile);
lib.fs.unlink = util.promisify(fs.unlink);
lib.fs.readdir = util.promisify(fs.readdir);

lib.zlib.gzip = util.promisify(zlib.gzip);
lib.zlib.unzip = util.promisify(zlib.unzip);

module.exports = lib;