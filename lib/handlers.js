/*
*Request handlers
*
*/

//Dependencies
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');
const util = require('util');
const validator = require("email-validator");
const stripe = require('stripe')(config.stripe.API_KEY_SECRET);
const menu = require('./menu');
const Mailgun = require('mailgun-js');

const mailgunKey = config.mailgunKey;
const mailgunDomain ="sandbox196d8747e6b2408dabb7010893bd148b.mailgun.org";
const mailgunFrom = 'bmaibach@gmail.com';

const debug = util.debuglog('handlers');

let handlers = {};

handlers.ping = async (data, callback) => {
    console.log('ping handler activated');
    callback(200, {"message": "Ping!"});
}
handlers.notFound = async (data, callback) => {
    console.log('notFound handler activated');
    callback(404);
}

handlers.users = (data, callback) => {
    let acceptedMethods = ['post', 'get', 'put', 'delete'];
    if(acceptedMethods.indexOf(data.method) > -1){
        handlers._users[data.method](data,callback);
    } else {
        callback(405, {'error': 'Unsupported method'});
    }
};

handlers.tokens = (data, callback) => {
    let acceptedMethods = ['post', 'get', 'put', 'delete'];
    if(acceptedMethods.indexOf(data.method) > -1){
        handlers._tokens[data.method](data,callback);
    } else {
        callback(405, {'error': 'Unsupported method'});
    }
};

handlers.carts = (data, callback) => {
    let acceptedMethods = ['post', 'get', 'put', 'delete', 'patch'];
    if(acceptedMethods.indexOf(data.method) > -1){
        handlers._carts[data.method](data,callback);
    } else {
        callback(405, {'error': 'Unsupported method'});
    }
};

handlers.items = (data, callback) => {
    let acceptedMethods = ['get'];
    if(acceptedMethods.indexOf(data.method) > -1){
        debug('entered get /items');
        callback(200, menu.items);
    } else {
        callback(405, {'error': 'Unsupported method'});
    }
};


handlers.orders = async (data, callback) => {
    let acceptedMethods = ['post'];
    if(acceptedMethods.indexOf(data.method) > -1){
        debug('entered post /orders');

        let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
    
        try{
            let gotToken = await _data.read('tokens', token);
            let gotUser = await _data.read('users', gotToken.email);
            if(await handlers._tokens.verifyToken(token, gotToken.email)){
                let cartId = typeof(gotUser.cartId) == 'string'
                    && gotUser.cartId.length == 20
                    ? gotUser.cartId : false;
                if(cartId){
                    try{
                        let gotCart = await _data.read('carts', gotUser.cartId);
                        let total = 0;
                        gotCart.items.forEach((item) => {
                            total += (menu.getItemPrice(item.sku)*item.quantity);
                        });
                        total = Math.floor(total*100);
                        try {
                            
                            charge = await stripe.charges.create({
                                amount: total,
                                currency: 'cad',
                                source: 'tok_visa',
                                receipt_email: gotToken.email
                            });
                            
                        } catch (error){
                            console.log(error);
                            callback(500, {'error': 'The charge could not be made'});
                        }
                        try{

                            //We pass the api_key and domain to the wrapper, or it won't be able to identify + send emails
                            var mailgun = new Mailgun({apiKey: mailgunKey, domain: mailgunDomain});

                            var data = {
                            //Specify email data
                            from: mailgunFrom,
                            //The email to contact
                            to: gotToken.email,
                            //Subject and text data  
                            subject: 'Thank you - Your purchase has been processed',
                            html: 'Thank you for your purchase of ' + JSON.stringify(gotCart.items) + ' totalling $' + total/100
                            }
                            console.log(JSON.stringify(data));
                            //Invokes the method to send emails given the above data with the helper library
                            mailgun.messages().send(data, function (err, body) {
                                //If there is an error, render the error page
                                if (err) {
                                    throw err;
                                }
                                else {
                                    console.log(body);
                                }
                            });

                            callback(200, charge);
                        } catch (error){
                            console.log(error)
;                           callback(500, {'error': 'There was a problem generating your receipt, please contact support'});
                        }

                        

                        
                    } catch (error){
                        console.log(error);
                        callback(500, {'error': 'The cart could not be retrieved'});
                    }

                    
                } else {
                    callback(400, {'error': 'The user does not have a cart'});
                }
            }else {
                callback(403, {'error': 'The request could not be authenticated'});
            }

        } catch (error){
            console.log(error);
            callback(403, {'error':'The token or user could not be found' });
        }

    } else {
        callback(405, {'error': 'Unsupported method'});
    }
};

//Container for the users submethods
handlers._users = {};

