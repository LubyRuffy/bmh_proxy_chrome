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
    console.log(fetch_country);
    backgroundPage.app.updateFilter({'fetch_type': fetch_type, 'fetch_country': fetch_country})
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
            update_proxy_filter();
        }
        close();
    })

    $('#btn_cancel').on('click', function(){
        close();
    })

    // 设置初始状态
    $('.title').text(chrome.i18n.getMessage("title"));
    $('.proxy_on').text(chrome.i18n.getMessage("proxy_on"));
    $('.proxy_address').text(chrome.i18n.getMessage("proxy_address"));
    $('.filter').text(chrome.i18n.getMessage("filter"));
    $('.fetch_type').text(chrome.i18n.getMessage("fetch_type"));
    $('.fetch_country').text(chrome.i18n.getMessage("fetch_country"));
    $('.ok').text(chrome.i18n.getMessage("ok"));
    $('.close_cap').text(chrome.i18n.getMessage("close_cap"));
    backgroundPage.app.getState(function(state) {
        changeState(state);
    });
    backgroundPage.app.getProxyAddr(function(proxy_address) {
        if(!proxy_address)
        {
            proxy_address = "127.0.0.1:5681";
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
        }
    });
    
})