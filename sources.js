'use strict';

var moment = require('moment');

/*
 * Sources
 */
var datasources = {
  chosun_biz: {
    press: '조선비즈',
    db: 'chosunbiz',
    category: '',
    encoding: 'utf8',
    url: function (p) {
      return 'http://biz.chosun.com/svc/list_in/list_title.html?pn=' + p;
    },
    next: function (p) {
      return p + 1;
    },
    parseList: function ($) {

      var ret = [];

      var $articleList = $('#list_area .title_only');
      if ($articleList.length === 0) { return; }

      $articleList.each(function (index, elem) {
        var $elem = $(elem);
        var $link = $elem.find('#tit a');

        if ($link.length === 0) { return; }

        var link = $link.attr('href');
        if (link.indexOf('premium.chosun.com') !== -1) { return; }

        ret.push('http://biz.chosun.com' + link);
      });

      return ret;
    },

    parseArticle: function ($) {

      // Find title
      var $title = $('#title_text');
      if ($title.length === 0) { return null; }

      var title = $title.text();

      // Find category & subcategory
      var $catCont = $('#content .art_title_2011 > dl');
      var $catImg = $catCont.find('a img');

      var imgSrc = $catImg.length > 0 ? $catImg.attr('src') : '';

      var category = '';

      if (imgSrc === 'http://image.chosun.com/cbz/renewal_2012/news_title_fin.gif') {
        category = '정책 금융';
      } else if (imgSrc === 'http://image.chosun.com/cbz/renewal_2012/news_title_wz.gif') {
        category = 'WeeklyBiz';
      } else {
        category = $catCont.children('dt').text().trim();
      }

      var subcategory = $catCont.children('dd').text().trim();

      // Find writer
      var $writer = $('#j1');
      $writer.find('div').remove();
      var writer = $writer.text().trim();

      // Find date
      var datetext = $('#date_text').text().trim().substr(5, 21);
      var date = moment(datetext, 'YYYY.MM.DD HH:mm');

      if (!date.isValid()) { throw new Error('Invalid date: ' + datetext); }

      // Find body
      var $newsbody = $('#article_2011');
      $newsbody.find('.date_ctrl_2011').remove();
      $newsbody.find('style').remove();
      $newsbody.find('script').remove();

      var body = $newsbody.text().trim();

      return {
        title: title,
        date: date,
        body: body,
        writer: writer,
        category: category,
        subcategory: subcategory,
      };
    }

  },
  chosun_pol: {
    press: '조선일보',
    category: '정치',
    encoding: 'euc_kr',
    url: function (p) {
      return 'http://news.chosun.com/svc/list_in/list.html?catid=2&source=1&pn=' + p;
    },
    next: function (p) {
      return p + 1;
    },
    parseList: function ($) {

      var ret = [];

      var $articleList = $('#list_area .article');
      if ($articleList.length !== 0) {
        $articleList.each(function (index, elem) {
          var $elem = $(elem);
          var $link = $elem.find('#tit a');

          if ($link.length === 0) { return; }

          var link = $link.attr('href');
          if (link.indexOf('premium.chosun.com') !== -1) { return; }

          ret.push(link);
        });

      } else {
        $articleList = $('#list_area .list_item');
        if (!$articleList.length === 0) { throw new Error('Empty list'); }

        $articleList.each(function (index, elem) {
          var $elem = $(elem);
          var $link = $elem.find('dt a');

          if ($link.length === 0) { return; }

          var link = $link.attr('href');
          if (link.indexOf('premium.chosun.com') !== -1) { return; }

          ret.push(link);
        });
      }

      return ret;
    },

    parseArticle: function ($) {

      // Find title
      var $title = $('#title_text');
      if ($title.length === 0) {
        $title = $('#news_title_text_id');
      }

      if ($title.length === 0) { return null; }

      var title = $title.text();

      // Find date
      var datetext = $('#date_text').text().trim().substr(5, 21);
      var date = moment(datetext, 'YYYY.MM.DD HH:mm');

      if (!date.isValid()) { throw new Error('Invalid date: ' + datetext); }

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
  chosun_soc: {
    press: '<%= chosun_pol.press %>',
    category: '사회',
    encoding: '<%= chosun_pol.encoding %>',
    url: function (p) {
      return 'http://news.chosun.com/svc/list_in/list.html?catid=3&source=1&pn=' + p;
    },
    next: '<%= chosun_pol.next %>',
    parseList: '<%= chosun_pol.parseList %>',
    parseArticle: '<%= chosun_pol.parseArticle %>',
  },
  donga_pol: {

    press: '동아일보',
    category: '정치',
    encoding: 'utf8',
    url: function (p) {
      return 'http://news.donga.com/List/00?p='+p+'&ymd=&m=NP';
    },
    next: function (p) {
      return p + 16;
    },
    parseList: function ($) {

      var $articleList = $('.articleList');
      if ($articleList.length === 0) {
        throw new Error('empty article list');
      }

      var ret = [];

      $('.articleList').each(function (index, elem) {
        var $elem = $(elem);
        var $link = $elem.find('.title a');

        ret.push($link.attr('href'));
      });

      return ret;
    },

    parseArticle: function ($) {

      // Find title
      var $title = $('.article_title02 h1');

      if ($title.length === 0) { return null; }

      var title = $title.text();

      // Find date
      var datetext = $('.title_foot .date').text().trim();
      var date = moment(datetext, 'YYYY.MM.DD HH:mm:ss');

      if (!date.isValid()) { throw new Error('Invalid date: ' + datetext); }

      // Find body
      var body = '';

      var $newsbody = $('.article_txt');
      $newsbody.children('div').remove();
      $newsbody.children('script').remove();
      $newsbody.children('iframe').remove();
      $newsbody.children('a').remove();
      body = $newsbody.text();

      body = body.trim();

      return {
        title: title,
        date: date,
        body: body,
      };
    }
  },
  donga_soc: {
    press: '<%= donga_pol.press %>',
    category: '사회',
    encoding: '<%= donga_pol.encoding %>',
    url: function (p) {
      return 'http://news.donga.com/List/03?p='+p+'&ymd=&m=NP';
    },
    next: '<%= donga_pol.next %>',
    parseList: '<%= donga_pol.parseList %>',
    parseArticle: '<%= donga_pol.parseArticle %>',
  },
  han_pol: {
    press: '한겨레',
    category: '정치',
    encoding: 'utf8',
    url: function (p) {
      return 'http://www.hani.co.kr/arti/politics/list' + p + '.html';
    },
    next: function (p) {
      return p + 1;
    },
    parseList: function ($) {

      var $articleList = $('.list');
      if ($articleList.length === 0) {
        throw new Error('empty article list');
      }

      var ret = [];

      $articleList.each(function (index, elem) {
        var $elem = $(elem);
        var $title = $elem.find('.article-title');

        if ($title.length === 0) { return; }

        var $link = $title.children('a');
        ret.push('http://www.hani.co.kr' + $link.attr('href'));
      });

      return ret;
    },
    parseArticle: function ($) {

      var $article = $('#contents-article');

      // Find title
      var $title = $article.find('.title');
      var title = $title.text();

      // Find date
      var datetext = $article.find('.date-time').text().trim().substr(4, 16);
      var date = moment(datetext, 'YYYY-MM-DD HH:mm');

      if (!date.isValid()) { throw new Error('Invalid date: ' + datetext); }

      // Find body
      var body = '';

      var $newsbody = $article.find('.article-text');
      body = $newsbody.text();

      body = body.trim();

      return {
        title: title,
        date: date,
        body: body,
      };

    }
  },
  han_soc: {
    press: '<%= han_pol.press %>',
    category: '사회',
    encoding: '<%= han_pol.encoding %>',
    url: function (p) {
      return 'http://www.hani.co.kr/arti/society/list'+p+'.html';
    },
    next: '<%= han_pol.next %>',
    parseList: '<%= han_pol.parseList %>',
    parseArticle: '<%= han_pol.parseArticle %>',
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