//Required data: firstName, lastName, email, password, tosAgreement
//Optional data: none
handlers._users.post = async (data,callback) => {
    debug('entered post /users');
    //cart that all required fields are present
    let firstName = typeof(data.payload.firstName) == 'string' 
        && data.payload.firstName.trim().length > 0 
        ? data.payload.firstName.trim() : false;

    let lastName = typeof(data.payload.lastName) == 'string' 
        && data.payload.lastName.trim().length > 0 
        ? data.payload.lastName.trim() : false;

    let email = typeof(data.payload.email) == 'string' 
        &&  validator.validate(data.payload.email.trim())
        ? data.payload.email.trim() : false;

    let password = typeof(data.payload.password) == 'string' 
        && data.payload.password.trim().length >= 8 
        ? data.payload.password.trim() : false;

    let tosAgreement = data.payload.tosAgreement === true ? true : false;

    if(firstName && lastName && email && password && tosAgreement){
        try {
            //Ensure uniqueness of user email
            let data = await _data.read('users', email);
            callback(400, {'error' : `User with email ${data.email} already exists`} );
        }

        catch (error) {
            
            if (error.code == 'ENOENT'){
                //This catch block is entered if no user exists. The new user may be created.
                let pwHash = helpers.hash(password);

                if(pwHash){
                    //create the user object
                    let userObj = {
                        firstName,
                        lastName,
                        email,
                        pwHash,
                        tosAgreement
                    };

                    //Store the user
                    try{
                        await _data.create('users', email, userObj);
                        callback(200, {'Message' : `A new user has been created under the email ${email}`});
                    } catch (err){
                        console.log(err);
                        callback(500, {'error' : 'Could not create a new user'});
                    }
                }
            }
            else{
                callback(500, {'error' : 'There was a problem reading user data'} );
            }  
        };
    } else {
        callback(400, {'error' : 'Missing required field'});
    }
};
//Users - get
//Required data: email
//Optional data: none
handlers._users.get = async (data,callback) => {
    debug('entered get /users');
    let email = typeof(data.queryStringObject.email) == 'string' 
        &&  validator.validate(data.queryStringObject.email.trim())
        ? data.queryStringObject.email.trim() : false;

    if(email){
        //All methods requiring authentication must first obtain the token from the headers
        let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        if(await handlers.handlers._tokens.verifyToken(token, email)){
            try{
                let gotUser = await _data.read('users', email);
                console.log(gotUser);
                delete gotUser.pwHash;
    
                callback(200, gotUser);
            } catch(error) {
                if (error.code == 'ENOENT'){
                    callback(400, {'error': 'The queried email could not be found'});
                } else{
                    callback(500, {'error': 'There was a problem getting the user'});
                }
            }
        } else {
            callback(403, {'error': 'The request was not authenticated'});
        }
    } else {
        callback(400, {'error': 'Missing required field'});
    }
};

//Users - put
//Required data: email
//Optional data: firstName, lastName, password (at least one must be specified)
handlers._users.put = async (data,callback) => {
    debug('entered put /users');
    //cart for the required field
    let email = typeof(data.payload.email) == 'string' 
        &&  validator.validate(data.payload.email.trim())
        ? data.payload.email.trim() : false;

    //cart for the optional fields
    let firstName = typeof(data.payload.firstName) == 'string' 
        && data.payload.firstName.trim().length > 0 
        ? data.payload.firstName.trim() : false;

    let lastName = typeof(data.payload.lastName) == 'string' 
        && data.payload.lastName.trim().length > 0 
        ? data.payload.lastName.trim() : false;

    let password = typeof(data.payload.password) == 'string' 
        && data.payload.password.trim().length == 8 
        ? data.payload.password.trim() : false;

    //The request must have the email and one of the required fields
    if(email & (firstName || lastName || password)){

        let token = typeof(data.headers.token) == 'string' 
        && data.headers.token.trim().length === 20 
        ? data.headers.token : false;

        if(await handlers._tokens.verifyToken(token, email)){
            try {
                let gotUser = await _data.read('users', email);
                gotUser.firstName = firstName ? firstName : gotUser.firstName;
                gotUser.lastName = lastName ? lastName : gotUser.lastName;
                gotUser.pwHash = password ? helpers.hash(password) : gotUser.pwHash;

                //Write (update) the values
                try {
                    _data.update('users', email, gotUser);
                    callback(200, {'message' : 'User updated successfully'});
                }
                catch (error){
                    callback(500, {'error': 'There was an unknown error updating the user'});
                }
            } catch (error){
                if (error.code == 'ENOENT'){
                    callback(400, {'error': 'The queried email could not be found'});
                } else{
                    callback(500, {'error': 'There was an unknown error getting the user'});
                }
            }
        } else {
            callback(403, {'error': 'The request was not authenticated'});
        }
    } else {
        callback(400, {'error': 'Requires email and at least one optional field'});
    }
};

