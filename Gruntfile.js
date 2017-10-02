'use strict';

module.exports = function(grunt) {

    var PROJECT_FILES = ['Gruntfile.js', 'lib/**/*.js', 'test/**/*.js'];

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-simple-mocha');

    grunt.initConfig({
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            all: {
                files: {
                    src: PROJECT_FILES
                }
            }
        },

        watch: {
            all: {
                files: PROJECT_FILES,
                tasks: ['jshint:all']
            },
            test: {
                files: PROJECT_FILES,
                tasks: ['jshint:all', 'simplemocha:all']
            }
        },

        simplemocha: {
            options: {
                timeout: 10000,
                ui: 'bdd',
                reporter: 'spec'
            },
            all: {
                src: ['test/**/*.js']
            }
        }
    });

    grunt.registerTask('default', ['jshint:all', 'simplemocha:all']);
    grunt.registerTask('test', 'watch:test');

};