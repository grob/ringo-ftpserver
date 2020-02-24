/**
 * @fileoverview The main ftp server module.
 */

addToClasspath("../jars/mina-core-2.1.3.jar");
addToClasspath("../jars/ftplet-api-1.1.1.jar");
addToClasspath("../jars/ftpserver-core-1.1.1.jar");

const fs = require("fs");
const objects = require("ringo/utils/objects");
const {UserManager} = require("./usermanager");
const {JsonUserManager} = require("./jsonusermanager");
const {FtpServerFactory, DataConnectionConfigurationFactory} = org.apache.ftpserver;
const {ListenerFactory} = org.apache.ftpserver.listener;
const {DefaultIpFilter, IpFilterType} = org.apache.ftpserver.ipfilter;
const {DefaultFtplet} = org.apache.ftpserver.ftplet;
const {LinkedHashMap} = java.util;
const {SslConfigurationFactory} = org.apache.ftpserver.ssl;
const {JavaEventEmitter} = require('ringo/events');

/**
 * Instances of this class represent an FtpServer based on Apache FtpServer
 * (http://mina.apache.org/ftpserver/)
 *
 * You can bind to the following events. The callback will recieve two arguments:
 * `FtpSession` and `FtpRequest`.
 *
 *   * login
 *   * upload
 *   * download
 *   * rename
 *   * delete
 *   * mkdir
 *   * rmdir
 *   * rename
 *
 * @param {org.apache.ftpserver.listener.Listener} listener The listener to use
 * @param {org.apache.ftpserver.ftplet.UserManager} userManager The user manager
 * @returns A newly created FtpServer instance
 * @type FtpServer
 * @constructor
 */
const FtpServer = exports.FtpServer = function(listener, userManager) {

    let server = null;
    const serverFactory = new FtpServerFactory();
    const ftplets = new LinkedHashMap();
    // ringo always registers one ftplet to map methods to events
    let ftpLetEmitter = null;

    Object.defineProperties(this, {
        /**
         * The server factory used to configure server instances
         * @type org.apache.ftpserver.FtpServerFactory
         */
        "factory": {"value": serverFactory, "enumerable": true},
        /**
         * The wrapped server
         * @type org.apache.ftpserver.FtpServer
         */
        "server": {
            "get": function() {
                if (server === null) {
                    serverFactory.addListener("default", listener);
                    serverFactory.setUserManager(userManager);
                    serverFactory.setFtplets(ftplets);
                    server = serverFactory.createServer();
                }
                return server;
            },
            "enumerable": true
        },
        "ftpLetEmitter": {
            "get": function() {
                if (!ftpLetEmitter) {
                    // I don't know why, but i must provide a mapping. Otherwise ringo only
                    // turn calls to beforeCommand and afterCommand into events.
                    ftpLetEmitter = new JavaEventEmitter(DefaultFtplet, {
                       "onLogin": "login",
                       "onUploadEnd": "upload",
                       "onDownloadEnd": "download",
                       "onRenameEnd": "rename",
                       "onDeleteEnd": "delete",
                       "onMkdirEnd": "mkdir",
                       "onRmdirEnd": "rmdir"
                    });
                    this.ftplets.put('_RINGOJS_EVENT_FTPLET', ftpLetEmitter.impl);
                }
                return ftpLetEmitter;
            }
        },
        /**
         * A map containing the Ftplets used by this server
         * @type java.util.LinkedHashMap
         */
        "ftplets": {"value": ftplets, "enumerable": true}
    });

    return this;
};

FtpServer.prototype.addFtplet = function(name, impl) {
   // @@ allow user to provide own ftplets
};

/**
 * Binds the callback to the specified event
 * @param {String} eventName The name of the event
 * @param {Function} callback The callback method
 */
FtpServer.prototype.bind = function(eventName, callback) {
    return this.ftpLetEmitter.addListener(eventName, callback);
};

/**
 * Unbinds either all callbacks registered for an event, or a single one
 * @param {String} eventName The name of the event
 * @param {Function} callback Optional callback. If specified only this callback
 * will be unregistered from the event.
 */