// Requried field: email
handlers._users.delete = async (data,callback) => {
    // cart that the email number is valid
    debug('entered delete /users');
    let email = typeof(data.queryStringObject.email) == 'string' 
        &&  validator.validate(data.queryStringObject.email.trim())
        ? data.queryStringObject.email.trim() : false;

    if(email){
        let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        if(await handlers._tokens.verifyToken(token, email)){
            try{
                //Read the user and delete each cart associated with it
                let gotUser = await _data.read('users', email);
                if(gotUser.carts){
                    gotUser.carts.forEach((cart) => {
                        try{
                            _data.delete('carts', cart);
                        } catch (error){
                            callback(500, {'error': 'Could not delete associated user data'});
                            throw 'Internal error deleting associated user data'
                        }
                    });
                }
                await _data.delete('users', email);
                
                callback(200, {'message' : 'Successfully deleted user'});
            }
            catch(error) {
                if (error.code == 'ENOENT'){
                    callback(400, {'error': 'The queried email could not be found'});
                } else{
                    callback(500, {'error': 'There was a problem deleting the user'});
                }
            };
        } else {
            callback(403, {'error': 'The request was not authenticated'});
        }
    } else {
        callback(400, {'error': 'Missing required field'});
    }
};

//Container for all the tokens methods
handlers._tokens = {};

//Required data - email and password
//Optional data - none
handlers._tokens.post = async (data,callback) => {
    debug('entered post /tokens');
    let email = typeof(data.payload.email) == 'string' 
        &&  validator.validate(data.payload.email.trim())
        ? data.payload.email.trim() : false;

    let password = typeof(data.payload.password) == 'string' ? data.payload.password.trim() : false;

    if (email && password){
        try{
            //Lookup the user that matches that email
            let gotUser = await _data.read('users', email);
            sentPwHash = helpers.hash(data.payload.password);
            if (gotUser.pwHash == sentPwHash){
                //the password is correct
                let id = helpers.randomString(20);
                let  expires = Date.now() + 1000 * 60 * 60;
                let tokenObj = {
                    email,
                    expires,
                    id
                };
                //Store the token
                try{
                    await _data.create('tokens', id, tokenObj);
                    callback(200, tokenObj)
                } catch (error){
                    console.log(error);
                    callback(500, {'error':'could not record token'})
                }   
            } else {
                //The password is inccorect
                callback(400, {'error': 'The password did not match the user\'s stored password'});
            }
        } catch(error) {
            if (error.code == 'ENOENT'){
                callback(400, {'error': 'The specified user does not exist'});
            } else{
                callback(500, {'error': 'There was a problem getting the user'});
            }
        }
    } else {
        callback(400, {'error': 'Missing required fields'});
    }
};

//Required data - id
//Optional data - none
handlers._tokens.get = async (data,callback) => {
    debug('entered get /tokens');
    let id = typeof(data.queryStringObject.id) == 'string' 
        && data.queryStringObject.id.trim().length == 20 
        ? data.queryStringObject.id.trim() : false;

    if(id){
        try{
            let gotToken = await _data.read('tokens', id);
            callback(200, gotToken);
        }
        catch(error) {
            if (error.code == 'ENOENT'){
                callback(400, {'error': 'The queried token could not be found'});
            } else{
                callback(500, {'error': 'There was a problem getting the token'});
            }
        };

    } else {
        callback(400, {'error': 'Missing required field'});
    }
};

//Required data: id, extend
//Optional data: none
handlers._tokens.put = async (data,callback) => {
    debug('entered put /tokens');
    let id = typeof(data.payload.id) == 'string' 
        && data.payload.id.trim().length == 20 
        ? data.payload.id.trim() : false;

    let extend = typeof(data.payload.extend) == 'boolean' 
        && data.payload.extend === true 
        ? data.payload.extend : false;
    if(id && extend){
        try{
            let gotToken = await _data.read('tokens', id);
            
            if(gotToken.expires > Date.now()){
                gotToken.expires = Date.now() + 1000 * 60 * 60;
                try{
                    await _data.update('tokens', id, gotToken);
                    callback(200, {'message':'Successfully updated token'});
                } catch (error) {
                    callback(500, {'error': 'Could not update token'});
                }
            }
            else {
                callback(400, {'error': 'The token is expired'});
            }
        } catch(error) {
            callback(400, {'error': 'Could not locate token'});
        };
    } else {
        callback(400, {'error': 'Missing required field'});
    }
};

