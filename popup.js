var backgroundPage;

function changeState(state) {
    backgroundPage.app.changeState( state ? 'on' : 'off');
    if (state){ $('.proxy-settings').show(); } else { $('.proxy-settings').hide(); }
    $('#switch_btn').bootstrapSwitch('state', state);
}

// 生成BMHSelection
function update_proxy_filter() {
    var fetch_type = $('#fetch_type').selectpicker('val');
    var fetch_country = $('#fetch_country').selectpicker('val');
    var fetch_mode = $('#fetch_mode').selectpicker('val');
    // console.log(fetch_country);
    backgroundPage.app.updateFilter({
        'fetch_type': fetch_type, 
        'fetch_country': fetch_country, 
        'fetch_mode': fetch_mode,
        'backend_proxy': $('#proxy_bind_address').text(),
    })
}

function build_cid_filter()
{
    var fetch_type = $('#fetch_type').selectpicker('val');
    var fetch_country = $('#fetch_country').selectpicker('val');
    var filter = "G=1";
    filter += "&" + fetch_type + '=1';
    if(fetch_country!="ALL" && fetch_country!="RAW") { //不要提供country
        filter += "&Country=" + fetch_country;
    }
    return filter;
}

// 重新生成后端地址
function fresh_backend_proxy() {
    update_proxy_filter();
    $('#proxy_bind_address').text('Fetch proxy address...');
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "http://ip.bmh.im", true);
    xhr.setRequestHeader("BMHSetCid", backgroundPage.app.getCID()); //本请求用于设置id（包括connect请求）
    var filter = build_cid_filter();
    xhr.setRequestHeader("BMHSelection", filter);
    xhr.setRequestHeader("BMHClientID", backgroundPage.app.getCID());
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            var backend_proxy = xhr.getResponseHeader("BMHBackendServer")
            $('#proxy_bind_address').text(backend_proxy);
            backgroundPage.app.setBackendProxy(backend_proxy);

            update_proxy_filter();
            close();
        }
    }
    xhr.send();
}

$(document).ready(function(){
    backgroundPage = chrome.extension.getBackgroundPage();

    // alert(backgroundPage.app.ua);

    $("#switch_btn").bootstrapSwitch();
    
    $('#switch_btn').on('switchChange.bootstrapSwitch', function (event, state) {
        changeState(state);
    }); 

    // 设置按钮
    $('#btn_set').on('click', function(){
        if($('#switch_btn').bootstrapSwitch('state'))
        {
            backgroundPage.app.setProxyAddr($('#proxy_address').val());

            if($('#fetch_mode').selectpicker('val').toLowerCase() === "bind"
                && $('#proxy_bind_address').text().length == 0) 
            {
                fresh_backend_proxy();
            }
            else {
                update_proxy_filter();
                close();
            }
        }
        else {
            close();
        }
    })

    $('#btn_cancel').on('click', function(){
        close();
    })

    $('#fresh_client_id').on('click', function(){
        backgroundPage.app.updateCID();
        fresh_backend_proxy();
    })

    $('#fetch_mode').on('changed.bs.select', function () {
        if($('#fetch_mode').selectpicker('val').toLowerCase() === 'bind') {
            $('#proxy_bind_address').show();
            backgroundPage.app.getBackendProxy(function(proxy_bind_address) {
                console.log(proxy_bind_address);
                if(proxy_bind_address)
                {
                    $('#proxy_bind_address').text(proxy_bind_address);
                }
            });
        } else {
            $('#proxy_bind_address').hide();
        }
    });

    // 设置初始状态
    $('.title').text(chrome.i18n.getMessage("title"));
    $('.proxy_on').text(chrome.i18n.getMessage("proxy_on"));
    $('.proxy_address').text(chrome.i18n.getMessage("proxy_address"));
    $('.filter').text(chrome.i18n.getMessage("filter"));
    $('.fetch_type').text(chrome.i18n.getMessage("fetch_type"));
    $('.fetch_country').text(chrome.i18n.getMessage("fetch_country"));
    $('.fetch_mode').text(chrome.i18n.getMessage("fetch_mode"));
    $('.ok').text(chrome.i18n.getMessage("ok"));
    $('.close_cap').text(chrome.i18n.getMessage("close_cap"));
    backgroundPage.app.getState(function(state) {
        changeState(state);
    });

    backgroundPage.app.getProxyAddr(function(proxy_address) {
        if(!proxy_address)
        {
            proxy_address = "http://127.0.0.1:5681";
        }
        $('#proxy_address').val(proxy_address);
    });
    backgroundPage.app.getFilter(function(proxy_filter) {
        if(proxy_filter) {
            var params = proxy_filter.split('&');
            var [fetch_type,_] = params[0].split('=');
            $('#fetch_type').selectpicker('val', fetch_type);
            if (params[1])
            {
                var [_,fetch_country] = params[1].split('=');
                $('#fetch_country').selectpicker('val', fetch_country);
            }
            if (params[2])
            {
                var [_,fetch_mode] = params[2].split('=');
                $('#fetch_mode').selectpicker('val', fetch_mode);
                $('#fetch_mode').trigger('changed.bs.select');
            }
        }
    });
    
})