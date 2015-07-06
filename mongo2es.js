'use strict';

var elasticsearch = require('elasticsearch');
var mongoose = require('mongoose');
var request = require('request');

var Article = require('./articlemodel.js');
var co = require('co');

var esidx = '';
process.argv.forEach(function(val, index, array) {
  if (val.indexOf('esidx') === 0) {
    esidx = val.substr('esidx'.length + 1);
  }
});

var esurl = '';
process.argv.forEach(function(val, index, array) {
  if (val.indexOf('esurl') === 0) {
    esurl = val.substr('esurl'.length + 1);
  }
});

if (!esidx) {
  throw new Error('esidx must be given');
}

if (!esurl) {
  esurl = 'localhost:9200';
}

var client = new elasticsearch.Client({
  host: esurl,
});

co(function* () {

  yield function (done) {
    mongoose.connect('mongodb://localhost/gnews', done);
  };

  // Get mongo data
  var cursor = Article.db.collections.articles.find({
    esidx: { $nin: [esidx] }
  });

  for (;;) {
    var ret = yield function (done) {
      cursor.next(done);;
    };

    if (!ret) { break; }

    let idx = yield client.index({
      index: esidx,
      type: 'article',
      id: ret.article_id,
      body: {
        press: ret.press,
        category: ret.category,
        title: ret.title,
        body: ret.body,
        date: ret.date,
      }
    });

    console.log([
      esidx, 'article', idx._id
    ].join('/'), 'indexed...');

    yield Article.findByIdAndUpdate(ret._id, {
      $addToSet: { esidx: esidx }
    });
  }

  console.log('Finish!');
  process.exit(0);

}).catch(function (err) {
  console.error(err);
  console.error('exit in 5 seconds...');
  setTimeout(function () {
    process.exit(1);
  }, 1000 * 5);
});
