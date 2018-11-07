;(function(window, document) {

    // strict mode
    "use strict";

    /**
     * Extend objects (additional arguments)
     * into target respecting getters and
     * setters
     *
     * @param  {Object} target
     * @return {Object}
     */
    var _extend = function(target) {
        Array.prototype.slice.call(arguments, 1).forEach(function(item) {
            for (var prop in item) {
                Object.defineProperty(target, prop, Object.getOwnPropertyDescriptor(item, prop));
            }
        });

        return target;
    }

    /**
     * Initialize AsyncWorker
     *
     * @return {Void}
     */
    var AsyncWorker = function() {
        if (!(this instanceof AsyncWorker))
            throw "AsyncWorker: AsyncWorker is a constructor.";

        this._init();
    }

    /**
     * AsyncWorker prototype
     *
     * @type {Object}
     */
    _extend(AsyncWorker.prototype, {

        /**
         * Constructor
         *
         * @return {Void}
         */
        _init: function() {
            this._busy = false;
            this._data = {};
            this._jobList = [];
            this._jobsPerFrameRequest = 1;
            this._interval = -1
            this._jobsComplete = 0;
            this._jobsCount = 0;
            this._onStart = this._noop;
            this._onStop = this._noop;
            this._onBreak = this._noop;
            this._onJob = this._noop;
            this._onFrameRequest = this._noop;
            this._onComplete = this._noop;
        },

        /**
         * Busy property getter
         *
         * @return {Boolean}
         */
        get busy() {
            return this._busy;
        },

        /**
         * Data property getter
         * (object that you can use
         * accros events)
         *
         * @return {Boolean}
         */
        get data() {
            return this._data;
        },

        /**
         * JobsPerFrameRequest property getter
         *
         * @return {Number}
         */
        get jobsPerFrameRequest() {
            return this._jobsPerFrameRequest;
        },

        /**
         * JobsPerFrameRequest property setter
         *
         * @param  {Number} value
         * @return {Void}
         */
        set jobsPerFrameRequest(value) {
            this._jobsPerFrameRequest = Math.max(value*1 || 0, 1);
        },

        /**
         * OnStart property getter
         *
         * @return {Function}
         */
        get onStart() {
            return this._onStart;
        },

        /**
         * OnStart property setter
         *
         * @param  {Mixed} value
         * @return {Void}
         */
        set onStart(value) {
            if (typeof value === "function")
                this._onStart = value;
            else
                this._onStart = this._noop;
        },

        /**
         * onStop property getter
         *
         * @return {Function}
         */
        get onStop() {
            return this._onStop;
        },

        /**
         * OnStop property setter
         *
         * @param  {Mixed} value
         * @return {Void}
         */
        set onStop(value) {
            if (typeof value === "function")
                this._onStop = value;
            else
                this._onStop = this._noop;
        },

        /**
         * onBreak property getter
         *
         * @return {Function}
         */
        get onBreak() {
            return this._onBreak;
        },

        /**
         * OnBreak property setter
         *
         * @param  {Mixed} value
         * @return {Void}
         */
        set onBreak(value) {
            if (typeof value === "function")
                this._onBreak = value;
            else
                this._onBreak = this._noop;
        },

        /**
         * OnJob property getter
         *
         * @return {Function}
         */
        get onJob() {
            return this._onJob;
        },

        /**
         * OnJob property setter
         *
         * @param  {Mixed} value
         * @return {Void}
         */
        set onJob(value) {
            if (typeof value === "function")
                this._onJob = value;
            else
                this._onJob = this._noop;
        },

        /**
         * OnFrameRequest property getter
         *
         * @return {Function}
         */
        get onFrameRequest() {
            return this._onFrameRequest;
        },

        /**
         * OnFrameRequest property setter
         *
         * @param  {Mixed} value
         * @return {Void}
         */
        set onFrameRequest(value) {
            if (typeof value === "function")
                this._onFrameRequest = value;
            else
                this._onFrameRequest = this._noop;
        },

        /**
         * onComplete property getter
         *
         * @return {Function}
         */
        get onComplete() {
            return this._onComplete;
        },

        /**
         * OnComplete property setter
         *
         * @param  {Mixed} value
         * @return {Void}
         */
        set onComplete(value) {
            if (typeof value === "function")
                this._onComplete = value;
            else
                this._onComplete = this._noop;
        },

        /**
         * Empty function
         *
         * @return {Void}
         */
        _noop: function() {
            // pass
        },

        /**
         * Emit event
         *
         * @param  {String} eventName
         * @return {Mixed}
         */
        _emit: function(eventName) {
            var name = "on" + eventName.charAt(0).toUpperCase() + eventName.slice(1);
            var fn = this[name];

            if (typeof fn === "function")
                fn.call(this, {
                    eventName: eventName,
                    busy: this.busy,
                    data: this.data,
                    interval: this._interval,
                    jobsComplete: this._jobsComplete,
                    jobsCount: this._jobsCount,
                });
        },

        /**
         * Do work (iterate job list)
         *
         * @return {Number}
         */
        _worker: function() {
            if (!this.busy)
                return this._stop();

            var index = 0;
            while (this._jobList.length && index < this.jobsPerFrameRequest) {
                var job = this._jobList.shift();
                var fn = job[0];
                var args = job[1];
                fn.apply(this, args);

                this._jobsComplete++;
                index++;

                if (this._emit("job") === false)
                    return this._break();
            }

            if (this._emit("frameRequest") === false)
                return this._break();
            else if (this._jobList.length)
                return this._continue();
            else
                return this._complete();
        },

        /**
         * Continue jobs iteration
         * on requestAnimationFrame
         *
         * @return {Number}
         */
        _continue: function() {
            if (typeof window.requestAnimationFrame === "function")
                this._interval = window.requestAnimationFrame(this._worker.bind(this));
            else
                this._interval = window.setTimeout(this._worker.bind(this), 20);

            return this._interval;
        },

        /**
         * Stop job itaration
         *
         * @return {Number}
         */
        _stop: function() {
            this._interval = -1
            this._emit("stop");

            return this._interval;
        },

        /**
         * Break job itaration
         *
         * @return {Number}
         */
        _break: function() {
            this._interval = -1
            this._emit("break");

            return this._interval;
        },

        /**
         * Job itaration completed
         *
         * @return {Number}
         */
        _complete: function() {
            this._busy = false;
            this._interval = -1
            this._emit("complete");
            this.clear();

            return this._interval;
        },

        /**
         * Clear job list
         *
         * Important: if worker is running this will
         * automatically stop it (without emiting
         * any events)
         *
         * @return {Void}
         */
        clear: function() {
            clearInterval(this._interval);

            this._busy = false;
            this._interval = -1
            this._jobList = [];
            this._jobsComplete = 0;
            this._jobsCount = this._jobList.length;
        },

        /**
         * Append function to job list (any
         * additional argument will be passed
         * to function)
         *
         * @param  {Function} fn [description]
         * @return {Void}
         */
        append: function(fn) {
            this._jobList.push([ fn, Array.prototype.slice.call(arguments, 1) ]);
            this._jobsCount = this._jobList.length;
        },

        /**
         * Start work
         *
         * @return {Void}
         */
        start: function() {
            if (this.busy)
                return;

            this._busy = true;
            this._emit("start");
            this._continue();
        },

        /**
         * Stop work
         *
         * @return {Void}
         */
        stop: function() {
            if (!this.busy)
                return;

            this._busy = false;
        },

    });

    // globalize
    window.AsyncWorker = AsyncWorker;

})(window, document);
