import { queue, options } from './core';
import { alert, BsType } from './alert';

$.fn.formSubmit = function(success, error) {
    var form = this;
    var data = new FormData(this[0]);
    var submit = form.find('[js-submit=true],[type=submit]').attr('disabled', 'disabled');
    var icon = submit.find('i.fa');
    var css = icon.attr('class');
    icon.attr('class', 'fa fa-spinner fa-spin');
    $.ajax({
        type: "POST",
        url: form.attr('action') || location.href,
        contentType: false,
        processData: false,
        data: data,
        headers: getHeaders(),
        success: function(d) {
            submit.removeAttr('disabled').find('i.fa').attr('class', css);
            if (success && success(d, form)) { return; }
            if (d.message) {
                alert(d.message, d.type, function() {
                    if (d.data && d.data.url)
                        location.href = d.data.url;
                    else if (d.type === BsType.Success)
                        location.href = location.href;
                });
            }
        },
        error: function(e) {
            submit.removeAttr('disabled').find('i.fa').attr('class', css);
            onErrorHandler(e, error);
        }
    });
    return false;
};

function onErrorHandler(e, error) {
    if (error && error(e))
        return;
    if (e.status == 404) { //404用于处理为找到对象提示。
        var text = $.trim(e.responseText);
        if (text) {
            alert(text);
            return;
        }
    }
    var status = options.status[e.status]
    if (status) {
        alert(status, BsType.Error);
        return;
    } else {
        console.error(e.responseText);
        alert(options.unknownError, BsType.Error);
    }
};

function getHeaders() {
    var token = $('#ajax-protected-form').find('[name="__RequestVerificationToken"]');
    if (token.length == 0)
        return {};
    return { 'RequestVerificationToken': token.val() };
};

export function ajax(url, data, success, error) {
    $('#js-loading').fadeIn();
    $.ajax({
        url: url,
        data: data,
        dataType: 'JSON',
        type: 'POST',
        headers: getHeaders(),
        success: function(d) {
            $('#js-loading').fadeOut();
            var callback = d.data && success;
            if (d.message && d.type)
                alert(d.message, d.type, d.type === BsType.Success && !callback);
            if (callback)
                success(d.data);
            else if (d.type === BsType.Success && d.data && d.data.affected)
                location.href = location.href;
        },
        error: function(e) {
            $('#js-loading').fadeOut();
            onErrorHandler(e, error);
        }
    });
};

function ajaxAction(current, url, action, ids) {
    var message = current.jsAttr('confirm');
    if (message && !window.confirm(message))
        return false;
    //post
    if (action == 'post') {
        var data = current.jsAttrs('data');
        if (ids) { data['ids'] = ids; }
        ajax(url, data);
        return false;
    }
    //get
    if (ids) {
        if (url.indexOf('?') == -1)
            url += '?id=';
        else
            url += '&id=';
        url += ids.join(',');
    }
    //modal
    if (action == 'modal') {
        current.loadModal(url);
        return false;
    }
    location.href = url;
    return false;
}

queue(context => {
    //action
    $('[js-action]', context).exec(current => {
        var action = current.jsAttr('action').trim();
        var url = current.jsAttr('url') || current.attr('href');
        if (!url) {
            url = action;
            action = 'post';
        }
        action = action.toLowerCase();
        if (!url) {
            throw new Error(options.ajax.notFoundUrl);
        }
        current.click(function() {
            return ajaxAction(current, url, action);
        });
    });
    //actionbar
    $('.data-view', context).exec(current => {
        var actionbar = $(current.jsAttr('actionbar'), context);
        $('[js-checked]', actionbar).exec(cur => {
            var action = cur.jsAttr('checked').trim();
            var url = cur.jsAttr('url') || cur.attr('href');
            if (!url) {
                url = action;
                action = 'post';
            }
            action = action.toLowerCase();
            if (!url) {
                throw new Error(options.ajax.notFoundUrl);
            }
            cur.click(function() {
                var ids = current.find('.data-content').checkedVal();
                if (ids.length == 0) {
                    alert(options.ajax.selectedFirst);
                    return false;
                }
                return ajaxAction(cur, url, action, ids);
            });
        });
    });
    //脚本提交表单
    $('[js-submit]', context).exec(current => {
        var selector = current.attr('js-submit');
        if (selector == 'true')
            selector = current.parents('form');
        else
            selector = $(selector);
        if (selector.length > 0)
            current.click(function() {
                selector.formSubmit();
                return false;
            });
    });
    //脚本提交自己
    $('[js-vsubmit]', context).exec(current => {
        var url = current.attr('js-vsubmit');
        var eventName = current.jsAttr('vsubmit-event');
        if (!eventName) {
            if (current.is('select'))
                eventName = 'change';
            else if (current.is('[type=checkbox]') || current.is('[type=radio]'))
                eventName = 'click';
            else
                eventName = 'blur';
        }
        current.on(eventName, function() {
            var data = current.jsAttrs('data');
            data.value = current.val();
            ajax(url, data);
        });
    });
});