module.exports = function lockReleasePlugin (schema, modelName) {
    if (!modelName) {
        throw new Error('modelName is required');
    }

    schema.methods.lock = function lockInvoice (duration, cb) {
        var now = new Date();
        this.model(modelName).findOneAndUpdate({
            _id: this._id,
            locked: {
                $lt: now
            }
        }, {
            locked: new Date(now.getTime() + duration)
        }, {
            new: true
        }, cb);
    };

    schema.methods.release = function releaseInvoice (cb) {
        this.model(modelName).findOneAndUpdate({
            _id: this._id,
        }, {
            locked: new Date()
        }, {
            new: true
        }, cb);
    };
}
