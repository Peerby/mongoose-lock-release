# mongoose-lock-release
Lock Mongoose documents to ensure you're the only consumer. Release when done.

## why?

Sometimes you want to be sure that a document gets handled (updated) once and only once. Most often that's the case because there is post-processing that should not happen more than once. If there's two or more concurrent instructions coming in for the same action (say because you're building a web server), it is very likely that all get handled, leading to duplicate post-processing behavior. This plugin enables you to make sure that only one of those processes will be able to proceed.

This is guaranteed because under the hood the atomic operation `findOneAndUpdate`, a wrapper for `findOnAndModify`, is used.

## install

npm isntall mongoose-lock-release

## how it works

- with `.lock(duration, callback)` a document is locked until `duration` ms have passed, at which moment it is lockable again. If `lock` does not return a document in the callback, the document is locked and you should abort the process.
- with `.release(callback)` a document is immediately lockable again.
- this plugin creates a property `locked` on your document.

## usage

**Pseudo code:**

- get your model
- `lock` the model
- if it's already locked, abort
- do all things you normally do
- `release` the model

**Javascript:**

An example with `async` to handle asynchronicity.

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;

    var MySchema = new Schema({ whatever: String });

    var lockRelease = require('mongoose-lock-release');
    MySchema.plugin(lockRelease, 'MySchema');

    var MyModel = mongoose.model('MySchema', MySchema);

    var myModel = new MyModel({whatever: 'yeah'});

    require('async').series([
        function saveModel (cb) {
            //only already stored documents can be locked
            myModel.save(cb);
        },
        function lockModel (cb) {
            var duration = 10 * 1000; //10 seconds, in ms
            myModel.lock(duration, function (err, myModel) {
                //err is truthy if there's an issue unrelated to this plugin
                if (err) { return cb(err); }

                //myModel is empty if the myModel was already locked
                //otherwise, myModel is updated with the new locked time
                if (!myModel) {
                    return cb(new Error('already processing myModel'));
                }
                cb();
            });
        },
        function doProcessing (cb) {
            //do whatever you want here, some great processing, post-processing, etc.
            cb();
        },
        function releaseModel (cb) {
            myModel.release(function (err, myModel) {
                //err is truthy if there's an issue unrelated to this plugin
                if (err) { return cb(err); }

                //myModel is updated with the new locked time, set to now.
                //myModel can be locked again
                cb();
            });
        },
    ], done);

## where are the tests?

I've written tests but they require a running mongo instance. I don't know yet how to test this plugin without having to run mongo. That said, check out `index.spec.js` for tests that you could run if you have mongo running.
