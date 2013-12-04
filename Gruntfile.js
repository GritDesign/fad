"use strict";

module.exports = function (grunt) {

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON("package.json"),
		"jasmine_node": {
			coverage: {},
			src: "lib/**/*.js",
			options: {
				forceExit: true,
				match: ".",
				matchall: false,
				extensions: "js",
				specNameMatcher: "spec",
				junitreport: {
					report: false,
					savePath: "./build/reports/jasmine/",
					useDotNotation: true,
					consolidate: true
				}
			}
		},
		jshint: {
			options: {},
			globals: {},
			code: {
				src: ["lib/**/*.js"],
				options: {
					jshintrc: ".jshintrc"
				}
			},

			spec: {
				src: ["spec/**/*.js"],
				options: {
					jshintrc: ".jshintrc"
				},
				globals: {
					describe: true,
					it: true,
					expect: true
				}
			},
			grunt: {
				src: ["Gruntfile.js"],
				options: {
					jshintrc: ".jshintrc"
				},
				globals: {
					task: true,
					config: true,
					file: true,
					log: true,
					template: true
				}
			}
		},
		jsbeautifier: {
			files: ["lib/**/*.js", "spec/**/*.js",
				"Gruntfile.js"
			],
			options: {
				js: {
					braceStyle: "collapse",
					breakChainedMethods: false,
					e4x: false,
					evalCode: false,
					indentChar: "\t",
					indentLevel: 0,
					indentSize: 1,
					indentWithTabs: true,
					jslintHappy: true,
					keepArrayIndentation: false,
					keepFunctionIndentation: false,
					maxPreserveNewlines: 10,
					preserveNewlines: true,
					spaceBeforeConditional: true,
					spaceInParen: false,
					unescapeStrings: false,
					wrapLineLength: 70
				}
			}
		},
		browserify: {
			dist: {
				files: {
					"dist/fad-<%= pkg.version %>.js": ["./lib/fad.js"]
				}
			}
		},
		uglify: {
			options: {
				banner: "/*! fad.js v<%= pkg.version %> |" +
					" <%= pkg.copyright %> " +
					"| http://opensource.org/licenses/MIT\n" +
					"//@ sourceMappingURL=fad-<%= pkg.version %>.min.map*/",
				sourceMap: "dist/fad-<%= pkg.version %>.min.map",
				sourceMapPrefix: 1,
				report: "min",
				beautify: {
					"ascii_only": true
				}
			},
			fad: {
				files: {
					"dist/fad-<%= pkg.version %>.min.js": [
						"dist/fad-<%= pkg.version %>.js"
					]
				}
			}
		},
		sed: {
			map: {
				path: "dist/fad-<%= pkg.version %>.min.map",
				pattern: "\"dist\/",
				replacement: "\"",
				recursive: true
			}
		}
	});

	grunt.loadNpmTasks("grunt-contrib-jshint");
	grunt.loadNpmTasks("grunt-jasmine-node-coverage");
	grunt.loadNpmTasks("grunt-jsbeautifier");
	grunt.loadNpmTasks("grunt-browserify");
	grunt.loadNpmTasks("grunt-contrib-uglify");
	grunt.loadNpmTasks("grunt-sed");

	grunt.registerTask("fmt", ["jsbeautifier"]);
	grunt.registerTask("test", ["lint", "jasmine_node"]);
	grunt.registerTask("dist", ["browserify", "uglify", "sed:map"]);
	grunt.registerTask("lint", ["jshint:code", "jshint:spec",
		"jshint:grunt"
	]);
};
