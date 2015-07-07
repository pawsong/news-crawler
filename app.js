'use strict';

var mongoose = require('mongoose');
var fs = require('fs');
var mkdirp = require('mkdirp');
var request = require('request');
var cheerio = require('cheerio');
var md5 = require('MD5');
var Iconv  = require('iconv').Iconv;
var iconv = new Iconv('EUC-KR', 'UTF-8');

var Article = require('./articlemodel.js');

var sources = require('./sources');

var sourceId = '';
process.argv.forEach(function(val, index, array) {
  if (val.indexOf('source') === 0) {
    sourceId = val.substr(7);
  }
});

var murl = 'localhost';
process.argv.forEach(function(val, index, array) {
  if (val.indexOf('murl') === 0) {
    murl = val.substr('murl'.length + 1);
  }
});

var source = sources(sourceId);

mkdirp.sync(__dirname + '/.cache');

var cacheFile = __dirname + '/.cache/p_' + sourceId;

var co = require('co');

var reqget = {
  utf8: function (url) {
    return function (done) {
      request.get({
        uri: url,
        encoding: null,
      }, function (err, res, body) {
        if (err) { return done(err); }
        body = body.toString();
        var $ = cheerio.load(body);
        done(null, $);
      });
    };
  },
  euc_kr: function (url) {
    return function (done) {
      request.get({
        uri: url,
        encoding: null,
      }, function (err, res, body) {
        if (err) { return done(err); }
        body = iconv.convert(body).toString();
        var $ = cheerio.load(body);
        done(null, $);
      });
    };
  }
};

co(function* () {

  yield function (done) {
    mongoose.connect('mongodb://'+murl+'/gnews', done);
  };

  function* processList(p) {

    fs.writeFileSync(cacheFile, p);

    var url = source.url(p);

    console.log('Request list: ', url);

    var $list = yield reqget[source.encoding](url);

    var links = source.parseList($list);

    for (let i = 0; i < links.length; ++i) {

      let link = links[i];

      console.log('Request articles', link);
      let $article = yield reqget[source.encoding](link);

      let ret = source.parseArticle($article);

      if (!ret) { continue; }

      let rawId = [
        sourceId,
        ret.date.format('YYYY_MM_DD'),
        ret.title,
      ].join('_');

      let id = md5(rawId);

      yield Article.findOneAndUpdate({
        article_id: id,
      }, {
        article_id: id,
        sourceId: sourceId,
        press: source.press,
        category: source.category,
        title: ret.title,
        date: ret.date.toDate(),
        body: ret.body,
        url: link,
      }, { upsert: true });

      console.log('Result: ', rawId);
    }

    yield processList(source.next(p));
  }

  var p = fs.existsSync(cacheFile) ? fs.readFileSync(cacheFile) : '1';
  p = parseInt(p, 10);

  yield processList(p);
}).catch(function (err) {
  console.error(err);
  console.error('exit in 5 seconds...');
  setTimeout(function () {
    process.exit(1);
  }, 1000 * 5);
});
