# simple-ssh

A wrapper for the [ssh2 client module by Brian White][1] which makes it easier to run a sequence of commands over SSH.

# Requirements

* [node.js][2] -- v0.8.7 or newer

# Install

    npm install simple-ssh

# Examples

* Echoing out a users `PATH`:

```javascript
var SSH = require('simple-ssh');

var ssh = new SSH({
    host: 'localhost',
    user: 'username',
    pass: 'password'
});

ssh.exec('echo $PATH', {
    out: function(stdout) {
        console.log(stdout);
    }
}).start();

/*** Using the `args` options instead ***/
ssh.exec('echo', {
    args: ['$PATH'],
    out: function(stdout) {
        console.log(stdout);
    }
}).start();
```

* Connecting with the active SSH Agent with Agent Forwarding

```javascript
var ssh = new ssh({
    host: 'localhost',
    user: 'username',
    agent: process.env.SSH_AUTH_SOCK,
    agentForward: true
})
```

* Capturing error output:

```javascript
ssh.exec('this-does-not-exist', {
    err: function(stderr) {
        console.log(stderr); // this-does-not-exist: command not found
    }
}).start();
```

* Capturing error codes:

```javascript
ssh.exec('exit 69', {
    exit: function(code) {
        console.log(code); // 69
    }
}).start();
```

* Sending data to stdin:

```javascript
ssh.exec('cat > /path/to/remote/file', {
   in: fs.readFileSync('/path/to/local/file')
}).start();
```

* Chaining commands together:

```javascript
ssh
    .exec('echo "Node.js"', {
        out: console.log.bind(console)
    })
    .exec('echo "is"', {
        out: console.log.bind(console)
    })
    .exec('echo "awesome!"', {
        out: console.log.bind(console)
    })
    .start();

// Output:
// Node.js
// is
// awesome!
```

* Get the number of commands:

```javascript
ssh
    .exec('exit 1')
    .exec('exit 2')
    .exec('exit 3');

console.log(ssh.count()); // 3
```

* Running a command using `sudo`

```javascript
ssh.exec('sudo echo "Pseudo-sudo"', {
    pty: true,
    out: console.log.bind(console)
}).start();
```

* Resetting a connection and the commands

```javascript
// Echos out any messages the user sent in if 10 or more have been queued
var msgInterval = setInterval(function() {
    if (ssh.count() > 10) {
        ssh.start();
    }
}, 1000);

socket.on('message', function(msg) {
    // If a 'reset' message is received, clear previous messages
    if (msg === 'reset') {
        ssh.reset(function(err) {
            if (err) {
                throw err;
            }

            ssh.exec('echo "reset"');
        });
    } else {
        ssh.exec('echo "' + msg + '"');
    }
});
```

* Listening for additional events

```javascript
ssh.on('error', function(err) {
    console.log('Oops, something went wrong.');
    console.log(err);
    ssh.end();
});
```

* Event handlers can be chained as well

```javascript
ssh
    .on('error', onSSHError)
    .on('ready', onSSHReady);
```

----------

# API

### Functions

* **Constructor**( [ _config_ ] )
    * **config** { _Object_ }:
        * **config.host** {  _String_ }: Hostname
        * **config.port** { _Number_ }: Port number (default: `22`)
        * **config.user** { _String_ }: Username
        * **config.pass** { _String_ }: Password
        * **config.timeout** { _Number_ }: Connection timeout in milliseconds (default: `10000`)
        * **config.key** { _String_ }: SSH key
        * **config.passphrase** { _String_ }: Passphrase
        * **config.baseDir** { _String_ }: Base directory. If this is set, each command will be preceeded by `cd ${this.baseDir}`
        * **config.agent** { _String_ }: Connects with the given SSH agent. If this is set, no need to specify a private key or password.
        * **config.agentForward** { _Boolean_ }: Set to true to connect with agent forwarding.
* **exec**( _command_, [ _options_ ] ): **Adds a command to the stack**
    * **command** { _String_ }: Command to be executed
    * **options** { _Object_ }:
        * **options.args** { _String[]_ }: Additional command line arguments (default: `null`)
        * **options.in** { _String_ }: Input to be sent to `stdin`
        * **options.out** { _Function( stdout )_ }: `stdout` handler
            * **stdout** { _String_ }: Output streamed through `stdout`
        * **options.err** { _Function( stderr )_ }: `stderr` handler
            * **stderr** { _String_ }: Output streamed through `stderr`
        * **options.exit** { _Function( code, stdout, stderr )_ }: Exit handler
            * **code** { _Number_ }: Exit code
            * **stdout** { _String_ }: All of the standard output concatenated together
            * **stderr** { _String_ }: All of the error output concatenated together
        * **options.pty** { _Boolean_ }: Allocates a pseudo-tty, useful for command which require `sudo` (default: `false`)
* **on**( _event_, _callback_ ): **Add a listener for the specified event** (Courtesy of [@alexjab][3])
    * **event** { _String_ }: Event to listen to
    * **callback** { _Function_ }: Executed on the event
* **start**( [ _options_ ] ): **Starts executing the commands**
    * **options** { _Object_ }:
        * **options.success** { _Function()_ }: Called on successful connection
        * **options.fail** { _Function( err )_ }: Called if the connection failed
            * **err** { _Error_ }: Error information
* **reset**( [ _callback_ ] ): **Clears the command queue and resets the current connection**
    * **callback** { _Function( err )_ }: Called when the connection has been successfully reset
        * **err** { _Error_ }: Error information
* **end**(): **Ends the SSH session** (this is automatically called at the end of a command queue).

### Properties

* **host** { _String_ }: Host to connect to
* **port** { _Number_ }: Port to connect through (default: `22`)
* **user** { _String_ }: User name
* **pass** { _String_ }: Password
* **timeout** { _Number_ }: Connection timeout in milliseconds (default: `10000`)
* **key** { _String_ }: SSH key
* **baseDir** { _String_ }: If set, will change directory to `baseDir` before each command

### Flow Control

Sometimes you may find yourself needing to change which commands are executed. The flow can be changed by returning `false` from an `exit` handler.

**Note**: This only works if `false` is explicitly returned. "Falsy" values are not sufficient (since `undefined` is implicitly returned and it's "falsy").

* Ending prematurely:

```javascript
ssh
    .exec('pwd', {
        exit: function() {
            return false;
        }
    })
    .exec('echo "Not executed"')
    .start();
```

* Running a new queue of commands:

```javascript
ssh
    .exec('exit', {
        args: [ Math.round(Math.random()) ],
        exit: function(code) {
            if (code === 1) {
                // Setup the new command queue
                ssh.exec('echo "new queue"');
                return false;
            }
        }
    })
    .exec('exit 0', {
        exit: function() {
            console.log('Previous command did not return false');
        }
    })
    .start();
```

  [1]: https://github.com/mscdex/ssh2
  [2]: http://nodejs.org
  [3]: https://github.com/alexjab
