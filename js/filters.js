/* global myApp */

myApp.filter('shortaddress', function() {
  return function(address) {
    if (!address || address.length < 8) {
      return address;
    }
    var start = address.substring(0, 8);
    var end = address.substring(address.length - 8);
    return start + '...' + end;
  }
});

myApp.filter('fmtnum', function($filter) {
  return function(input) {
    var num = parseFloat(input);
    if (num >= 1000) return $filter('number')(input, 0);
    return round(num, 6).toString();
  }
});

myApp.filter('rpamount', function () {
  return function (input, options) {
    var opts = $.extend(true, {}, options);

    if ("number" === typeof opts) {
      opts = {
        rel_min_precision: opts
      };
    } else if ("object" !== typeof opts) {
      opts = {};
    }

    // If no precision is given, we'll default to max precision.
    if ("number" !== typeof opts.precision) {
      opts.precision = 16;
    }

    // But we will cut off after five significant decimals
    if ("number" !== typeof opts.max_sig_digits) {
      opts.max_sig_digits = 5;
    }
    
    var amount = ripple.Amount.from_json(input);
    if (opts.invert) {
      amount = amount.invert();
    }

    var out = amount.to_human(opts);

    // If amount is very small and only has zeros (ex. 0.0000), raise precision
    // to make it useful.
    if (out.length > 1 && 0 === +out && !opts.hard_precision) {
      opts.precision = 5;

      out = amount.to_human(opts);
    }

    return out;
  };
});

myApp.filter('rpcurrency', function($filter) {
  return function(input, nativecode) {
    var amount = ripple.Amount.from_json(input);
    nativecode = nativecode || 'XRP';
    var code = amount.issuer().to_json() ? amount.currency().to_human() : nativecode;
    return code.length == 40 ? hexToAscii(code) : code;

  }
});

myApp.filter('fmtcode', function($filter) {
  return function(input) {
    return input && input.length == 40 ? hexToAscii(input) : input;
  }
});