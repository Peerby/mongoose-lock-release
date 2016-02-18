/*eslint-env mocha */

/**
 * These tests can only succeed if you have MongoDb running.
 * I haven't found a way yet, how to test this plugin entirely by itself.
 */

// Modules
var expect = require('expect.js');
var faker = require('faker');
var async = require('async');
var _ = require('lodash');

// Test subject
var MySchema = require('./mySchema');

describe('mongoose-lock-release', function () {
    var lockTime = 100000;
    var mySchema;
    before(function (done) {
        new MySchema({
            order: {
                id: faker.random.uuid()
            },
            user: {
                email: faker.internet.email()
            }
        }).save(function(err, _mySchema) {
            mySchema = _mySchema;
            done(err);
        });
    });
    it('should lock it if it is not locked yet', function (done) {
        async.waterfall([
            function lock(cb) {
                mySchema.lock(lockTime, cb);
            },
            function check(mySchema, cb) {
                expect(mySchema).to.be.ok();
                expect(mySchema.locked > new Date()).to.be(true);
                cb();
            }
        ], done);
    });
    it('should refuse to lock if it is already locked', function (done) {
        mySchema.lock(lockTime, function(err, mySchema) {
            expect(err).to.not.be.ok();
            expect(mySchema).to.not.be.ok();
            done();
        });
    });
    it('should release the lock', function (done) {
        mySchema.release(function(err, _mySchema) {
            expect(err).to.not.be.ok();
            expect(_mySchema).to.be.ok();
            mySchema = _mySchema;
            done();
        });
    });
    it('should fail one lock if two are set concurrently', function (done) {
        async.parallel([
            function lock(cb) {
                mySchema.lock(lockTime, cb);
            },
            function lock(cb) {
                mySchema.lock(lockTime, cb);
            },
        ], function (err, mySchemas) {
            if (err) {
                return done(err);
            }

            var countLocks = _.filter(mySchemas, function(i) { return i && i.locked; });
            expect(countLocks.length).to.be(1);
            done();
        });
    });
    it('should be lockable if lock has expired', function (done) {
        async.series([
            release,
            lock,
            lock, //lock it again
        ], done);

        function release(cb) {
            mySchema.release(cb);
        }

        function lock(cb) {
            mySchema.lock(1, cb);
        }
    });
});
