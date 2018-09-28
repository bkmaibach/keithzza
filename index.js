/*
*Primary file for the API
*
*/

const server = require('./lib/server');
//const workers = require('./lib/workers');

//Declare the app
let app = {};

app.init = () => {
    //Start the server
    server.init();

    //Start the workers
    //workers.init();
};

//Execute initialization
app.init();

//Export the app

module.exports = app;