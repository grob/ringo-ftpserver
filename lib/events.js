var log = require("ringo/logging").getLogger(module.id);
var fs = require("fs");
var {FtpletResult} = org.apache.ftpserver.ftplet;

/**
 * An event registry/dispatcher for ringo-ftpserver
 * @constructor
 */
var Events = exports.Events = function() {
    var listeners = {};

    Object.defineProperties(this, {
        /**
         * An object containing the listener callbacks registered
         * for known events.
         */
        "listeners": {"value": listeners, "enumerable": true}
    });

    return this;
};

/** @ignore */
Events.prototype.toString = function() {
    return "[Event Dispatcher]";
};

/**
 * A mapping between FTP commands and public event names used in
 * beforeCommand
 * @ignore
 */
Events.BEFORE = {
    "DELE": "beforedelete",
    "STOR": "beforeupload",
    "RETR": "beforedownload",
    "RMD": "beforeremovedir",
    "MKD": "beforemakedir",
    "APPE": "beforeappend",
    "STOU": "beforeuploadunique",
    "RNTO": "beforerename",
    "SITE": "site"
};

/**
 * A mapping between FTP commands and public event names used in
 * afterCommand
 * @ignore
 */
Events.AFTER = {
    "PASS": "login",
    "DELE": "delete",
    "STOR": "upload",
    "RETR": "download",
    "RMD": "removedir",
    "MKD": "makedir",
    "APPE": "append",
    "STOU": "uploadunique",
    "RNTO": "rename"
};

/**
 * Called by the ftplet container
 * @param {org.apache.ftpserver.ftplet.FtpletContext} ftpletContext The Ftplet context
 */
Events.prototype.init = function(ftpletContext) {
    log.info("Initializing event dispatcher");
};

/**
 * Called by the ftplet container
 */
Events.prototype.destroy = function() {
    log.info("Destroying event dispatcher");
};

/**
 * Called when a client connects
 * @param {org.apache.ftpserver.ftplet.FtpSession} ftpSession The FTP session
 */
Events.prototype.onConnect = function(ftpSession) {
    return null;
};

/**
 * Called when a client connects
 * @param {org.apache.ftpserver.ftplet.FtpSession} ftpSession The FTP session
 */
Events.prototype.onDisonnect = function(ftpSession) {
    return null;
};

/**
 * Called by the ftplet container before a command is executed by the server.
 * @param {org.apache.ftpserver.ftplet.FtpSession} ftpSession The FTP session
 * @param {org.apache.ftpserver.ftplet.FtpRequest} ftpRequest The FTP request
 * @returns {org.apache.ftpserver.ftplet.FtpletResult} Either null or one of the FtpletResult values
 */
Events.prototype.beforeCommand = function(ftpSession, ftpRequest) {
    log.debug("Dispatching before command", ftpRequest.getCommand());
    return this.dispatchEvent(Events.BEFORE, ftpSession, ftpRequest);
};

/**
 * Called by the ftplet container after a command has been executed by the server.
 * @param {org.apache.ftpserver.ftplet.FtpSession} ftpSession The FTP session
 * @param {org.apache.ftpserver.ftplet.FtpRequest} ftpRequest The FTP request
 * @returns {org.apache.ftpserver.ftplet.FtpletResult} Either null or one of the FtpletResult values
 */
Events.prototype.afterCommand = function(ftpSession, ftpRequest) {
    log.debug("Dispatching after command", ftpRequest.getCommand());
    return this.dispatchEvent(Events.AFTER, ftpSession, ftpRequest);
};

/**
 * Registers a callback for the given event
 * @param {String} name The event name
 * @param {Function} callback The callback method. The method will receive the
 * session and request object as arguments
 */
Events.prototype.addListener = function(name, callback) {
    name = name.toLowerCase();
    var listeners = this.listeners[name];
    if (listeners == undefined) {
        listeners = this.listeners[name] = [];
    }
    listeners.push(callback);
    log.info("Registered callback for event '" + name + "'");
    return;
};

/**
 * Removes either all callbacks registered for an event, or a single one
 * @param {String} eventName The name of the event
 * @param {Function} callback Optional callback. If specified only this callback
 * will be unregistered from the event.
 */
Events.prototype.removeListener = function(name, callback) {
    name = name.toLowerCase();
    if (callback == undefined) {
        delete this.listeners[name];
    } else {
        this.listeners[name] = this.listeners[name].filter(function(cb) {
            return cb !== callback;
        });
    }
    return;
};

/**
 * Calls all registered callbacks for a given event name
 * @param {String} eventName The name of the event
 * @param {Array} args An array containing the arguments to pass to the callbacks
 * @returns {org.apache.ftpserver.ftplet.FtpletResult} If one of the callbacks
 * returns false, this method returns FtpletResult.SKIP, otherwise it returns
 * FtpletResult.DEFAULT
 */
Events.prototype.callListeners = function(eventName, args) {
    var listeners = this.listeners[eventName];
    if (listeners != undefined && listeners.length > 0) {
        for each (let callback in listeners) {
            if (callback.apply(null, args) === false) {
                return FtpletResult.SKIP;
            }
        }
    }
    return FtpletResult.DEFAULT;
};

/**
 * Dispatches an ftpserver event to the registered callbacks. In addition this
 * method calls registered callbacks for an "all" event before all others.
 * @param {Object} map The mapping between FTP commands and public commands
 * @param {org.apache.ftpserver.ftplet.FtpSession} ftpSession The session
 * @param {org.apache.ftpserver.ftplet.FtpRequest} ftpRequest The FTP request
 * @returns {org.apache.ftpserver.ftplet.FtpletResult} If one of the callbacks
 * returns false, this method returns FtpletResult.SKIP, otherwise it returns
 * FtpletResult.DEFAULT
 */
Events.prototype.dispatchEvent = function(map, ftpSession, ftpRequest) {
    var command = ftpRequest.getCommand().toUpperCase();
    if (this.listeners.hasOwnProperty("all")) {
        var result = this.callListeners("all", [ftpSession, ftpRequest, "all"]);
        if (result !== FtpletResult.DEFAULT) {
            return result;
        }
    }
    if (map.hasOwnProperty(command)) {
        var eventName = map[command];
        log.debug("Dispatching event '" + eventName + "'");
        return this.callListeners(eventName, [ftpSession, ftpRequest, eventName]);
    }
    return FtpletResult.DEFAULT;
};
