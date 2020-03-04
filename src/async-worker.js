;(function(window, document) {

    // strict mode
    "use strict";

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
    AsyncWorker.prototype = {
        /**
         * Valid signals
         *
         * @type {Array}
         */
        _signals: [ "start", "stop", "break", "job", "framerequest", "complete", "error" ],

        /**
         * Constructor
         *
         * @return {Void}
         */
        _init: function() {
            this._error = null;
            this._busy = false;
            this._data = {};
            this._eventListener = {};
            this._jobList = [];
            this._workOnInactive = true;
            this._interval = -1
            this._jobsComplete = 0;
            this._jobsCount = 0;
            this._handleVisibilityChangeBind = this._handleVisibilityChange.bind(this);
        },

        /**
         * Destructor
         *
         * @return {Void}
         */
        destroy: function() {
            this.stop();
            this.clear();
        },

        /**
         * Is browser active
         *
         * @return {Boolean}
         */
        get browserActive() {
            return document.visibilityState === "visible" ? true : false;
        },

        /**
         * Error property getter
         *
         * @return {Error}
         */
        get error() {
            return this._error;
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
         * WorkOnInactive property getter
         *
         * @return {Number}
         */
        get workOnInactive() {
            return this._workOnInactive;
        },

        /**
         * WorkOnInactive property setter
         *
         * @param  {Number} value
         * @return {Void}
         */
        set workOnInactive(value) {
            this._workOnInactive = !!value;
        },

        /**
         * Emit event
         *
         * @param  {String} eventName
         * @return {Mixed}
         */
        _emit: function(eventName) {
            if (!this._eventListener[eventName])
                return;

            var event = {
                eventName: eventName,
                busy: this.busy,
                data: this.data,
                interval: this._interval,
                jobsComplete: this._jobsComplete,
                jobsCount: this._jobsCount,
            }
            Object.freeze(event);

            var result;
            for (var i = 0; i < this._eventListener[eventName].length; i++) {
                if (this._eventListener[eventName][i].call(this, event) === false)
                    result = false;
            }

            return result;
        },

        /**
         * Do work (iterate job list)
         *
         * @return {Number}
         */
        _worker: function() {
            if (!this.busy)
                return this._stop();

            // on modern browser inactive tab allowes only
            // one setTimeout function per second, so we're
            // increasing jobs per interval to compensate
            // the lost (since tab is not active user won't
            // see unresponsive page)
            var weightMax = !this.workOnInactive || this.browserActive ? 1 : 25;

            // get number of jobs to execute (where their
            // total weight is less than weightMax)
            var weightTotal = 0;
            var index = 0;
            var count = 0;
            while (count < this._jobList.length) {
                var job = this._jobList[index];
                var weight = job[2];
                if (weight + weightTotal > weightMax)
                    break;

                index++;
                count++;
                weightTotal += weight;
            }

            // execute jobs
            weightTotal = 0;
            index = 0;
            while (this._jobList.length && index < count) {
                var job = this._jobList.shift();
                var fn = job[0];
                var args = job[1];
                var weight = job[2];
                //var priority = job[3];

                // execute
                try {
                    fn.apply(this, args);
                } catch(e) {
                    // job not executed, add it back
                    // to jobList
                    this._jobList.unshift(job);

                    // store and emit error
                    this._error = e;
                    this._emit("error");

                    return;
                }

                // increase
                this._jobsComplete++;
                index++;
                weightTotal += weight;

                // default prevented
                if (this._emit("job") === false)
                    return this._break();

                // browser visibility change
                if (this.browserActive && weightTotal > 1)
                    // @todo - will document visibilityState
                    // change trigger while looping?
                    break;
            }

            // break, continue or complete
            if (this._emit("framerequest") === false)
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
            if (this.browserActive)
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
         * Browser visibility change event handler:
         * method window.requestAnimationFrame won't
         * fire while browser is inactive, so we need
         * to replace it with window.setTimeout when
         * visibility changes from visible to hidden
         *
         * @param  {Event} e
         * @return {Void}
         */
        _handleVisibilityChange: function(e) {
            if (!this.busy || this.browserActive)
                return;

            window.cancelAnimationFrame(this._interval);
            window.clearInterval(this._interval);

            this._continue();
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
            window.cancelAnimationFrame(this._interval);
            window.clearInterval(this._interval);

            document.removeEventListener("visibilitychange", this._handleVisibilityChangeBind);

            this._error = null;
            this._busy = false;
            this._interval = -1
            this._jobList = [];
            this._jobsComplete = 0;
            this._jobsCount = this._jobList.length;
        },

        /**
         * Append function to job list
         *
         * Add function (fn) and it's arguments (args)
         * to execute on job start...
         *
         * If you want to execute more than one function
         * per interval you can provide weight argument.
         * For example:
         *
         *      worker.append(callback, [], 0.5);
         *      worker.append(callback, [], 0.5);
         *      worker.append(callback, [], 0.25);
         *      worker.append(callback, [], 0.25);
         *      worker.append(callback, [], 0.25);
         *      worker.append(callback, [], 0.25);
         *
         * ...will execute first two functions in one
         * interval, and the rest in another.
         *
         * The jobList will be sorted (ascending)
         * according to priority argument.
         *
         * @param  {Function} fn
         * @param  {Array}    args     (optional)
         * @param  {Number}   weight   (optional)
         * @param  {Number}   priority (optional)
         * @return {Void}
         */
        append: function(fn, args, weight, priority) {
            args = args || [];
            weight = weight*1 || 0;
            priority = priority*1 || 0;

            if (weight <= 0 || weight > 1)
                weight = 1;

            this._jobList.push([ fn, args, weight, priority ]);
            this._jobList.sort(function(a, b) {
                return a[3] - b[3];
            });

            this._jobsCount++;
        },

        /**
         * Start work
         *
         * @return {Void}
         */
        start: function() {
            if (this.busy)
                return;

            document.addEventListener("visibilitychange", this._handleVisibilityChangeBind);

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

            document.removeEventListener("visibilitychange", this._handleVisibilityChangeBind);

            this._busy = false;
        },

        /**
         * Add event listener
         *
         * @param {String}   eventName
         * @param {Function} callback
         * @return {Void}
         */
        addEventListener: function(eventName, callback) {
            if (this._signals.indexOf(eventName) === -1)
                throw "AsyncWorker: Failed to execute 'addEventListener', the eventName argument must be valid signal (" + this._signals.join(",") + ").";
            if (typeof callback !== "function")
                throw "AsyncWorker: Failed to execute 'addEventListener', the callback argument must be function.";

            if (!this._eventListener[eventName])
                this._eventListener[eventName] = [];

            this._eventListener[eventName].push(callback);
        },

        /**
         * Remove event listener
         *
         * @param {String}   eventName
         * @param {Function} callback
         * @return {Void}
         */
        removeEventListener: function(eventName, callback) {
            if (!this._eventListener[eventName] || typeof callback !== "function")
                return;

            for (var i = this._eventListener[eventName].length - 1; i >= 0; i--) {
                if (this._eventListener[eventName][i] === callback)
                    this._eventListener[eventName].splice(i, 1);
            }
        },
    };

    // re-assing constructor
    AsyncWorker.prototype.constructor = AsyncWorker;

    // globalize
    window.AsyncWorker = AsyncWorker;

})(window, document);
