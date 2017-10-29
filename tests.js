/*eslint-env mocha */

/**
 * These tests can only succeed if you have MongoDb running.
 * I haven't found a way yet, how to test this plugin entirely by itself.
 */

// Modules
var expect = require('expect.js');
var faker = require('faker');
var async = require('async');
var lockRelease = require('./index');
var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/myapp');

// monkey patch: https://github.com/Automattic/mongoose/issues/1251#issuecomment-17216500
mongoose.models = {};
mongoose.modelSchemas = {};

var Schema = mongoose.Schema;
var MySchema = new Schema({ order: { id: String }, user: { email: String } });
MySchema.plugin(lockRelease, 'MySchema');

var MyModel = mongoose.model('MySchema', MySchema);


function createModel(cb) {
    return MyModel.create({
        order: {
            id: faker.random.uuid()
        },
        user: {
            email: faker.internet.email()
        }
    }, cb);
}

var lockTime = 100000;

describe('mongoose-lock-release', function () {
    it('should lock it if it is not locked yet (callback)', function (done) {
        async.waterfall([
            createModel,
            function lock(myModel, cb) {
                myModel.lock(lockTime, cb);
            },
            function check(myModel, cb) {
                expect(myModel).to.be.ok();
                expect(myModel.locked > new Date()).to.be(true);
                cb();
            }
        ], done);
    });
    it('should lock it if it is not locked yet (promise)', function (done) {
        createModel()
            .then(function(myModel) {
                return myModel.lock(lockTime);
            }).then(function(myModel) {
                expect(myModel).to.be.ok();
                expect(myModel.locked > new Date()).to.be(true);
            }).then(done);
    });
    it('should refuse to lock if it is already locked (callback)', function (done) {
        async.waterfall([
            createModel,
            function lock(myModel, cb) {
                myModel.lock(lockTime, cb);
            },
            function check(myModel, cb) {
                myModel.lock(lockTime, cb);
            }
        ], function(err, myModel) {
            expect(err).to.not.be.ok();
            expect(myModel).to.not.be.ok();
            done();
        });
    });
    it('should refuse to lock if it is already locked (promise)', function (done) {
        createModel()
            .then(function(myModel) {
                return myModel.lock(lockTime);
            }).then(function(myModel) {
                return myModel.lock(lockTime);
            }).then(function(myModel) {
                expect(myModel).to.not.be.ok();
            }).catch(function(err) {
                expect(err).to.not.be.ok();
            }).then(done);
    });
    it('should release the lock (callback)', function (done) {
        async.waterfall([
            createModel,
            function lock(myModel, cb) {
                myModel.lock(lockTime, cb);
            },
            function check(myModel, cb) {
                myModel.release(cb);
            }
        ], function(err, myModel) {
            expect(err).to.not.be.ok();
            expect(myModel).to.be.ok();
            done();
        });
    });
    it('should release the lock (promise)', function (done) {
        createModel()
            .then(function(myModel) {
                return myModel.lock(lockTime);
            }).then(function(myModel) {
                return myModel.release();
            }).then(function(myModel) {
                expect(myModel).to.be.ok();
            }).catch(function(err) {
                expect(err).to.not.be.ok();
            }).then(done);
    });
    it('should fail one lock if two are set concurrently (callback)', function (done) {
        async.waterfall([
            createModel,
            function lock(myModel, cb) {
                async.parallel([
                    function lock(cb) {
                        myModel.lock(lockTime, cb);
                    },
                    function lock(cb) {
                        myModel.lock(lockTime, cb);
                    },
                ], cb);
            }
        ], function (err, myModels) {
            if (err) {
                return done(err);
            }

            var countLocks = myModels.filter(function(i) { return i && i.locked; });

            expect(countLocks.length).to.be(1);
            done();
        });
    });
    it('should fail one lock if two are set concurrently (promise)', function (done) {
        createModel()
            .then(function(myModel) {
                return Promise.all([
                    myModel.lock(lockTime),
                    myModel.lock(lockTime),
                ]);
            }).then(function(myModels) {
                var countLocks = myModels.filter(function(i) { return i && i.locked; });
                expect(countLocks.length).to.be(1);
            }).catch(done).then(done);
    });
    it('should be lockable if lock has expired (callback)', function (done) {
        async.waterfall([
            createModel,
            lock,
            lock, //lock it again
        ], done);

        function lock(myModel, cb) {
            myModel.lock(1, cb);
        }
    });
    it('should be lockable if lock has expired (promise)', function (done) {
        createModel()
            .then(lock)
            .then(lock)
            .then(function() {
                done();
            })
            .catch(done);

        function lock(myModel) {
            return myModel.lock(1);
        }
    });
});
