Javascript Async Worker
=======================

By default the browser uses a single thread to run all the JavaScript in
your page as well as to perform layout, reflows, and garbage collection.
This means that long-running JavaScript functions can block the thread,
leading to an unresponsive page and a bad user experience.

In our attempt at fixing this, we need to split up the function into a
number of much smaller self-contained functions, and schedule each one using
[`requestAnimationFrame()`](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame).

`requestAnimationFrame()` tells the browser to run the given function in each
frame, just before it performs a repaint. As long as each function is reasonably
small, the browser should be able to keep inside its frame budget.

Source: [developer.mozilla.org](https://developer.mozilla.org/en-US/docs/Tools/Performance/Scenarios/Intensive_JavaScript)

### Documentation

@todo

### Examples

Execute 5 functions (fn1 - fn5), each in different animation frame.

    var work = new AsyncWorker();
    work.append(fn1);
    work.append(fn2);
    work.append(fn3);
    work.append(fn4);
    work.append(fn5);
    work.onComplete = function() {
        console.log("Done");
    }
    work.start()

<!--
See [worker](https://www.google.com) in action!
-->
