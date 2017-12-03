function parseQuery(queryString) {
    var query = {};
    var pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split('=');
        query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
    }
    return query;
}

var app = {ua: navigator.userAgent, mode: 'random', cid: '0'};
var g_filter;
var g_state;
var a=1;

// 状态
app.getState = function(callback) {
    chrome.storage.sync.get('state', function(r){
        g_state = (r['state']==='on');
        callback(g_state);
    });
} ;

app.changeState = function(state) {
    if((state==='off')) app.clearProxy();
    chrome.storage.sync.set({'state': state});
    chrome.browserAction.setBadgeText({text: state});
    chrome.browserAction.setBadgeBackgroundColor({color: (state==='on') ? '#00ff00' : '#ff0000'});
    g_state = (state==='on');
} ;

// cid
app.getCID = function() {
    if(app.cid==='0') {
        app.updateCID();
    }
    return app.cid;
}

app.updateCID = function() {
    var S4 = function() {
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    };
    app.cid = (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}

// 代理地址
app.getProxyAddr = function(callback) {
    chrome.storage.sync.get('proxy_addr', function(r){
        callback(r['proxy_addr']);
    });
} ;

app.setProxyAddr = function(proxy_addr) {
    chrome.storage.sync.set({'proxy_addr': proxy_addr});

    var proxy_uri = URI(proxy_addr)
    var config={
        mode: "fixed_servers",
        rules: {
          singleProxy: {
            scheme: proxy_uri.scheme(),
            host: proxy_uri.hostname(),
            port: parseInt(proxy_uri.port())
          },
          bypassList: ["localhost"]
        }
    }
    chrome.proxy.settings.set({value: config, scope: "regular"}, function() {});
} ;

app.clearProxy = function() {
    chrome.proxy.settings.clear({}, function() {});
}

// 后端代理地址
app.getBackendProxy = function(callback) {
    chrome.storage.sync.get('backend_proxy', function(r){
        callback(r['backend_proxy']);
    });
} ;

app.setBackendProxy = function(backend_proxy_addr) {
    chrome.storage.sync.set({'backend_proxy': backend_proxy_addr});
} ;

// 过滤器
app.getFilter = function(callback) {
    chrome.storage.sync.get('proxy_filter', function(r){
        g_filter = r['proxy_filter'];
        app.mode = parseQuery(g_filter).Mode.toLowerCase();
        callback(g_filter);
    });
} ;

app.setFilter = function(proxy_filter) {
    chrome.storage.sync.set({'proxy_filter': proxy_filter});
    g_filter = proxy_filter;
    app.mode = parseQuery(g_filter).Mode.toLowerCase();
} ;

app.build_filter = function(info) {
    var filter = info.fetch_type + '=1';
    if(info.fetch_country==="ALL") { //不要提供country
        filter += "&Country1=" + info.fetch_country;
    } else {
        filter += "&Country=" + info.fetch_country;
    }
    filter += "&Mode=" + info.fetch_mode;

    if(info.fetch_mode.toLowerCase() === 'bind' && info.backend_proxy.length>0)
    {
        filter += "&Proxy=" + info.backend_proxy;
    }
    return filter;
}

app.updateFilter = function(info) {
    var filter = app.build_filter(info);
    app.setFilter(filter);
};

  
// 初始化状态展示
app.getState(function(state) {
    app.changeState( state ? 'on' : 'off');
    if(state) {
        app.getProxyAddr(function(proxy_addr){
            app.setProxyAddr(proxy_addr);
        })
    }else{
        app.clearProxy();
    }
});

app.getFilter(function(filter) {
});

app.changeUA = function(tabId) {
    console.log('tabid: ' + tabId);
    // 1. Attach the debugger
    chrome.debugger.attach({tabId: tabId}, '1.2', function() {
        if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError.message);
            return;
        }
        // 2. Debugger attached, now prepare for modifying the UA
        chrome.debugger.sendCommand({
            tabId:tabId
        }, "Network.enable", {}, function(response) {
            if (chrome.runtime.lastError)
                console.log(chrome.runtime.lastError.message);
            // Possible response: response.id / response.error
            // 3. Change the User Agent string!
            var ua_with_filter = app.ua + '(((' + g_filter + ')))';
            console.log(ua_with_filter);
            chrome.debugger.sendCommand({
                tabId:tabId
            }, "Network.setUserAgentOverride", {
                userAgent: ua_with_filter
            }, function(response) {
                if (chrome.runtime.lastError)
                        console.log(chrome.runtime.lastError.message);
                // Possible response: response.id / response.error
                // 4. Now detach the debugger (this restores the UA string).
                //chrome.debugger.detach({tabId:tabId});
            });
        });
    });	
}

// 添加http
chrome.webRequest.onBeforeSendHeaders.addListener(function (info) {
    var headers = info.requestHeaders;
    if (g_state) {
        var is_setcid = false;
        for (var i = 0; i < headers.length; ++i) {
            if (headers[i].name === 'BMHSetCid') {
                is_setcid = true
                break;
            }
        }
        if(!is_setcid)
        {
            headers.push({'name': 'BMHSelection', 'value': g_filter});
        }

        if(app.mode==='bind')
        {
            headers.push({'name': 'BMHClientID', 'value': app.getCID()});
        }
    }
    /*  */
    return {"requestHeaders": headers};
}, {"urls" : ["<all_urls>"]}, ["blocking", "requestHeaders"]);

// chrome.tabs.onCreated.addListener(function(tab){
//     // console.log(JSON.stringify(details));
//     app.changeUA(tab.id);
// });

// chrome.webNavigation.onBeforeNavigate.addListener(function(details){
//     // console.log(JSON.stringify(details));
//     app.changeUA(details.tabId);
// });
