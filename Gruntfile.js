module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
                mangle: false

            },
            build: {
                src: 'src/<%= pkg.shortName %>.js',
                dest: 'build/<%= pkg.shortName %>-<%= pkg.version %>.min.js'
            },
        },
        copy: {
            build: {
                src: 'src/<%= pkg.shortName %>.js',
                dest: 'build/<%= pkg.shortName %>-<%= pkg.version %>.js'
            }
        },
        qunit: {
            files: ['test/index.html'],
        },
        connect: {
            server: {
                options: {
                    port: 3000,
                    base: '.'
                }
            }
        },
        jshint: {
            lib: {
                files: {
                    src: ['src/*.js']
                }
            }
        }

    });

    // Load plugins
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-qunit');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-copy');

    // Default task(s).
    grunt.registerTask('default', ['build']);
    grunt.registerTask('build', ['test', 'uglify', 'copy']);
    grunt.registerTask('test', ['connect', 'jshint', 'qunit']);

};