//Required data: id
handlers._tokens.delete = async (data,callback) => {
    //Deleting a token is equivelant to logging out
    debug('entered delete /tokens');
    let id = typeof(data.queryStringObject.id) == 'string' 
        && data.queryStringObject.id.trim().length == 20 
        ? data.queryStringObject.id.trim() : false;

    if(id){
        try{
            await _data.delete('tokens', id);
            callback(200, {'message' : 'Successfully deleted token'});
        }

        catch(error) {
            if (error.code == 'ENOENT'){
                callback(400, {'error': 'The queried token id could not be found'});
            } else{
                callback(500, {'error': 'There was a problem getting the token'});
            }
        };

    } else {
        callback(400, {'error': 'Missing required field'});
    }
};

// Verify if a given token id is valid for a given user
handlers._tokens.verifyToken = async (id, email) => {
    //Lookup the token
    try{
        let gotToken = await _data.read('tokens', id);
        if(gotToken.email == email && gotToken.expires > Date.now()){
            return true;
        } else {
            return false;
        }
    }
    catch (error){
        //console.log(error);
        return false;
    }
};

handlers._carts = {};

//Required: items: [ {sku, quantity} ]
handlers._carts.post = async (data, callback) => {

    //Validate items array
    let items = typeof(data.payload.items) == 'object'
    && data.payload.items instanceof Array 
    && data.payload.items.length > 0 
    ? data.payload.items : false;
    //console.log(successCodes);

    //Validate each item individually
    if (items){
        let validatedItems = [];
        items.forEach((item) => {

            let validatedSku = typeof(item.sku) == 'string'
                && item.sku.trim().length == 6 
                ? item.sku.trim() : false;
            
            let validatedQuantity = typeof(item.quantity) == 'number'
                && item.quantity % 1 === 0
                ? item.quantity : false;
    
            if (validatedQuantity && validatedSku){
                validatedItems.push({
                    'sku' : validatedSku,
                    'quantity' : validatedQuantity
                });
            }
        });
        //console.log('TOKEN:' , data.headers.token)
        // Get token from headers
        let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
    
        try{
            let gotToken = await _data.read('tokens', token);
            let gotUser = await _data.read('users', gotToken.email);
            if(await handlers._tokens.verifyToken(token, gotToken.email)){
                let cartId = typeof(gotUser.cartId) == 'string'
                    && gotUser.cartId.length == 20
                    ? gotUser.cartId : helpers.randomString(20);

                let cartObject = {
                    'id': cartId,
                    'userEmail': gotToken.email,
                    'items': validatedItems
                };
                //Persist the cart object and the cart id
                try{
                    await _data.create('carts', cartId, cartObject);
                    gotUser.cartId = cartId;
                    await _data.update('users', gotUser.email, gotUser);
                    callback(200, {'message': 'The cart was created successfully', 'id':cartId});
                } catch (error){
                    console.log(error);
                    callback(500, {'error': 'The cart could not be saved'});
                }
            } else {
                callback(403, {'error': 'The request could not be authenticated'});
            }

        } catch (error){
            //console.log(error);
            callback(400, {'error':'The token or user could not be found'});
        }
    } else {
        callback(400, {'error' : 'Missing required inputs or inputs are invalid'});
    }

};

//Required data - id (of cart)
//Optional data - none
handlers._carts.get = async (data, callback) => {
    debug('entered get /carts');
    let id = typeof(data.queryStringObject.id) == 'string' 
        && data.queryStringObject.id.trim().length == 20 
        ? data.queryStringObject.id.trim() : false;

    if(id){
        try{
            let gotCart = await _data.read('carts', id);
            let email = gotCart.userEmail;
            let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
            if(await handlers._tokens.verifyToken(token, email)){
                callback(200, gotCart);
            } else {
                callback(403, {'error': 'The request was not authenticated'});
            }
        } catch (error){
            console.log(error);
            callback(500, {'error' : 'Could not retrieve cart data'});
        }
    } else {
        callback(400, {'error': 'Missing required field'});
    }
};

