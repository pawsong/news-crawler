var fs = require('fs');
var casper = require('casper').create({
  verbose: true,
  logLevel: 'info'
});

if (!casper.cli.has('source')) {
  casper.log('source must be given', 'error');
  casper.exit(1);
}

var sourceId = casper.cli.get('source');

casper.options.clientScripts = [
  './bower_components/momentjs/min/moment.min.js',
  './bower_components/blueimp-md5/js/md5.min.js',
  './bower_components/jquery/dist/jquery.min.js',
];

var esIndex = 'gnews';

var datasources = {
  donga_pol: {
    press: '동아',
    category: '정치',
    url: function (p) {
      return 'http://news.donga.com/List/00?p='+p+'&ymd=&m=NP';
    },
    next: function (p) {
      return p + 16;
    },
    parse: function (done) {

      var $articleList = $('.articleList');
      if ($articleList.length === 0) {
        throw new Error('empty article list');
      }

      $('.articleList').each(function (index, elem) {
        var $elem = $(elem);
        var $title = $elem.find('.title a');
        var $span = $elem.find('.title span');

        var $text = $elem.find('.text');

        var title = $title.text().trim();
        var date = moment($span.text(),  "YYYY-MM-DD HH:mm:ss");
        var body = $text.text().trim();

        done(date, title, body);
      });
    },
  },

  donga_ent: {
    press: '<%= donga_pol.press %>',
    category: '연예',
    url: function (p) {
      return 'http://news.donga.com/List/09?p='+p+'&ymd=&m=NP';
    },
    next: '<%= donga_pol.next %>',
    parse: '<%= donga_pol.parse %>',
  },

  donga_soc: {
    press: '<%= donga_pol.press %>',
    category: '사회',
    url: function (p) {
      return 'http://news.donga.com/List/03?p='+p+'&ymd=&m=NP';
    },
    next: '<%= donga_pol.next %>',
    parse: '<%= donga_pol.parse %>',
  },

  han_pol: {
    press: '한겨레',
    category: '정치',
    url: function (p) {
      return 'http://www.hani.co.kr/arti/politics/list' + p + '.html';
    },
    next: function (p) {
      return p + 1;
    },
    parse: function (done) {

      var $articleList = $('.list');
      if ($articleList.length === 0) {
        throw new Error('empty article list');
      }

      $articleList.each(function (index, elem) {
        var $elem = $(elem);
        var $title = $elem.find('.article-title');

        if ($title.length === 0) { return; }

        var title = $title.text().trim();

        var $prologue = $elem.find('.article-prologue');
        var $date = $prologue.find('.date');
        var date = moment($date.text(),  "YYYY-MM-DD HH:mm");

        if (!date.isValid()) {
          throw new Error('invalid date: ' + $date.text());
        }

        var body = $prologue.find('a').text().trim();

        done(date, title, body);
      });
    },
  },

  han_ent: {
    press: '<%= han_pol.press %>',
    category: '연예',
    url: function (p) {
      return 'http://www.hani.co.kr/arti/culture/entertainment/list'+p+'.html';
    },
    next: '<%= han_pol.next %>',
    parse: '<%= han_pol.parse %>',
  },

  han_soc: {
    press: '<%= han_pol.press %>',
    category: '사회',
    url: function (p) {
      return 'http://www.hani.co.kr/arti/society/list'+p+'.html';
    },
    next: '<%= han_pol.next %>',
    parse: '<%= han_pol.parse %>',
  },

  chosun_pol: {
    press: '조선',
    category: '정치',
    url: function (p) {
      return 'http://news.chosun.com/svc/list_in/list.html?catid=2&source=1&pn=' + p;
    },
    next: function (p) {
      return p + 1;
    },
    parse: function (done) {

      var $articleList = $('#list_area .article');
      if ($articleList.length === 0) {
        throw new Error('empty article list');
      }

      $articleList.each(function (index, elem) {
        var $elem = $(elem);
        var $title = $elem.find('#tit');

        if ($title.length === 0) { return; }

        var title = $title.text().trim();

        var $date = $elem.find('#date');
        var datestr = $date.text();

        if (!datestr) {
          return;
        }

        var date = moment(datestr,  "YYYY.MM.DD");

        if (!date.isValid()) {
          throw new Error('invalid date: ' + $date.text());
        }

        var body = $elem.find('#substract').text().trim();

        done(date, title, body);
      });
    },

  },

  chosun_ent: {
    press: '<%= chosun_pol.press %>',
    category: '연예',
    url: function (p) {
      return 'http://news.chosun.com/svc/list_in/se_list.html?catid=G21&source=1&pn=' + p;
    },
    next: '<%= chosun_pol.next %>',
    parse: '<%= chosun_pol.parse %>',
  },

  chosun_soc: {
    press: '<%= chosun_pol.press %>',
    category: '사회',
    url: function (p) {
      return 'http://news.chosun.com/svc/list_in/list.html?catid=3&source=1&pn=' + p;
    },
    next: '<%= chosun_pol.next %>',
    parse: '<%= chosun_pol.parse %>',
  },

  newsen_bc: {
    press: '뉴스엔',
    category: '연예',
    url: function (p) {
      return 'http://www.newsen.com/news_list.php?code=100100&vm=list&page=' + p;
    },
    next: function (p) {
      return p + 1;
    },
    parse: function (done) {

      var $articleList = $('table[cellspacing="6"] > tbody > tr');
      if ($articleList.length === 0) {
        throw new Error('empty article list');
      }

      $articleList.each(function (index, elem) {
        var $elem = $(elem);
        var $tr = $elem.find('table tr');

        if ($tr.length !== 2) { return; }

        var $upper = $($tr[0]);
        var $lower = $($tr[1]);

        var $td = $upper.find('td');

        if ($td.length !== 2) { return; }

        var title = $($td[0]).text().trim();
        var datestr = $($td[1]).text();

        var date = moment(datestr,  "YYYY-MM-DD HH:mm");

        if (!date.isValid()) {
          throw new Error('invalid date: ' + datestr);
        }

        var body = $lower.text().trim();

        done(date, title, body);
      });
    },
  },

};

