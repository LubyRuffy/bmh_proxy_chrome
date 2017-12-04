// 唯一的导出对象
var app = {state: false, ua: navigator.userAgent, type: 'proxy', mode: 'random', cid: '0', backend_proxy: '', backend_proxy_country: '', filter: ''};

// 解析参数
app.parseQuery = function(queryString) {
    var query = {};
    var pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split('=');
        query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
    }
    return query;
}

// 访问URL
app.fetch_url = function(url, filter, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.setRequestHeader("BMHSetCid", app.getCID()); //本请求用于设置id（包括connect请求）
    xhr.setRequestHeader("BMHSelection", filter);
    xhr.setRequestHeader("BMHClientID", app.getCID());
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            callback(xhr);
        }
    }
    xhr.send();
}

// 状态
app.changeState = function(state) {
    chrome.storage.sync.set({'state': state});
    if(!state) app.clearProxy();
    app.updateState(state);
} ;

app.updateState = function(state){
    app.state = state;
    app.updateBadge();
}

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
app.setBackendProxyCountry = function(backend_proxy_country) {
    app.backend_proxy_country = backend_proxy_country;
    chrome.storage.sync.set({'backend_proxy_country': backend_proxy_country});
    app.updateBadge();
};

app.setBackendProxy = function(backend_proxy_addr) {
    if(backend_proxy_addr) {
        if(app.backend_proxy != backend_proxy_addr) {
            app.backend_proxy = backend_proxy_addr;
            chrome.storage.sync.set({'backend_proxy': backend_proxy_addr});
            app.fetch_url('http://ip.bmh.im/cc', app.filter, function(xhr) {
                app.setBackendProxyCountry(xhr.responseText);
            })
        }
    }
} ;

// 在state发生变化，或者mode发生变化的情况下都需要调用
app.updateBadge = function() {
    chrome.browserAction.setBadgeBackgroundColor({color: app.state ? '#00ff00' : '#ff0000'});

    if(!app.state){
        chrome.browserAction.setBadgeText({text: app.state ? 'on' : 'off'});
    }
    else if(app.type === 'tor') {
        chrome.browserAction.setBadgeText({text: app.type});
    }
    // else if(app.type === 'ssh') {
    //     chrome.browserAction.setBadgeText({text: app.backend_proxy_country.length>0 ? app.backend_proxy_country : app.type});
    // }
    else if(app.mode === 'bind') {
        chrome.browserAction.setBadgeText({text: app.backend_proxy_country.length>0 ? app.backend_proxy_country : app.type});
    }
    else {
        chrome.browserAction.setBadgeText({text: app.state ? 'on' : 'off'});
    }
}; 

app.updateMode = function(mode) {
    app.mode = mode;
    app.updateBadge();
};

app.updateType = function(type) {
    app.type = type;
    app.updateBadge();
};

// 过滤器
app.updateFilter = function(proxy_filter){
    app.filter = proxy_filter;
    // console.log('updateFilter: filter='+proxy_filter);
    var filter_obj = app.parseQuery(app.filter);
    // console.log('updateFilter: '+JSON.stringify(filter_obj));
    app.updateMode(filter_obj.Mode.toLowerCase());
    // console.log('updateFilter: type='+Object.keys(filter_obj)[0].toLowerCase());
    app.updateType(Object.keys(filter_obj)[0].toLowerCase());
}

app.setFilter = function(proxy_filter) {
    chrome.storage.sync.set({'proxy_filter': proxy_filter});
    app.updateFilter(proxy_filter);
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

app.setFilterFromObj = function(info) {
    var filter = app.build_filter(info);
    app.setFilter(filter);
};

  
// 修改ua
// app.changeUA = function(tabId) {
//     console.log('tabid: ' + tabId);
//     // 1. Attach the debugger
//     chrome.debugger.attach({tabId: tabId}, '1.2', function() {
//         if (chrome.runtime.lastError) {
//             console.log(chrome.runtime.lastError.message);
//             return;
//         }
//         // 2. Debugger attached, now prepare for modifying the UA
//         chrome.debugger.sendCommand({
//             tabId:tabId
//         }, "Network.enable", {}, function(response) {
//             if (chrome.runtime.lastError)
//                 console.log(chrome.runtime.lastError.message);
//             // Possible response: response.id / response.error
//             // 3. Change the User Agent string!
//             var ua_with_filter = app.ua + '(((' + app.filter + ')))';
//             console.log(ua_with_filter);
//             chrome.debugger.sendCommand({
//                 tabId:tabId
//             }, "Network.setUserAgentOverride", {
//                 userAgent: ua_with_filter
//             }, function(response) {
//                 if (chrome.runtime.lastError)
//                         console.log(chrome.runtime.lastError.message);
//                 // Possible response: response.id / response.error
//                 // 4. Now detach the debugger (this restores the UA string).
//                 //chrome.debugger.detach({tabId:tabId});
//             });
//         });
//     });	
// }
// chrome.webNavigation.onBeforeNavigate.addListener(function(details){
//     // console.log(JSON.stringify(details));
//     app.changeUA(details.tabId);
// });

// 添加http
chrome.webRequest.onBeforeSendHeaders.addListener(function (info) {
    var headers = info.requestHeaders;
    if (app.state) {
        var is_setcid = false;
        for (var i = 0; i < headers.length; ++i) {
            if (headers[i].name === 'BMHSetCid') {
                is_setcid = true
                break;
            }
        }
        if(!is_setcid)
        {
            headers.push({'name': 'BMHSelection', 'value': app.filter});
        }

        if(app.mode==='bind')
        {
            headers.push({'name': 'BMHClientID', 'value': app.getCID()});
        }
    }
    /*  */
    return {"requestHeaders": headers};
}, {"urls" : ["<all_urls>"]}, ["blocking", "requestHeaders"]);

// BMHBackendServer在失败后会发生变化，这时候需要重新设置后端绑定
chrome.webRequest.onHeadersReceived.addListener(function (info) {
    var headers = info.responseHeaders;
    if(app.mode==='bind')
    {
        for (var i = 0; i < headers.length; ++i) {
            if (headers[i].name === 'BMHBackendServer') {
                app.setBackendProxy(headers[i].value)
                break;
            }
        }
    }
}, {"urls" : ["<all_urls>"]}, ["blocking", "responseHeaders"]);

app.parse_from_storage = function () {
    chrome.storage.sync.get({'state':false, 'proxy_filter': '', 'backend_proxy': '', 'backend_proxy_country':'', 'cid':'0'}, function(r){
        app.changeState(r['state']);
        app.updateFilter(r['proxy_filter']);
        // app.filter = r['proxy_filter'];
        // app.updateMode(app.parseQuery(app.filter).Mode.toLowerCase());
        // app.updateMode(app.parseQuery(app.filter).Mode.toLowerCase());
        app.backend_proxy = r['backend_proxy'];
        app.backend_proxy_country = r['backend_proxy_country'];
        app.cid = r['cid'];

        if(app.state) {
            app.getProxyAddr(function(proxy_addr){
                app.setProxyAddr(proxy_addr);
            })
        }else{
            app.clearProxy();
        }
        app.changeState( app.state );
    });
};

app.init = function() {
    app.parse_from_storage();
};

app.init();