//Required data - id (of cart)
//Optional data - protocol, url, method, successCodes, timeoutSeconds
handlers._carts.put = async (data, callback) => {
    debug('entered put /carts');

    let id = typeof(data.payload.id) == 'string' 
        && data.payload.id.trim().length == 20 
        ? data.payload.id.trim() : false;
        //console.log(id);

    let validatedItems = [];
    data.payload.items.forEach((item) => {

        let validatedSku = typeof(item.sku) == 'string'
            && item.sku.trim().length == 6 
            ? item.sku.trim() : false;
        
        let validatedQuantity = typeof(item.quantity) == 'number'
            && item.quantity % 1 === 0
            ? item.quantity : false;

        if (validatedQuantity && validatedSku){
            validatedItems.push({
                'sku' : validatedSku,
                'quantity' : validatedQuantity
            });
        }
    });
    

    if (id && validatedItems.length > 0){
        try{
            gotCart = await _data.read('carts', id);
            let email = gotCart.userEmail;
            let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
            if(await handlers._tokens.verifyToken(token, email)){
                gotCart.items = validatedItems != {} ? validatedItems : gotCart.items;
                try{
                    await _data.update('carts', gotCart.id, gotCart);
                    callback(200, {'message':'cart data updated successfully'});
                } catch (error){
                    console.log(error);
                    callback(500, {'error':'There was a problem updating the cart data'});
                }
            } else {
                callback(403, {'error': 'The request was not authenticated'});
            }
        } catch (error){
            if (error.code == 'ENOENT'){
                callback(400, {'error': 'The queried cart id could not be found'});
            } else{
                callback(500, {'error': 'There was a problem reading the cart data'});
            }
        }
    } else {
        callback(400, {'error' : 'Missing required field'});
    }
};

//Required data - id
//Optional data - none
handlers._carts.delete = async (data, callback) => {
    debug('entered delete /carts');

    let id = typeof(data.queryStringObject.id) == 'string' 
        && data.queryStringObject.id.trim().length == 20 
        ? data.queryStringObject.id.trim() : false;
        //console.log(id);

    if(id){
        try{
            gotCart = await _data.read('carts', id);
            let email = gotCart.userEmail;
            let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
            if(await handlers._tokens.verifyToken(token, email)){
                try{
                    let gotUser = await _data.read('users', gotCart.userEmail);
                    gotUser.cart = '';
                    await _data.update('users', gotUser.email, gotUser);
                    await _data.delete('carts', id);
                    callback(200, {'message' : 'Successfully deleted cart'});
                }
                catch(error) {
                    console.log(error);
                    callback(500, {'error': 'There was a problem deleting the cart'});
                };
            } else {
                callback(403, {'error': 'The request was not authenticated'});
            }
        } catch (error){
            if (error.code == 'ENOENT'){
                callback(400, {'error': 'The queried cart id could not be found'});
            } else{
                console.log(error);
                callback(500, {'error': 'There was a problem reading the cart'});
            }
        }
    } else {
        callback(400, {'error': 'Missing required field'});
    }
};

//Required data - id
//Optional data - items
handlers._carts.patch = async (data, callback) => {
    debug('entered patch /carts');

    let id = typeof(data.payload.id) == 'string' 
        && data.payload.id.trim().length == 20 
        ? data.payload.id.trim() : false;
        //console.log(id);

    let validatedItems = [];
    data.payload.items.forEach((item) => {

        let validatedSku = typeof(item.sku) == 'string'
            && item.sku.trim().length == 6 
            ? item.sku.trim() : false;
        
        let validatedQuantity = typeof(item.quantity) == 'number'
            && item.quantity % 1 === 0
            ? item.quantity : false;

        if (validatedQuantity && validatedSku){
            validatedItems.push({
                'sku' : validatedSku,
                'quantity' : validatedQuantity
            });
        }
    });
    

    if (id && validatedItems.length > 0){
        try{
            gotCart = await _data.read('carts', id);
            let email = gotCart.userEmail;
            let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
            if(await handlers._tokens.verifyToken(token, email)){
                validatedItems.forEach((newItem) => {
                    let inserted = false;
                    gotCart.items.forEach((oldItem) => {
                        if(oldItem.sku == newItem.sku){
                            oldItem.quantity = newItem.quantity;
                            inserted = true;
                        }
                    });
                    if(!inserted){
                        gotCart.items.push(newItem);
                    }
                });
                try{
                    await _data.update('carts', gotCart.id, gotCart);
                    callback(200, {'message':'cart data updated successfully'});
                } catch (error){
                    console.log(error);
                    callback(500, {'error':'There was a problem updating the cart data'});
                }
            } else {
                callback(403, {'error': 'The request was not authenticated'});
            }
        } catch (error){
            if (error.code == 'ENOENT'){
                callback(400, {'error': 'The queried cart id could not be found'});
            } else{
                debug(error)
                callback(500, {'error': 'There was a problem reading the cart data'});
            }
        }
    } else {
        callback(400, {'error' : 'Missing required field'});
    }
};

handlers._items = {};

 module.exports = handlers;