var datasource = datasources[sourceId];

if (!datasource) {
  casper.log('invalid source id: ' + sourceId, 'error');
  casper.exit(1);
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

var CACHE_FILE = '.cache/' + sourceId;

function openList (p) {

  // Save last p
  fs.write(CACHE_FILE, p, 'w');

  casper.log('Request page (p=' + p + ')', 'info');

  casper.thenOpen(datasource.url(p), function () {

    casper.log('Page received', 'info');

    var ret = this.evaluate(function (esIndex, sourceId, press, category, parse) {
      try {
        parse = new Function('return ' + parse)();

        parse(function (date, title, body) {

          var rawId = [
            sourceId,
            date.format('YYYYMMDD'),
            title,
          ].join('_');

          var id = md5(rawId);

          var res = $.ajax({
            type: 'POST',
            url: 'http://52.69.103.208:9200/' + esIndex + '/' + sourceId + '/' + id + '/_update',
            data: JSON.stringify({
              doc: {
                title: title,
                body: body,
                timestamp: date.toISOString(),
                press: press,
                category: category,
              },
              doc_as_upsert: true,
            }),
            dataType: 'json',
            async: false,
          });

          // Skip
          if (!res || !res.status) {
            __utils__.log('skipped url: ' + 'http://52.69.103.208:9200/' +
                          esIndex + '/' + sourceId + '/' + id + '/_update', 'warning');
            return;
          }

          if (res.status < 200 || res.status >= 300) {
            throw new Error('Invalid res status: ' + res.status);
          }

          __utils__.log('[' + date.format() + '] (' + id + ') ' + title, 'info');
        });
      } catch (e) {
        return e.message;
      };

      return '';
    }, esIndex, sourceId, datasource.press, datasource.category, datasource.parse.toString());

    if (!ret) {
      return openList(datasource.next(p));
    }

    casper.log('evaluate failed: ' + ret, 'error');
    casper.exit(1);
  });
}

var p;

try {
  p = parseInt(fs.read(CACHE_FILE), 10);

  if (isNaN(p)) {
    p = 1;
  }
} catch(e) {
  p = 1;
}

casper.start();
openList(p);

casper.run();
