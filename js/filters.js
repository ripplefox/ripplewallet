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

myApp.filter('rpcurrency', function($filter) {
  return function(input, nativecode) {
    input = input || "";
    nativecode = nativecode || 'XRP';
    input = input == 'XRP' ? nativecode : input;
    return fmtCode(input);
  }
});

myApp.filter('fmtcode', function($filter) {
  return function(input) {
    return fmtCode(input);
  }
});