FtpServer.prototype.unbind = function(eventName, callback) {
    return this.ftpLetEmitter.removeListener(eventName, callback);
};

/** @ignore */
FtpServer.prototype.toString = function() {
    return "[FtpServer]";
};

/**
 * Starts the server
 */
FtpServer.prototype.start = function() {
    this.server.start();
};

/**
 * Stops the server
 */
FtpServer.prototype.stop = function() {
    this.server.stop();
};

/**
 * Returns true if this server is stopped
 * @return {Boolean} True if this server is stopped, false otherwise
 */
FtpServer.prototype.isStopped = function() {
    return this.server.isStopped();
};

/**
 * Creates an SSL configuration
 *
 * ### Options
 *
 * - `keystore`: The path to the Java keystore containing the server certificate
 * - `password`: The passphrase of the Java keystore
 * - `protocol`: The encryption protocol to use (either `ssl` or `tls`, defaults to the latter)
 *
 * @param {Object} opts Options
 * @returns {org.apache.ftpserver.ssl.SslConfiguration} The SSL configuration object
 */
FtpServer.createSslConfig = function(opts) {

    const options = objects.merge(opts, {
        "keystore": null,
        "password": null,
        "protocol": "tls"
    });
    if (options.keystore == null || !fs.exists(options.keystore)) {
        throw new Error("Missing keystore");
    }
    const factory = new SslConfigurationFactory();
    factory.setKeystoreFile(new java.io.File(options.keystore));
    if (typeof(options.password) === "string" && options.password.length > 0) {
        factory.setKeystorePassword(options.password);
    }
    factory.setSslProtocol(options.protocol);
    return factory.createSslConfiguration();
};

/**
 * Creates a listener
 *
 * ### Options
 *
 * - `port`: The port to listen on (defaults to 21)
 * - `allow`: a comma, space, tab or LF separated list of IP addresses and/or CIDRs
 * - `sslConfig`: The SSL config to use
 * - `useImplicitSsl`: If boolean false this listener uses explicit SSL encryption (defaults to true)
 *
 * @param opts The options object
 * @returns {org.apache.ftpserver.listener.Listener} The listener
 * @see #createSslConfig
 */
FtpServer.createListener = function(opts) {

    const options = objects.merge(opts, {
        "port": 21,
        "allow": null,
        "sslConfig": null,
        "useImplicitSsl": true
    });

    const factory = new ListenerFactory();
    factory.setPort(options.port);
    if (options.allow) {
        factory.setIpFilter(new DefaultIpFilter(IpFilterType.ALLOW, options.allow));
    }
    if (options.sslConfig !== undefined && options.sslConfig !== null) {
        factory.setSslConfiguration(options.sslConfig);
        factory.setImplicitSsl(options.useImplicitSsl !== false);
    }
    if (opts.passive || opts.active) {
        const dataConfigFactory = new DataConnectionConfigurationFactory();
        if (opts.passive && opts.passive.externalAddress) {
            dataConfigFactory.setPassiveExternalAddress(opts.passive.externalAddress);
        }
        if (opts.active && opts.active.ipCheck) {
            dataConfigFactory.setActiveIpCheck(opts.active.ipCheck);
        }
        const dataConnectionConfiguration = dataConfigFactory.createDataConnectionConfiguration();
        factory.setDataConnectionConfiguration(dataConnectionConfiguration);
    }
    return factory.createListener();
};

/**
 * Creates a new user manager.
 * @param {String|Object} fileOrObj Either the path to the JSON file or
 * an object containing the account data.
 * @returns {org.apache.ftpserver.usermanager.UserManager} The user manager
 */
FtpServer.createUserManager = function(fileOrObj) {
    if (typeof(fileOrObj) === "string") {
        return JsonUserManager.create(fileOrObj);
    } else if (fileOrObj.constructor === Object) {
        return UserManager.create(fileOrObj);
    } else {
        throw new Error("createUserManager requires a file path or object as argument");
    }
};
