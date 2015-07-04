var casper = require('casper').create();

casper.options.clientScripts = [
  './bower_components/momentjs/min/moment.min.js',
  './bower_components/blueimp-md5/js/md5.min.js',
];

var PRESS = {
  id: 'donga',
  label: '동아일보',
};

var fs = require('fs');
var CACHE_FILE = '.cache/' + PRESS.id;

function openList (c, p) {

  // Save last p
  fs.write(CACHE_FILE, p, 'w');

  c.echo('Request page (p=' + p + ')');

  c.thenOpen('http://news.donga.com/List/00?p='+p+'&ymd=&m=', function () {

    this.echo('Page received');

    var ret = this.evaluate(function (pressId, pressLabel) {

      var $articleList = $('.articleList');
      if ($articleList.length === 0) {
        return false;
      }

      $('.articleList').each(function (index, elem) {
        var $elem = $(elem);
        var $title = $elem.find('.title a');
        var $span = $elem.find('.title span');

        var $text = $elem.find('.text');

        var title = $title.text().trim();
        var date = moment($span.text(),  "YYYY-MM-DD HH:mm:ss");
        var body = $text.text().trim();

        var rawId = [
          pressId,
          title,
          date.format('YYYYMMDD'),
        ].join('_');

        var id = md5(rawId);

        var res = $.ajax({
          type: 'POST',
          url: 'http://52.69.103.208:9200/news/donga/' + id + '/_update',
          data: JSON.stringify({
            doc: {
              title: title,
              body: body,
              //timestamp: date.format('yyyyMMdd\'T\'HHmmss.SSSZ'),
              timestamp: date.toISOString(),
              press: pressLabel,
              category: '정치',
            },
            doc_as_upsert: true,
          }),
          dataType: 'json',
          async: false,
        });

        __utils__.echo(title);
        __utils__.echo(date.format());
        __utils__.echo(res.responseText);
      });

      return true;
    }, PRESS.id, PRESS.label);

    if (ret) {
      return openList(c, p + 16);
    }

    casper.exit();
  });
}

var p;

try {
  p = parseInt(fs.read(CACHE_FILE), 10);
} catch(e) {
  p = 1;
}

openList(casper.start(), p);

casper.run();
