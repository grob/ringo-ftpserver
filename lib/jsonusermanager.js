/**
 * @fileoverview This module provides a constructor for an ftp server
 * user manager operating on top of a JSON file containing user accounts.
 */

addToClasspath("../jars/ftplet-api-1.1.1.jar");
addToClasspath("../jars/ftpserver-core-1.1.1.jar");

const fs = require("fs");
const {UserManager} = require("./usermanager");
const {EventEmitter} = require("ringo/events");

const FtpletUserManager = org.apache.ftpserver.ftplet.UserManager;

/**
 * Returns a new JsonUserManager instance
 * @class Instances of this class represent a usermanager operating on
 * a JSON file containing the accounts.
 * @param {String} file The path to the JSON file to read the account data from
 * @returns {UserManager} A newly constructed user manager
 * @constructor
 */
const JsonUserManager = exports.JsonUserManager = function(file) {

    EventEmitter.call(this);
    let adminName = "admin";
    let users = {};
    let lastModified = null;

    Object.defineProperties(this, {

        /**
         * The JSON file containing the user accounts
         * @type String
         */
        "file": {
            "value": file,
            "enumerable": true
        },

        /**
         * An object containing the user accounts
         * @type Object
         */
        "users": {
            "get": function() {
                return users || {};
            },
            "enumerable": true
        },

        /**
         * Returns the name of the admin account (default: admin)
         * @returns {String} The name of the admin account
         */
        "getAdminName": {
            "value": function() {
                return adminName;
            },
            "enumerable": true
        },

        /**
         * Sets the admin name to the one passed as argument
         * @param {String} name The name of the admin account
         */
        "setAdminName": {
            "value": function(name) {
                adminName = name;
            },
            "enumerable": true
        },

        /**
         * Loads the users from the JSON file. This method triggers a "reloaded"
         * event on this usermanager instance.
         * @param {String} jsonFile Optional path to the JSON file to load. If given
         * this file is used for all other file-related operations.
         */
        "loadUsers": {
            "value": function(/* [jsonFile] */) {
                if (arguments.length === 1 && typeof(arguments[0]) === "string") {
                    file = arguments[0];
                }
                if (fs.exists(file) && fs.isFile(file)) {
                    users = JSON.parse(fs.read(file));
                    lastModified = fs.lastModified(file).getTime();
                } else {
                    throw new Error('File does not exist or is not a file: "' + file + '"');
                }
                this.emit("reloaded");
            },
            "enumerable": true
        },

        /**
         * Saves the users as JSON string into the file this manager operates on
         */
        "saveUsers": {
            "value": function() {
                fs.write(file, JSON.stringify(users, null, 4));
                lastModified = fs.lastModified(file).getTime();
            },
            "enumerable": true
        },

        /**
         * Checks if the user file has been modified and reloads if necessary
         */
        "checkFile": {
            "value": function() {
                if (lastModified !== fs.lastModified(file).getTime()) {
                    this.loadUsers();
                }
            },
            "enumerable": false
        }
    });

    // load the users from file
    this.loadUsers();

    return this;
};

// extend UserManager
/** @ignore */
JsonUserManager.prototype = Object.create(UserManager.prototype);
JsonUserManager.prototype.constructor = JsonUserManager;

/**
 * Convenience method for creating a JsonUserManager instance suitable for
 * use with ftpserver module.
 * @param {String} file The path to the JSON file to read the account data from
 * @returns {org.apache.ftpserver.ftplet.UserManager} The user manager instance
 */
JsonUserManager.create = function(file) {
    return new FtpletUserManager(new JsonUserManager(file));
};

/**
 * Authenticates against the user accounts of this manager
 * @param {UsernamePasswordAuthentication|AnonymousAuthentication} authentication The
 * authentication request to verify.
 * @returns {BaseUser} If authentication was successful, this method returns the
 * user object, otherwise it throws an AuthenticationFailedException
 */
JsonUserManager.prototype.authenticate = function(authentication) {
    this.checkFile();
    return UserManager.prototype.authenticate.apply(this, arguments);
};

/**
 * Removes the user with the given name from the underlying users object
 * @param {String} username The name of the user to remove
 */
JsonUserManager.prototype["delete"] = function(username) {
    this.checkFile();
    UserManager.prototype["delete"].apply(this, arguments);
    this.saveUsers();
};

/**
 * Returns true if this manager has a user with the given username
 * @param {String} username The username to check if existing
 * @returns {Boolean} True if the user exists, false otherwise
 */
JsonUserManager.prototype.doesExist = function(username) {
    this.checkFile();
    return this.users.hasOwnProperty(username);
};

/**
 * Returns an array containing all user names known to this manager
 * @returns {Array} An array containing all user names
 */
JsonUserManager.prototype.getAllUserNames = function() {
    this.checkFile();
    return Object.keys(this.users);
};

/**
 * Returns the user with the given name
 * @param {String} username The user name
 * @returns {User} The user object, or null if the user doesn't exist
 */
JsonUserManager.prototype.getUserByName = function(username) {
    this.checkFile();
    return UserManager.prototype.getUserByName.apply(this, arguments);
};

/**
 * Returns true if the user name passed as argument equals the admin account name.
 * @param {String} username The user name
 * @returns {Boolean} True if the user name equals the admin name, false otherwise
 */
JsonUserManager.prototype.isAdmin = function(username) {
    return UserManager.prototype.isAdmin.apply(this, arguments);
};

/**
 * Adds the user to the list of accounts, possibly replacing an already
 * existing account with the same name.
 * @param {Object} user The user account data
 */
JsonUserManager.prototype.save = function(user) {
    this.checkFile();
    UserManager.prototype.save.apply(this, arguments);
    this.saveUsers();
};
