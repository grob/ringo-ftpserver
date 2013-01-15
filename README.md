#ringo-ftpserver

## About

*ringo-ftpserver* is a lightweight Javascript wrapper around [Apache FtpServer](http://mina.apache.org/ftpserver/) which allows embedding an FTP server in [RingoJS](http://ringojs.org/) applications with a few lines of code.

## Status

Although Apache FtpServer is a mature piece of software, *ringo-ftpserver* itself should currently **be considered beta**.

## License

[Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0.html)

## Installation

As with all RingoJS packages, unzip the contents of the distribution archive into the `packages` directory inside the RingoJS home directory. Alternatively you can place it anywhere outside and create a symbolic link inside the `packages` directory or use the -m switch while starting ringo and add the path to your desired module-direcotry.
Please also have a look at rp (https://github.com/grob/rp/)

## Standalone Server

*ringo-ftpserver* contains a `main.js` script suitable for starting a standalone FTP server. Assumed that RingoJS' `bin` directory is part of the PATH, simply start it with the following command:

`ringo path/to/ringo-ftpserver/main.js`

Calling the main script without any arguments displays the available configuration options. The only required argument is the path to a JSON file containing the user accounts. *ringo-ftpserver* comes with an example `users.json` file containing a test account (username: test, password: test). **Note** that the home directory of the test user will probably not exist in your setup, so you might want to adapt that.

`ringo path/to/ringo-ftpserver/main.js -p 2100 path/to/ringo-ftpserver/users.json`

## User management

*ringo-ftpserver* uses a custom user manager that reads account data from a provided JSON file that contains an array of objects defining the available FTP accounts. Since the user manager expects account passwords to be salted/hashed, *ringo-ftpserver* contains a command line script for managing user accounts:

`ringo path/to/ringo-ftpserver/users.js`

## Embedding

Using *ringo-ftpserver* in an application is a matter of a few lines of code:

    // require the FtpServer module
    var {FtpServer} = require("ringo-ftpserver");

    // create a listener
    var listener = FtpServer.createListener();
    // create a user manager on top of the JSON file 
    // or javascript object containing the user accounts
    var file = module.resolve("./users.json");
    var usermanager = FtpServer.createUserManager(file);

    // create the server and start it
    var server = new FtpServer(listener, usermanager);
    server.start();

## Listener options

`FtpServer.createListener()` accepts an object passed as argument with the following properties:

* `port`: The port to listen on (defaults to 21)
* `sslConfig`: If using encryption, this property must contain the configuration object
* `useImplictSsl`: If boolean true the server uses implicit SSL encryption, otherwise explicit

## Encryption

To use SSL/TLS encryption with *ringo-ftpserver*, create an SSL configuration as follows:

    var sslConfig = FtpServer.createSslConfig(options);

* `keystore`: The path to the Java keystore file containing the server certificate
* `password`: The password of the keystore (optional)
* `protocol`: The protocol to use for encryption (either `ssl` or `tls`, defaults to the latter)

Pass the configuration object as option to the listener creation function (see above).
