addToClasspath("../jars/ftplet-api-1.0.6.jar");
addToClasspath("../jars/ftpserver-core-1.0.6.jar");

var fs = require("fs");
var {AuthenticationFailedException} = org.apache.ftpserver.ftplet;
var {Md5PasswordEncryptor, SaltedPasswordEncryptor, ClearTextPasswordEncryptor} =
        org.apache.ftpserver.usermanager;
var {BaseUser, WritePermission, ConcurrentLoginPermission,
        TransferRatePermission} = org.apache.ftpserver.usermanager.impl;
var {UsernamePasswordAuthentication, AnonymousAuthentication} =
        org.apache.ftpserver.usermanager;
var {IllegalArgumentException} = java.lang;
var {ArrayList} = java.util;

exports.encryptPassword = function(password) {
    var encryptor = new SaltedPasswordEncryptor();
    return encryptor.encrypt(password);
};

var JsonUserManager = exports.JsonUserManager = function(file) {

    var encryptor = new SaltedPasswordEncryptor();
    var adminName = "admin";
    var users = {};

    Object.defineProperties(this, {

        /**
         * The JSON file containing the user accounts
         * @type String
         */
        "file": {"value": file, "enumerable": true},

        /**
         * An object containing the user accounts
         * @type Object
         */
        "users": {
            "get": function() {
                return users;
            }, "enumerable": true},

        /**
         * The encryptor used by this user manager
         * @type org.apache.ftpserver.usermanager.SaltedPasswordEncryptor
         */
        "encryptor": {"value": encryptor, "enumerable": true},

        /**
         * Returns the name of the admin account (default: admin)
         * @type String
         */
        "getAdminName": {
            "value": function() {
                return adminName;
            },
            "enumerable": true},

        /**
         * Sets the admin name to the one passed as argument
         * @param {String} name The name of the admin account
         */
        "setAdminName": {
            "value": function(name) {
                adminName = name;
                return;
            },
            "enumerable": true},

        /**
         * Loads the users from the JSON file
         */
        "loadUsers": {
            "value": function() {
                if (fs.exists(file)) {
                    users = JSON.parse(fs.read(file));
                }
            },
            "enumerable": true
        },

        /**
         * Saves the users as JSON string into the file this manager operates on
         */
        "saveUsers": {
            "value": function() {
                fs.write(file, JSON.stringify(users, null, 4));
            },
            "enumerable": true
        }
    });

    // load the users from file
    this.loadUsers();
    return this;
};

JsonUserManager.prototype.authenticate = function(authentication) {
    if (authentication instanceof UsernamePasswordAuthentication) {
        var username = authentication.getUsername();
        var password = authentication.getPassword() || "";
        if (username == null || !this.doesExist(username)) {
            throw new AuthenticationFailedException("Authentication failed");
        }
        var user = this.getUserByName(username);
        if (this.encryptor.matches(password, user.getPassword())) {
            return user;
        } else {
            throw new AuthenticationFailedException("Authentication failed");
        }
    } else if (authentication instanceof AnonymousAuthentication) {
        if (this.doesExist("anonymous")) {
            return this.getUserByName("anonymous");
        } else {
            throw new AuthenticationFailedException("Authentication failed");
        }
    } else {
        throw new IllegalArgumentException("Authentication not supported by this user manager");
    }
};

JsonUserManager.prototype["delete"] = function(username) {
    if (this.doesExist(username)) {
        delete this.users[username];
        this.saveUsers();
    }
};

JsonUserManager.prototype.doesExist = function(username) {
    return this.users.hasOwnProperty(username);
};

JsonUserManager.prototype.getAllUserNames = function() {
    return Object.keys(this.users);
};

JsonUserManager.prototype.getUserByName = function(username) {
    if (!this.doesExist(username)) {
        return null;
    }
    var props = this.users[username];
    var user = new BaseUser();
    user.setName(props.name);
    user.setPassword(props.password);
    user.setHomeDirectory(props.homeDirectory);
    user.setEnabled(props.isEnabled === true);
    var authorities = new ArrayList();
    if (props.canWrite !== false) {
        authorities.add(new WritePermission());
    }
    authorities.add(new ConcurrentLoginPermission(props.maxLogin || 0,
            props.maxLoginPerIp || 0));
    authorities.add(new TransferRatePermission(props.downloadRate || 0,
            props.uploadRate || 0));
    user.setAuthorities(authorities);
    user.setMaxIdleTime(props.maxIdleTime || 0);
    return user;
};

JsonUserManager.prototype.isAdmin = function(username) {
    return username === this.getAdminName();
};

JsonUserManager.prototype.save = function(user) {
    var name = user.getName();
    if (name == null) {
        throw new Error("User name is null");
    }
    this.users[name] = user;
    this.saveUsers();
};
