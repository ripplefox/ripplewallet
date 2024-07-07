/* globals angular, nw, translate_cn, translate_en, translate_jp */
window.appinfo = require('./package.json');

/* exported myApp */
var myApp = angular.module('myApp', ['ngRoute', 'pascalprecht.translate', 'monospaced.qrcode']);

myApp.config(function($routeProvider, $httpProvider, $translateProvider, $compileProvider) {
  $translateProvider.translations('cn', translate_cn);
  $translateProvider.translations('jp', translate_jp);
  $translateProvider.translations('en', translate_en);
  $translateProvider.preferredLanguage('cn');
  $translateProvider.useSanitizeValueStrategy('escape');

  $compileProvider.imgSrcSanitizationWhitelist(/^\s*(local|http|https|app|tel|ftp|file|blob|content|ms-appx|x-wmapp0|cdvfile|chrome-extension):|data:image\//);
  $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);

  //$httpProvider.interceptors.push('TokenInterceptor');

  $routeProvider.when('/login', {
    templateUrl : 'pages/login.html',
    controller : 'LoginCtrl',
    access : {
      requiredLogin : false
    }
  }).when('/register', {
    templateUrl : 'pages/register.html',
    controller : 'RegisterCtrl',
    access : {
      requiredLogin : false
    }
  }).when('/security', {
    templateUrl : 'pages/security.html',
    controller : 'SecurityCtrl',
    access : {
      requiredLogin : false
    }
  }).when('/', {
    templateUrl : 'pages/balance.html',
    controller : 'BalanceCtrl',
    access : {
      requiredLogin : true
    }
  }).when('/balance', {
    templateUrl : 'pages/balance.html',
    controller : 'BalanceCtrl',
    access : {
      requiredLogin : true
    }
  }).when('/trust', {
    templateUrl : 'pages/trust.html',
    controller : 'TrustCtrl',
    access : {
      requiredLogin : true
    }
  }).when('/send', {
    templateUrl : 'pages/send.html',
    controller : 'SendCtrl',
    access : {
      requiredLogin : true
    }
  }).when('/contact', {
    templateUrl : 'pages/contact.html',
    controller : 'ContactCtrl',
    access : {
      requiredLogin : true
    }
  }).when('/convert', {
    templateUrl : 'pages/convert.html',
    controller : 'ConvertCtrl',
    access : {
      requiredLogin : true
    }
  }).when('/history', {
    templateUrl : 'pages/history.html',
    controller : 'HistoryCtrl',
    access : {
      requiredLogin : true
    }
  }).when('/trade', {
    templateUrl : 'pages/trade.html',
    controller : 'TradeCtrl',
    access : {
      requiredLogin : true
    }
  }).when('/settings', {
    templateUrl : 'pages/settings.html',
    controller : 'SettingsCtrl',
    access : {
      requiredLogin : true
    }
  }).otherwise({
    redirectTo : '/login'
  });
});

myApp.run(['$rootScope', '$window', '$location', '$translate', 'AuthenticationFactory', 'SettingFactory', 'Id', 'ServerManager', 'XrpApi', 'Gateways',
  function($rootScope, $window, $location, $translate, AuthenticationFactory, SettingFactory, Id, SM, XrpApi, Gateways) {

    $rootScope.$on("$routeChangeStart", function(event, nextRoute, currentRoute) {
      if ((nextRoute.access && nextRoute.access.requiredLogin) && !AuthenticationFactory.isInSession) {
        $location.path("/login");
      } else {
        if (currentRoute && currentRoute.originalPath == '/trade') {
          console.log('Leave trade page');
        }
        if (currentRoute && currentRoute.originalPath == '/send') {
          console.log('Leave send page');
          $location.search({}); // clean params
        }
        // check if user object exists else fetch it. This is incase of a page refresh
        if(AuthenticationFactory.isInSession) AuthenticationFactory.restore();
      }
    });

    $rootScope.$on('$routeChangeSuccess', function(event, nextRoute, currentRoute) {
      $rootScope.showMenu = AuthenticationFactory.isInSession;
      // if the user is already logged in, take him to the home page
      if (AuthenticationFactory.isInSession && $location.path() == '/login') {
        $location.path('/');
      }
    });

    $rootScope.$on('$authUpdate', function(){
      console.log('$authUpdate', AuthenticationFactory.isInMemory, $rootScope.address, AuthenticationFactory.address);

      if (AuthenticationFactory.isInMemory) {
        $rootScope.address = AuthenticationFactory.address;
        $rootScope.contacts = AuthenticationFactory.contacts;
        XrpApi.init();
      } else {
        delete $rootScope.address;
        delete $rootScope.contacts;
      }
    });

    $rootScope.goTo = function(url){
      $location.path(url);
    };

    XrpApi.appVersion = "foxlet-" + appinfo.version;
    $rootScope.currentNetwork = SettingFactory.getCurrentNetwork();
    $rootScope.native = $rootScope.currentNetwork.coin;
    
    $rootScope.balance = "0"; //native asset;
    $rootScope.reserve = 0;
    $rootScope.lines = [];
    $rootScope.getBalance = function(code, issuer) {
      if (code == $rootScope.native.code) {
        code = "XRP";
      } else {
        code = realCode(code);
      }
      let asset = $rootScope.balances.find(x => {
        return code == 'XRP' ? x.currency == 'XRP' : x.currency == code && x.issuer == issuer;
      });
      return asset ? Number(asset.value) : 0;
    }
    $rootScope.funded = function() {
      return $rootScope.balance !== "0";
    }

    reset();
    function reset() {
      console.warn('reset');
      $rootScope.fed_name = "";
      $rootScope.address  = 'undefined';
      $rootScope.contacts = [];
      $rootScope.balances = [];
      $rootScope.lines = [];
      $rootScope.balance = "0";
      $rootScope.reserve = 0;
    }

    $rootScope.reset = function(){
      reset();
    }

    $rootScope.objKeyLength = function(obj) {
      return Object.keys(obj).length;
    }
    $rootScope.isValidAddress = function(address) {
      return Id.isValidAddress(address);
    }
    $rootScope.getGateway = function(code, issuer) {
      return Gateways.getGateway(code, issuer);
    }
    
    $rootScope.isPublicNetwork = function() {
      return this.currentNetwork.name == "Ripple Public Network";
    }

    $rootScope.isLangCN = function() {
      return SettingFactory.getLang() == 'cn';
    }
    $translate.use(SettingFactory.getLang());

    try {
      //SM.setMaxfee(SettingFactory.getMaxfee());
      //SM.setTimeout(SettingFactory.getTimeout());
      SM.setServers(SettingFactory.getServers());
      SM.connect().then((name) => {
        console.log(`Client connect to ${name}`);
        XrpApi.client = SM.client;
      });
    } catch(e) {
      console.error("Cannot set server", SettingFactory.getNetworkType(), e);
      console.warn("Change network back to xrp.");
      SettingFactory.setNetworkType('xrp');
      SM.setServers(SettingFactory.getServers());
    }

  }]);


