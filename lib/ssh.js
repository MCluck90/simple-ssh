'use strict';

var Connection = require('ssh2'),
    extend = require('xtend');

/**
 * Creates a new SSH connection
 * @param {Object}  config
 * @param {String}  config.host        - Host to connect to
 * @param {Number} [config.port=22]    - Port number
 * @param {String}  config.user        - Username
 * @param {String}  config.pass        - Password
 * @param {String} [config.baseDir=''] - Base directory to perform commands from
 * @constructor
 */
var SSH = function(config) {
    config = extend({
        host: '',
        port: 22,
        user: '',
        pass: '',
        baseDir: ''
    }, config);

    this._c = new Connection();
    this._commands = [];

    this.host = config.host;
    this.port = config.port;
    this.user = config.user;
    this.pass = config.pass;
    this.baseDir = config.baseDir;
};

/**
 * Helper function for queueing up the next command in the chain
 * @param {Number} index - Array index of the command to perform next
 * @private
 */
SSH.prototype._queueCommand = function(index) {
    if (this._commands.length <= index) {
        return;
    }

    var self = this,
        command = this._commands[index],
        cmd = command.cmd;

    // Start by going to the base directory, if set
    if (this.baseDir.length > 0) {
        cmd = 'cd ' + this.baseDir + ' && ' + cmd;
    }

    // Execute the command
    this._c.exec(cmd, { pty: command.pty }, function(err, stream) {
        if (err) {
            command.handlers.err(err);
            return;
        }

        var passwordSent = false,
            buffer = '',
            stdout = '',
            stderr = '';

        stream.on('data', function(data, extended) {
            // This will allow us to send in the password if we're doing something like `sudo`
            buffer += (!passwordSent) ? data.toString() : '';

            if (!passwordSent && buffer.substr(-2) === ': ') {
                stream.write(self.pass + '\n');
                buffer = '';
                passwordSent = true;
            } else {
                data = data.toString();
                if (extended === 'stderr') {
                    stderr += data;

                    command.handlers.err = command.handlers.err || function() {
                        console.log(data);
                    };

                    command.handlers.err(data);
                } else {
                    stdout += data;
                    command.handlers.out(data);
                }
            }
        });

        stream.on('exit', function(code) {
            var numOfCommands = self._commands.length,
                executeNext = (command.handlers.exit(+code, stdout, stderr) !== false);

            // Queue up the next command
            if (executeNext && index < self._commands.length - 1) {
                self._queueCommand(index + 1);
            } else if (!executeNext) {
                // If the commands have been modified during the last exit, use those
                if (numOfCommands !== self._commands.length) {
                    self._commands.splice(0, numOfCommands);
                    self._queueCommand(0);
                } else {
                    self._c.end();
                }
            } else if (index === self._commands.length - 1) {
                self._c.end();
            }
        });
    });
};

/**
 * Queues up a command for execution
 * @param {String}            command            - Command to execute
 * @param {Object}            options
 * @param {String[]}         [options.args]      - Additional command line arguments
 * @param {Function(String)} [options.out]       - Called to capture stdout
 * @param {Function(String)} [options.err]       - Called to capture stderr
 * @param {Function(Number)} [options.exit]      - Called when the command exits
 * @param {Boolean}          [options.pty=false] - If true, allocates a pseudo-tty (useful for sudo)
 * @return {SSH}
 */
SSH.prototype.exec = function(command, options) {
    options = extend({
        args: null,
        out:  function(){},
        err:  function(){},
        exit: function(){},
        pty:  false
    }, options);

    // Apply additional command line arguments
    if (options.args !== null) {
        for (var i = 0, len = options.args.length; i < len; i++) {
            command += ' ' + options.args[i];
        }
    }

    this._commands.push({
        cmd: command,
        handlers: {
            out:  options.out,
            err:  options.err,
            exit: options.exit
        },
        pty: options.pty
    });

    return this;
};

/**
 * Starts executing the queued up commands
 * @param {Object}          [options]
 * @param {Function}        [options.success] - Executed once connected
 * @param {Function(Error)} [options.fail]    - Executed if we fail to connect
 */
SSH.prototype.start = function(options) {
    options = extend({
        success: function(){},
        fail: function(){}
    }, options);
    var self = this;

    self._c.on('error', options.fail);

    self._c.on('ready', function() {
        self._c.removeListener('error', options.fail);
        options.success();

        if (self._commands.length > 0) {
            self._queueCommand(0);
        } else {
            self._c.end();
        }
    });

    self._c.connect({
        host: self.host,
        port: self.port || 22,
        username: self.user,
        password: self.pass
    });
};

/**
 * Resets the connection and commands
 */
SSH.prototype.restart = function() {
    if (this._c._sock !== undefined) {
        this._c.end();
    }

    this._c = new Connection();
    this._commands = [];
};

/**
 * Ends the SSH connection
 */
SSH.prototype.end = function() {
    this._c.end();
};

module.exports = SSH;