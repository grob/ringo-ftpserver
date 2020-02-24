const {FtpServer} = require("./lib/ftpserver");
const {Parser} = require("ringo/args");
const term = require("ringo/term");

const parser = new Parser();
parser.addOption("p", "port", "port", "The port to listen (defaults to 2100)");
parser.addOption(null, "keystore", "keystore", "The path to the SSL keystore");
parser.addOption(null, "password", "password", "The SSL keystore passphrase");
parser.addOption(null, "protocol", "protocol", "The encryption protocol (ssl/tls)");
parser.addOption(null, "explicitSsl", null, "Use explicit SSL encryption");


const help = function() {
    term.writeln("Usage:");
    term.writeln("\n   ringo main.js [options] path/to/users.json\n");
    term.writeln("Available options:");
    term.writeln(parser.help());
    term.writeln();
};

const start = function(args) {
    if (args.length < 1) {
        return help();
    }
    const opts = {};
    try {
        parser.parse(args, opts);
    } catch (e) {
        term.writeln(term.RED, e.message, term.RESET);
        return help();
    }
    const usersFile = args.pop();
    if (!usersFile) {
        term.writeln(term.RED,
                "Please specify the JSON file containing the ftp accounts",
                term.RESET);
        return help();
    }
    let sslConfig = null;
    if (opts.keystore) {
        sslConfig = FtpServer.createSslConfig({
            "keystore": opts.keystore,
            "password": opts.password,
            "protocol": opts.protocol || "tls"
        });
    }
    const listener = FtpServer.createListener({
        "port": opts.port || 2100,
        "sslConfig": sslConfig,
        "useImplicitSsl": opts.explicitSsl !== true
    });
    const userManager = FtpServer.createUserManager(usersFile);
    userManager.on("reloaded", function(e) { print(">>>>>>>>>>>>>>>>>>>>>>>>>>>>> reloaded users <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<")});
    const server = new FtpServer(listener, userManager);
    server.start();
};

if (require.main == module.id) {
    start(require('system').args.slice(1));
}