
module.exports = (grunt) ->

  grunt.initConfig(
    coffee: {
      compile: {
        files: {
          'main.js': './lib/main.iced'
          'clone.js': './lib/clone.iced'
        }
      }
    }
  )

  grunt.loadNpmTasks('grunt-iced-coffee')

  grunt.registerTask('default', ['coffee'])
