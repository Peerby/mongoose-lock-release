module.exports = function lockReleasePlugin (schema, modelName) {
    if (!modelName) {
        throw new Error('modelName is required');
    }

    schema.add({
        locked: {
            type: Date,
            default: Date.now
        }
    });

    schema.methods.lock = function lockInvoice (duration, cb) {
        var self = this;
        return new Promise(function(resolve, reject) {
            var now = new Date();
            self.model(modelName).findOneAndUpdate({
                _id: self._id,
                locked: {
                    $lte: now
                }
            }, {
                locked: new Date(now.getTime() + duration)
            }, {
                new: true
            }, function() {
                var args = [].slice.call(arguments);
                var err = args.shift();

                if (err) {
                    reject(err);
                } else {
                    resolve.apply(null, args);
                }
                cb && cb.apply(null, arguments)
            });
        });
    };

    schema.methods.release = function releaseInvoice (cb) {
        var self = this;
        return new Promise(function(resolve, reject) {
            self.model(modelName).findOneAndUpdate({
                _id: self._id,
            }, {
                locked: new Date()
            }, {
                new: true
            }, function() {
                var args = [].slice.call(arguments);
                var err = args.shift();

                if (err) {
                    reject(err);
                } else {
                    resolve.apply(null, args);
                }
                cb && cb.apply(null, arguments)
            });
        });
    };
}
