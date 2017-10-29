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
var lockRelease = require('./index');
var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/myapp');

var Schema = mongoose.Schema;

var MySchema = new Schema({ order: { id: String }, user: { email: String } });

MySchema.plugin(lockRelease, 'MySchema');

var MyModel = mongoose.model('MySchema', MySchema);


describe('mongoose-lock-release', function () {
    var lockTime = 100000;
    var myModel;
    before(function (done) {
        MyModel.create({
            order: {
                id: faker.random.uuid()
            },
            user: {
                email: faker.internet.email()
            }
        }, function(err, _myModel) {
            myModel = _myModel;
            done(err);
        });
    });
    it('should lock it if it is not locked yet', function (done) {
        async.waterfall([
            function lock(cb) {
                myModel.lock(lockTime, cb);
            },
            function check(myModel, cb) {
                expect(myModel).to.be.ok();
                expect(myModel.locked > new Date()).to.be(true);
                cb();
            }
        ], done);
    });
    it('should refuse to lock if it is already locked', function (done) {
        myModel.lock(lockTime, function(err, myModel) {
            expect(err).to.not.be.ok();
            expect(myModel).to.not.be.ok();
            done();
        });
    });
    it('should release the lock', function (done) {
        myModel.release(function(err, _myModel) {
            expect(err).to.not.be.ok();
            expect(_myModel).to.be.ok();
            myModel = _myModel;
            done();
        });
    });
    it('should fail one lock if two are set concurrently', function (done) {
        async.parallel([
            function lock(cb) {
                myModel.lock(lockTime, cb);
            },
            function lock(cb) {
                myModel.lock(lockTime, cb);
            },
        ], function (err, myModels) {
            if (err) {
                return done(err);
            }

            var countLocks = _.filter(myModels, function(i) { return i && i.locked; });
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
            myModel.release(cb);
        }

        function lock(cb) {
            myModel.lock(1, cb);
        }
    });
});
