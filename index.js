var operation = require('plumber').operation;
var Supervisor = require('plumber').Supervisor;
var Rx = require('plumber').Rx;

var Minimatch = require('minimatch').Minimatch;
var flatten = require('flatten');
var path = require('path');


function identity(x){ return x; }

// FIXME: native helper?
// compose(f, g)(x) == f(g(x))
function compose(f, g) {
    return function() {
        return f(g.apply(null, arguments));
    };
}

function uniqueByPath() {
    var memo = {};
    return function(resource) {
        var resPath = resource.path().absolute();
        var seen = memo[resPath];
        memo[resPath] = true;
        return ! seen;
    };
}

function asMinimatch(pattern) {
    return new Minimatch(pattern);
}

function excludeMatching(excludedPatterns) {
    var exclusionMatchers = excludedPatterns.map(asMinimatch);
    return function(resource) {
        var resPath = resource.path().absolute();
        return ! exclusionMatchers.some(function(mm) {
            return mm.match(resPath);
        });
    };
}

function globOperation(mapper, excludedPatterns) {
    // The glob function is an alias for glob.pattern
    function glob(/* patterns... */) {
        return glob.pattern.apply(null, arguments);
    };

    glob.pattern = function(/* patterns... */) {
        var patterns = flatten([].slice.call(arguments));
        var patternList = Rx.Observable.fromArray(patterns).map(mapper);
        // FIXME: do we really need the supervisor then?
        var supervisor = new Supervisor();
        var glob = supervisor.glob.bind(supervisor);
        // return operation(function(resources) {
        //     var glob = supervisor.glob.bind(supervisor);
        //     var globbedResources = patternList.
        //         map(glob).
        //         mergeAll().
        //         filter(uniqueByPath()).
        //         filter(excludeMatching(excludedPatterns));
        //     return resources.concat(globbedResources);
        // });


        return function(executions) {

            function load() {
                var globbedResources = patternList.
                        map(glob).
                        mergeAll().
                        filter(uniqueByPath()).
                        filter(excludeMatching(excludedPatterns));
                return globbedResources;
            }


            var watcher = Rx.Observable.defer(function() {
                var Gaze = require('gaze').Gaze;

                // FIXME: build list from array rather than Observable to
                // avoid duplicated evaluation on each subscription?
                var filesChanged = patterns.map(function(pattern) {
                    console.log("- gaze", pattern)
                    var gaze = new Gaze(pattern);
                    return Rx.Observable.fromEvent(gaze, 'all', function(args) {
                        return {type: args[0], filepath: args[1]};
                    });
                });

                // TODO: throttle in case multiple matched files change at once?
                return Rx.Observable.fromArray(filesChanged).
                    mergeAll().
                    map(load);
            });

            var globber = Rx.Observable.return(load()).concat(watcher)
            return Rx.Observable.combineLatest(executions, globber, function(a,b){ return a.concat(b) })
        };
    };

    glob.exclude = function(/* patterns... */) {
        var excludeList = flatten([].slice.call(arguments)).map(mapper);
        return globOperation(mapper, excludedPatterns.concat(excludeList));
    };

    // recursively compose mappers
    glob.within = function(directory) {
        return globOperation(compose(mapper, function(file) {
            return path.join(directory, file);
        }), excludedPatterns);
    };

    return glob;
};

module.exports = globOperation(identity, []);
