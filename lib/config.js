/*
* Create and export configuration variables
*
*/

// Container for all of the environments
let environments = {};

// Default to staging environment
environments.staging = {
    'httpPort' : 3000,
    'httpsPort' : 3001,
    'envName' : 'staging',
    'hashingSecret' : 'TODO replace me',
    'maxChecks' : 5,
    'stripe': {
        'publicKey': 'pk_test_9fW2iYhop6UsICWqfDMRDQA2',
        'privateKey': process.env.STRIPE_API_KEY_SECRET,
    },
    mailgun = {
        validationKey: process.env.MAILGUN_PUBLIC_VALIDATION_KEY,
        privateKey: process.env.MAILGUN_PRIVATE_API_KEY
    }
};

// Production object
environments.production = {
    'httpPort' : 3000,
    'httpsPort' : 3001,
    'envName' : 'staging',
    'hashingSecret' : 'TODO replace me',
    'maxChecks' : 5,
    'stripe': {
        'API_KEY_PUBLISHABLE': 'pk_test_9fW2iYhop6UsICWqfDMRDQA2',
        'API_KEY_SECRET': process.env.STRIPE_API_KEY_SECRET,
    },
    mailgun = {
        PUBLIC_VALIDATION_KEY: process.env.MAILGUN_PUBLIC_VALIDATION_KEY,
        PRIVATE_API_KEY: process.env.MAILGUN_PRIVATE_API_KEY
    }
};

// Determine which environemt was passed as a command-line arg
var selectedEnv = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : 'staging';

// Check that the currentEnv is valid
var envToExport = typeof(environments[selectedEnv]) == 'object' ? environments[selectedEnv] : environments.staging;

module.exports = envToExport;