/* exported common functions */
var round = function(dight, howMany) {
  if(howMany) {
    dight = Math.round(dight * Math.pow(10, howMany)) / Math.pow(10, howMany);
  } else {
    dight = Math.round(dight);
  }
  return dight;
}

var hexToAscii = function(hex) {
    var str = "";
    var i = 0, l = hex.length;
    if (hex.substring(0, 2) === '0x') {
        i = 2;
    }
    for (; i < l; i+=2) {
        var code = parseInt(hex.substr(i, 2), 16);
        if (code > 0) {
          str += String.fromCharCode(code);
        }
    }

    return str;
};

var asciiToHex = function(str) {
  var hex = "";
  for(var i = 0; i < str.length; i++) {
    var code = str.charCodeAt(i);
    var n = code.toString(16);
    hex += n.length < 2 ? '0' + n : n;
  }
  return (hex + "0000000000000000000000000000000000000000").substring(0, 40).toUpperCase();;
};

var realCode = function(input) {
  return input && input.length > 3 && input.length <= 20 && input != "drops" ? asciiToHex(input) : input;
};

var fmtCode = function(input) {
  if (!input || input.length != 40) {
    return input;
  }
  if (input.substring(0, 2) == "03") {
    return lp_map[input] ? lp_map[input] : input.substring(0, 7) + "...";
  }
  return hexToAscii(input);
};

function key(code, issuer) {
  if (!code) {
    return "NONE";
  }
  code = realCode(code);
  return !issuer ? code : code + '.' + issuer;
};

const lp_map = {  
  '036A7A7F2A97B4FA6DC31E9C00A24DF4436A76ED' : 'XRPS-XRP',
  '032A44D0C63117A2189C23C44D071731A2C1D5F8' : 'XRPS-USDT',
  '03C2744C7F532C62F8C4D49D07C03723E667EC6D' : 'XRPS-ETH',
  '03819CE473B7EFC3157A6F6E4CD01AF27CC3DAE9' : 'XRPS-XLM',
  '03F7CA89ED32E3301C581E98F1B6D2F5028F30DE' : 'XRPS-CNY',
  '038EDFFB6E794DE7401AB32A3FAB7436357BC769' : 'XRPS-ULT',
  '03A1897ED5199AC170706194A3F2EA24C69B366A' : 'XRPS-PEOPLE',
  '03AD86F3192EBF3AE79E5B07156AA82C65A19EEB' : 'XRPS-PEPE',
  '03F933EF00EC59ED39F434372E36B542C80D441F' : 'XRPS-SHIB',
  '03A6770F32D91F916DCBEAEF5DF9922FCF6F69A1' : 'XRPS-BTC',
  '03E5B4D862526500541050E4A2872CD7E7E818BB' : 'XRPS-FIL',
  '03AC78CEB14F1DDF61007A0AEA67F933720B265F' : 'XRPS-XAG',
  '0387C12FC7A317FFF309B2DA4C316AFF66866D7D' : 'XAG-USDT',
  '037F2D4F9A403ABFED3ED22DFD44D24C5FA3618D' : 'XRP-USDT',
  '03B9D5AED48B20CC0926373FB46775329CFDB52E' : 'XRP-XLM',
  '03133F280C89315FFF6319A9C0ACE2634C676472' : 'XRP-XAG',
  '035FAD658918E54F6BF7FC7D696B65F64A1CBF87' : 'ETH-XAG',
  '03E5EA238C57E6F00322F8A0B6FD37920CFFF55C' : 'XLM-XAG',
  '036569492589AA8CCDFF9426B87A63D5019CA8F2' : 'XAG-CNY',
  '0334E001620110E325E1EEF5A21F1A22FF1DDD2B' : 'XRP-CNY',
  '03AA0832FC381B3B588121D3B8CD3A39D3E125A3' : 'XLM-CNY'
}