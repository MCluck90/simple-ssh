'use strict';

var SSH = require('../lib/ssh.js'),
    expect = require('expect.js'),
    fs = require('fs'),

    config = require('../config/ssh.json'),
    ssh;

describe('SSH', function() {
    if (config.key) {
        config.key = fs.readFileSync(config.key);
    }

    beforeEach(function() {
        ssh = new SSH(config);
    });

    describe('start', function() {
        it('should connect when given valid connection information', function(done) {
            ssh.start({
                success: done,
                fail: function(err) {
                    expect().to.fail(err);
                }
            });
        });

        it('should fail to connect when given invalid information', function(done) {
            ssh.host = 'This is not a valid hostname';
            ssh.start({
                success: function() {
                    expect().to.fail('Should not be able to connect with invalid information');
                },
                fail: function() {
                    done();
                }
            });
        });
    });

    describe('end', function() {
        it('should end the current connection', function(done) {
            ssh._c.on('close', function() {
                done();
            });

            ssh.start({
                success: function() {
                    ssh.end();
                }
            });
        });
    });

    describe('exec', function() {
        it('should queue up a command', function() {
            ssh.exec('command');
            expect(ssh._commands).to.have.length(1);
        });

        it('should append `args` as command line arguments', function() {
            ssh.exec('cmd', {
                args: ['a', 'b', 'c']
            });

            var command = ssh._commands[0].cmd;
            expect(command).to.be('cmd a b c');
        });

        it('should capture stdout', function(done) {
            var output = 'Johnny Grey';
            ssh.exec('echo', {
                args: ['"' + output + '"'],
                out: function(stdout) {
                    expect(stdout.trim()).to.be(output);
                    done();
                }
            }).start();
        });

        it('should capture stderr', function(done) {
            var output = 'Icarus';
            ssh.exec('echo', {
                args: ['"' + output + '"', '1>&2'],
                err: function(stderr) {
                    expect(stderr.trim()).to.be(output);
                    done();
                }
            }).start();
        });

        it('should capture the exit code', function(done) {
            var exitCode = Math.round(Math.random() * 200);
            ssh.exec('exit', {
                args: [exitCode],
                exit: function(code) {
                    expect(code).to.be(exitCode);
                    done();
                }
            }).start();
        });
        
        it('should provide data on stdin', function(done) {
            var input = 'The quick brown fox\njumps over the lazy dog.\n';
            ssh.exec('cat', {
                in: input,
                out: function(stdout) {
                    expect(stdout).to.be(input);
                    done();
                }
            }).start();
        });

        it('should handle multiple commands', function(done) {
            ssh
                .exec('echo')
                .exec('echo')
                .exec('echo', {
                    exit: function() {
                        done();
                    }
                })
                .start();
        });

        it('should allow setting the base directory', function(done) {
            ssh.baseDir = '/';
            ssh
                .exec('pwd', {
                    out: function(data) {
                        expect(data.trim()).to.be('/');

                        ssh.baseDir = '/home';
                    }
                })
                .exec('pwd', {
                    out: function(data) {
                        expect(data.trim()).to.be('/home');
                        done();
                    }
                })
                .start();
        });

        it('should handle `sudo` property when pty is set', function(done) {
            var input = 'Excision',
                output = '';
            ssh.exec('sudo echo', {
                pty: true,
                args: ['"' + input + '"'],
                out: function(data) {
                    data = data.trim();
                    output += data;
                },
                exit: function(code) {
                    expect(output).to.be(input);
                    expect(code).to.be(0);
                    done();
                }
            }).start();
        });

        it('should ignore upcoming commands when `exit` returns false', function(done) {
            ssh
                .exec('exit 0', {
                    exit: function() {
                        done();
                        return false;
                    }
                })
                .exec('exit 1', {
                    exit: function() {
                        expect().to.fail('Expected upcoming commands to be ignored');
                    }
                })
                .start();
        });

        it('should use a new queue of commands when `exit` returns false', function(done) {
            ssh
                .exec('exit 0', {
                    exit: function() {
                        ssh.exec('exit 0', {
                            exit: function() {
                                done();
                            }
                        });

                        return false;
                    }
                })
                .exec('exit 1', {
                    exit: function() {
                        expect().to.fail('Command from previous queue should be removed');
                    }
                })
                .start();
        });

        it('should append a new queue if `exit` does not return false', function(done) {
            var callCount = 0;
            ssh
                .exec('exit 0', {
                    exit: function() {
                        expect(callCount).to.be(0);
                        callCount += 1;
                    }
                })
                .exec('exit 0', {
                    exit: function() {
                        expect(callCount).to.be(1);
                        callCount += 1;

                        ssh.exec('exit 0', {
                            exit: function() {
                                expect(callCount).to.be(3);
                                done();
                            }
                        });
                    }
                })
                .exec('exit 0', {
                    exit: function() {
                        expect(callCount).to.be(2);
                        callCount += 1;
                    }
                })
                .start();
        });
    });

    describe('reset', function() {
        it('should create a new Connection object', function() {
            var oldConnection = ssh._c;
            ssh.reset();
            expect(oldConnection).to.not.be(ssh._c);
        });

        it('should clear the commands queue', function() {
            ssh
                .exec('exit 0')
                .exec('exit 1')
                .exec('exit 2');
            expect(ssh._commands).to.have.length(3);

            ssh.reset();
            expect(ssh._commands).to.have.length(0);
        });

        it('should stop the current connection before replacing it', function(done) {
            ssh
                .exec('exit 0', {
                    exit: function() {
                        ssh.reset();
                        done();
                    }
                })
                .exec('exit 0', {
                    exit: function() {
                        expect().to.fail('Connection should have been ended');
                    }
                })
                .start();
        });
    });
});
