plumber-glob
============

File globbing operation for [Plumber](https://github.com/plumberjs/plumber) pipelines.

## Example

    var glob = require('plumber-glob');

    module.exports = function(pipelines) {

        pipelines['compile'] = [
            glob('src/**/*.js'),
            // ... more pipeline operations
        ];

    };


## API

### `glob(patterns...)`

Returns resources for all files matched by the list of patterns.

Patterns may include wildcards like `*` or `**` (globstar).

See the [minimatch](https://github.com/isaacs/minimatch) documentation for the full available syntax.

### `glob.within(directory)`

Returns a new `glob` function scoped within the given directory.

Example:

    var sources = glob.within('src');
    var htmlAndCss = sources("index.html", "styles/*.css");

    var scripts = sources.within('scripts');
    var js = sources("**/*.js");
