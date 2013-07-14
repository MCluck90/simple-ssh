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

* Chaining commands together:

```javascript
ssh
    .exec('echo "Node.js", {
        out: console.log
    })
    .exec('echo "is"', {
        out: console.log
    })
    .exec('echo "awesome!"', {
        out: console.log
    })
    .start();

// Output:
// Node.js
// is
// awesome!
```

* Running a command using `sudo`

```javascript
ssh.exec('sudo echo "Pseudo-sudo"', {
    pty: true,
    out: console.log
}).start();
```

----------

# API

### Functions

* **Constructor**( [_config_] )
    * **config** { _Object_ }:
        * **config.host** {  _String_ }: Hostname
        * **config.port** { _Number_ }: Port number (default: `22`)
        * **config.user** { _String_ }: Username
        * **config.pass** { _String_ }: Password
* **exec**( _command_, [_options_] ): **Adds a command to the stack**
    * **command** { _String_ }: Command to be executed
    * **options** { _Object_ }:
        * **options.args** { _String[]_ }: Additional command line arguments (default: `null`)
        * **options.out** { _Function( stdout )_ }: `stdout` handler
            * **stdout** { _String_ }: Output streamed through `stdout`
        * **options.err** { _Function( stderr )_ }: `stderr` handler
            * **stderr** { _String_ }: Output stream through `stderr`
        * **options.exit** { _Function( code )_ }: Exit handler
            * **code** { _Number_ }: Exit code
        * **options.pty** { _Boolean_ }: Allocates a pseudo-tty, useful for command which require `sudo` (default: `false`)
* **start**( [_options_] ): **Starts executing the commands**
    * **options** { _Object_ }:
        * **options.success** { _Function()_ }: Called on successful connection
        * **options.fail** { _Function(err)_ }: Called if the connection failed
            * **err** { _Error_ }: Error information
* **end**() ** Ends the SSH session**


  [1]: https://github.com/mscdex/ssh2
  [2]: http://nodejs.org