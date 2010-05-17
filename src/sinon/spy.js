/* @depend ../sinon.js */
/*jslint indent: 2, eqeqeq: false, onevar: false*/
/*global module, require, sinon*/
(function (sinon) {
  var commonJSModule = typeof module == "object" && typeof require == "function";
  var spyCall;
  var callId = 0;

  if (!sinon && commonJSModule) {
    sinon = require("sinon");
  }

  if (!sinon) {
    return;
  }

  function spy(object, property) {
    if (!property && typeof object == "function") {
      return spy.create(object);
    }

    if (!object || !property) {
      return spy.create(function () {});
    }

    var method = object[property];
    return sinon.wrapMethod(object, property, spy.create(method));
  }

  sinon.extend(spy, (function () {
    var slice = Array.prototype.slice;

    function matchAnyCall(proxy, method, args) {
      if (!proxy.calls) {
        return false;
      }

      var spyCall;

      for (var i = 0, l = proxy.calls.length; i < l; i += 1) {
        spyCall = proxy.calls[i];

        if (spyCall[method].apply(spyCall, args)) {
          return true;
        }
      }

      return false;
    }

    // Public API
    return {
      called: false,
      callCount: 0,

      create: function create(func) {
        if (typeof func != "function") {
          throw new TypeError("spy needs a function to spy on");
        }

        function proxy() {
          return proxy.invoke(func, this, slice.call(arguments));
        }

        sinon.extend(proxy, spy);
        delete proxy.create;
        sinon.extend(proxy, func);
        proxy.calls = [];

        return proxy;
      },

      invoke: function invoke(func, thisObj, args) {
        var call = spyCall.create(thisObj, args);
        this.called = true;
        this.callCount += 1;

        try {
          call.returnValue = func.apply(thisObj, args);
        } catch (e) {
          call.exception = e;
          throw e;
        } finally {
          this.calls.push(call);
        }

        return call.returnValue;
      },

      getCall: function getCall(i) {
        return this.calls && this.calls[i];
      },

      calledBefore: function calledBefore(spy) {
        var ownFirst = this.getCall(0);
        var first = spy.getCall(0);

        if (!ownFirst) {
          return false;
        }

        if (!first) {
          return true;
        }

        return ownFirst.callId < first.callId;
      },

      calledAfter: function calledAfter(spy) {
        var ownLast = this.getCall(this.callCount - 1);
        var last = spy.getCall(spy.callCount - 1);

        if (!last || !ownLast) {
          return false;
        }

        return ownLast.callId > last.callId;
      },

      calledOn: function calledOn(thisObj) {
        return matchAnyCall(this, "calledOn", arguments);
      },

      calledWith: function calledWith() {
        return matchAnyCall(this, "calledWith", arguments);
      },

      calledWithExactly: function calledWithExactly() {
        return matchAnyCall(this, "calledWithExactly", arguments);
      },

      threw: function threw(error) {
        return matchAnyCall(this, "threw", arguments);
      }

      /* TODO:
         returned: returned,
         alwaysCalledOn: alwaysCalledOn,
         alwaysCalledWith: alwaysCalledWith,
         alwaysCalledWithExactly: alwaysCalledWithExactly,
         alwaysThrew: alwaysThrew,
         calledOnce: calledOnce,
         calledTwice: calledTwice,
         calledThrice: calledThrice
       */
    };
  }()));

  spyCall = (function () {
    function calledOn(thisObj) {
      return this.thisObj === thisObj;
    }

    function calledWith() {
      for (var i = 0, l = arguments.length; i < l; i += 1) {
        if (!sinon.deepEqual(arguments[i], this.args[i])) {
          return false;
        }
      }

      return true;
    }

    function calledWithExactly() {
      return arguments.length == this.args.length &&
               this.calledWith.apply(this, arguments);
    }

    function returned(value) {
      return this.returnValue === value;
    }

    function threw(error) {
      if (typeof error == "undefined" || !this.exception) {
        return !!this.exception;
      }

      if (typeof error == "string") {
        return this.exception.name == error;
      }

      return this.exception === error;
    }

    function create(thisObj, args, returnValue) {
      var proxyCall = sinon.create(spyCall);
      delete proxyCall.create;
      proxyCall.thisObj = thisObj;
      proxyCall.args = args;
      proxyCall.returnValue = returnValue;
      proxyCall.callId = callId++;

      return proxyCall;
    }

    return {
      create: create,
      calledOn: calledOn,
      calledWith: calledWith,
      calledWithExactly: calledWithExactly,
      returned: returned,
      threw: threw
    };
  }());

  if (commonJSModule) {
    module.exports = spy;
  } else {
    sinon.spy = spy;
    sinon.spyCall = spyCall;
  }
}(typeof sinon == "object" && sinon || null));