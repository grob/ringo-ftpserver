var {Parser} = require("ringo/args");
var shell = require("ringo/shell");
var term = require("ringo/term");
var fs = require("fs");
var objects = require("ringo/utils/objects");
var {encryptPassword} = require("./lib/usermanager");

var parser = new Parser();
parser.addOption("f", "file", "file", "The JSON file containing the accounts");

var help = function() {
    term.writeln("Usage:");
    term.writeln("\n   ringo users.js -f path/to/users.json <command> <username> \n");
    term.writeln("Available options:");
    term.writeln(parser.help());
    term.writeln("Available commands:");
    term.writeln("   add / edit / remove / enable / disable / list / password");
    term.writeln();
};

var main = function(args) {
    var opts = {};
    try {
        parser.parse(args, opts);
    } catch (e) {
        term.writeln(term.RED, e.message, term.RESET);
        help();
        return;
    }
    if (!opts.file) {
        term.writeln(term.RED, "\nPlease specify the file containing the ftp accounts\n", term.RESET);
        help();
        return;
    }
    var users = {};
    if (fs.exists(opts.file)) {
        try {
            users = JSON.parse(fs.read(opts.file));
        } catch (e) {
            term.writeln(opts.file, "is empty or invalid, initializing new account list");
        }
    }
    var command = args.shift();
    if (!command || command === "list") {
        list(users);
    } else if (["add", "edit", "remove", "enable", "disable", "password"].indexOf(command) > -1) {
        var username = args.shift();
        if (!username) {
            term.writeln(term.RED, "Please specify the username", term.RESET);
        } else if (this[command](users, username) === true) {
            save(users, opts.file);
        }
    } else {
        term.writeln(term.RED, "Unknown command", command, term.RESET);
        help();
    }
};

var save = function(users, file) {
    fs.write(file, JSON.stringify(users, null, 4));
    term.writeln(term.GREEN, "Saved user accounts in", file, term.RESET);
};

var getAccountData = function() {
    var homeDirectory, canWrite, maxLogin, maxLoginPerIp, downloadRate,
            uploadRate, maxIdleTime;
    while (!homeDirectory) {
        homeDirectory = shell.readln("Home directory: ").trim();
        if (!fs.exists(homeDirectory)) {
            term.writeln(term.BOLD, "\nHome directory doesn't exist, please try again.\n", term.RESET);
            homeDirectory = null;
        }
    }
    canWrite = shell.readln("Write permission (Y/n): ").toLowerCase() != "n";
    maxLogin = parseInt(shell.readln("Max. concurrent logins (0 for no restriction): "), 10) || 0;
    maxLoginPerIp = parseInt(shell.readln("Max. concurrent logins per IP address (0 for no restriction): "), 10) || 0;
    downloadRate = parseInt(shell.readln("Max. download rate (0 = unlimited): "), 10) || 0;
    uploadRate = parseInt(shell.readln("Max. upload rate (0 = unlimited): "), 10) || 0;
    maxIdleTime = parseInt(shell.readln("Max. idle time (in seconds, 0 = unlimited): "), 10) || 0;
    return {
        "homeDirectory": homeDirectory,
        "canWrite": canWrite,
        "maxLogin": maxLogin,
        "maxLoginPerIp": maxLoginPerIp,
        "downloadRate": downloadRate,
        "uploadRate": uploadRate,
        "maxIdleTime": maxIdleTime
    };
};

var getPassword = function() {
    var password, passwordConfirm;
    while (!password || (password !== passwordConfirm)) {
        password = shell.readln("Password: ", "*").trim();
        passwordConfirm = shell.readln("Confirm password: ", "*").trim();
        if (password !== passwordConfirm) {
            term.writeln(term.BOLD, "\nPasswords do not match, please try again.\n", term.RESET);
        }
    }
    return encryptPassword(password);
};

var add = function(users, username) {
    if (users.hasOwnProperty(username)) {
        term.writeln(term.RED, "User", username, "already exists", term.RESET);
        return false;
    }
    users[username] = objects.merge({
        "name": username,
        "password": getPassword(),
        "isEnabled": true
    }, getAccountData());
    term.writeln(term.GREEN, "Added user", username, term.RESET);
    return true;
};

var edit = function(users, username) {
    if (!users.hasOwnProperty(username)) {
        term.writeln(term.RED, "User", username, "doesn't exist", term.RESET);
        return false;
    }
    users[username] = objects.merge(getAccountData(), users[username]);
    term.writeln(term.GREEN, "Changed user", username, term.RESET);
    return true;
};

var list = function(users) {
    term.writeln(term.BOLD, "\nAvailable FTP accounts\n", term.RESET)
    for each (let props in users) {
        term.write("   ");
        if (props.isEnabled === false) {
            term.writeln("[disabled]");
        }
        term.writeln(props.name, "(" + props.homeDirectory + ")");
    }
    term.writeln();
    return true;
};

var remove = function(users, username) {
    if (!users.hasOwnProperty(username)) {
        term.writeln(term.RED, "User", username, "doesn't exist");
        return false;
    }
    delete users[username];
    term.writeln(term.GREEN, "Removed user", username, term.RESET);
    return true;
};

var enable = function(users, username) {
    if (!users.hasOwnProperty(username)) {
        term.writeln(term.RED, "User", username, "doesn't exist");
        return false;
    }
    users[username].isEnabled = true;
    term.writeln(term.GREEN, "Enabled user", username, term.RESET);
    return true;
};

var disable = function(users, username) {
    if (!users.hasOwnProperty(username)) {
        term.writeln(term.RED, "User", username, "doesn't exist");
        return false;
    }
    users[username].isEnabled = false;
    term.writeln(term.GREEN, "Disabled user", username, term.RESET);
    return true;
};

var password = function(users, username) {
    if (!users.hasOwnProperty(username)) {
        term.writeln(term.RED, "User", username, "doesn't exist");
        return false;
    }
    users[username].password = getPassword();
    term.writeln(term.GREEN, "Changed password of user", username, term.RESET);
    return true;
};

if (require.main == module.id) {
    main(require('system').args.splice(1));
}