// Generated by CoffeeScript 2.3.2
(function() {
  var Request, Response, Router, match;

  Request = require('./request');

  Response = require('./response');

  // create match uri pattern
  match = function(method, pattern) {
    var keys, r;
    keys = [];
    // replace as regex
    pattern = pattern.replace(/(:|%)([_a-z0-9-]+)/ig, function(m, prefix, name) {
      keys.push(name);
      if (prefix === ':') {
        return '([^\\/]+)';
      } else {
        return '(.+)';
      }
    });
    r = new RegExp(`^${pattern}$`, 'g');
    return function(requestMethod, uri, params) {
      var i, j, len, result, val;
      if ((method != null) && requestMethod !== method) {
        return false;
      }
      result = r.exec(uri);
      r.lastIndex = 0;
      if (result != null) {
// inject params
        for (i = j = 0, len = result.length; j < len; i = ++j) {
          val = result[i];
          if (i === 0) {
            continue;
          }
          params[keys[i - 1]] = val;
        }
        return true;
      }
      // not matched
      return false;
    };
  };

  Router = class Router {
    constructor() {
      // routes map
      this.routes = [];
      // default functions
      this.defaults = [];
    }

    // register routes
    register(method, pattern, fn) {
      var def, functions, pushed, raw, tester;
      tester = match(method, pattern);
      functions = [];
      pushed = false;
      raw = false;
      def = {
        get: function() {
          if (!pushed) {
            functions.push(fn);
            pushed = true;
          }
          return [tester, functions, raw];
        },
        raw: function() {
          raw = true;
          return this;
        },
        use: function(...actions) {
          var action, item, j, k, len, len1;
          for (j = 0, len = actions.length; j < len; j++) {
            action = actions[j];
            if (action instanceof Array) {
              for (k = 0, len1 = action.length; k < len1; k++) {
                item = action[k];
                functions.push(item);
              }
            } else {
              functions.push(action);
            }
          }
          return this;
        }
      };
      this.routes.push(def);
      return def;
    }

    // register default functions
    use(...actions) {
      var action, item, j, len, results;
      results = [];
      for (j = 0, len = actions.length; j < len; j++) {
        action = actions[j];
        if (action instanceof Array) {
          results.push((function() {
            var k, len1, results1;
            results1 = [];
            for (k = 0, len1 = action.length; k < len1; k++) {
              item = action[k];
              results1.push(this.defaults.push(item));
            }
            return results1;
          }).call(this));
        } else {
          results.push(this.defaults.push(action));
        }
      }
      return results;
    }

    // handler for http
    handler(result, options) {
      return (req, res) => {
        var response;
        response = new Response(res, req, options);
        return new Request(req, options, (request) => {
          var callbacks, context, def, done, functions, index, j, len, next, params, raw, ref, respond, resultArgs, returned, tester;
          context = {request, response};
          callbacks = [];
          returned = false;
          index = -1;
          resultArgs = null;
          next = null;
          respond = function() {
            var args, name;
            [name, args] = resultArgs;
            result[name].apply(null, args).call(null, request, response);
            if (!response.responded) {
              return response.respond();
            }
          };
          done = function(name, ...args) {
            if (returned) {
              return;
            }
            returned = true;
            index = callbacks.length;
            if (result[name] == null) {
              name = 'blank';
            }
            resultArgs = [name, args];
            if (next) {
              return next();
            } else {
              return respond();
            }
          };
          ref = this.routes;
          for (j = 0, len = ref.length; j < len; j++) {
            def = ref[j];
            [tester, functions, raw] = def.get();
            params = {};
            if (!tester(request.method, request.path, params)) {
              // deny not matched
              continue;
            }
            request.set(params);
            (next = (callback) => {
              var fn;
              if (returned) {
                index -= 1;
                if (index >= 0) {
                  return callbacks[index].apply(context, resultArgs);
                } else {
                  return respond();
                }
              } else {
                if (callback != null) {
                  callbacks.push(callback);
                }
                index += 1;
                if (raw) {
                  fn = functions[index];
                } else {
                  fn = index >= this.defaults.length ? functions[index - this.defaults.length] : this.defaults[index];
                }
                if (fn != null) {
                  return res = fn.call(context, done, next);
                }
              }
            })(null);
            return;
          }
          return done('notFound');
        });
      };
    }

  };

  module.exports = Router;

}).call(this);
