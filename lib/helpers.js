/*
*Helper methods for various tasks
*
*/

//Dependencies
const crypto = require('crypto');
const config = require('./config');
const https = require('https');
const util = require('util');

helpers = {};
promisified = {};

promisified.request = util.promisify(https.request);

helpers.hash = (str) => {
    if (typeof(str) == 'string' && str.length > 0){
        return crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
    } else{
        return false;
    }
};

//Parse a string to an object without throwing
helpers.parseStringToObject = (str) => {
    try{
        return JSON.parse(str);
    } catch (err){
        return {};
    }
};

helpers.randomString = (length) => {
    length = typeof(length) == 'number' && length > 0? length : false;
    if (length) {
        let allowedChars = '0123456789abcdefghijklmnopqrstuvwxyz';
        let str = '';
        for (let i = 0; i < length; i++){
            str += allowedChars.charAt(Math.floor(Math.random() * allowedChars.length));
        }
        return str;
    } else {
        return false;
    }
};

module.exports = helpers;