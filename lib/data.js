/*
* Library for storing and editing data
*
*
*/

// Dependencies
const path = require('path');
const {fs} = require('./promisified');
const util = require('util');

const debug = util.debuglog('data');

// Container for the module
let lib = {};

// Base directory of the data folder
lib.baseDir = path.join(__dirname,'../.data');

lib.create = async function(dir, file, data){
    debug('Creating file ', `${lib.baseDir}/${dir}/${file}.json`);
    let strData = JSON.stringify(data);
    let fd = await fs.open(`${lib.baseDir}/${dir}/${file}.json`, 'wx');
    await fs.writeFile(fd, strData);
    return await fs.close(fd);
};

lib.read = async function(dir, file){
    debug('Reading file ', `${lib.baseDir}/${dir}/${file}.json`);
    let userStr = await fs.readFile(`${lib.baseDir}/${dir}/${file}.json`, 'utf-8');
    return await helpers.parseStringToObject(userStr);
};

lib.update = async function(dir, file, data){
    debug('Updating file ', `${lib.baseDir}/${dir}/${file}.json`);
    let strData = JSON.stringify(data);
    let fd = await fs.open(`${lib.baseDir}/${dir}/${file}.json`, 'r+');
    await fs.truncate(fd);
    await fs.writeFile(fd, strData);
    return await fs.close(fd);
};

lib.delete = async function(dir, file){
    debug('Deleting file ', `${lib.baseDir}/${dir}/${file}.json`);
    return await fs.unlink(`${lib.baseDir}/${dir}/${file}.json`);
};

//List all the items in a directory
lib.list = async (dir) => {
    debug('Listing directory ', dir );
    let data = await fs.readdir(lib.baseDir+'/'+dir);
    if (data.length > 0){
        let trimmedFileNames = [];
        data.forEach((fileName) => {
            //Remove .json
            trimmedFileNames.push(fileName.replace('.json', ''));
        });
        return trimmedFileNames;
    }
};

//Export the module
module.exports = lib;