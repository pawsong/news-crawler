'use strict';

var moment = require('moment');

/*
 * Sources
 */
var datasources = {
  chosun_pol: {

    press: '조선일보',
    category: '정치',
    url: function (p) {
      return 'http://news.chosun.com/svc/list_in/list.html?catid=2&source=1&pn=' + p;
    },
    next: function (p) {
      return p + 1;
    },
    parseList: function ($) {

      var $articleList = $('#list_area .article');
      if ($articleList.length === 0) {
        throw new Error('empty article list');
      }

      var ret = [];

      $articleList.each(function (index, elem) {
        var $elem = $(elem);
        var $link = $elem.find('#tit a');

        if ($link.length === 0) { return; }

        ret.push($link.attr('href'));
      });

      return ret;
    },

    parseArticle: function ($) {

      // Find title
      var $title = $('#title_text');
      if ($title.length === 0) {
        $title = $('#news_title_text_id');
      }

      var title = $title.text();

      // Find date
      var datetext = $('#date_text').text().trim().substr(5, 21);
      var date = moment(datetext, 'YYYY.MM.DD HH:mm');

      // Find body
      var body = '';

      var $newsbody = $('#article_2011');
      if ($newsbody.length > 0) {
        let $par = $newsbody.find('.par');
        $par.find('style').remove();
        body = $par.text();
      } else {
        $newsbody = $('#news_body_id');
        body = $newsbody.children('p').text();
      }

      body = body.trim();

      return {
        title: title,
        date: date,
        body: body,
      };
    }
  },
};

/*
 * Getter function
 */
module.exports = function (sourceId) {

  var datasource = datasources[sourceId];

  if (!datasource) {
    throw new Error('invalid source id: ' + sourceId, 'error');
  }

  // Parse template
  Object.keys(datasource).forEach(function (key) {
    if (typeof datasource[key] !== 'string') { return; }

    var ret = /<%=(.+)%>/.exec(datasource[key])
    if (!ret) { return; }

    var fields = ret[1].trim().split('.');
    var val = datasources,
        i;

    for (i=0; i < fields.length; ++i) {
      val = val[fields[i]];
      if (val === undefined) {
        throw new Error('invalid template value: ' + fields.join('.'));
      }
    }

    datasource[key] = val;
  });

  return datasource;
};

