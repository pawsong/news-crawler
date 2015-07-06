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

var estype = 'article';

var client = new elasticsearch.Client({
  host: esurl,
});

co(function* () {

  yield function (done) {
    mongoose.connect('mongodb://localhost/gnews', done);
  };

  // If index does not exist, create one
  var ret = yield client.indices.exists({ index: esidx });

  if (!ret) {

    let types = [

      // 체언
      'NNG', // 일반 명사
      'NNP', // 고유 명사
//      'NNB', // 의존 명사
//      'NNBC', // 단위를 나타내는 명사
      'NR', //  수사
//      'NP', //  대명사

      // 용언
//      'VV', //  동사
//      'VA', //  형용사
      'VX', //  보조 용언
      'VCP', // 긍정 지정사
      'VCN', // 부정 지정사

      // 관형사
//      'MM', //  관형사

      // 부사
      'MAG', // 일반 부사
//      'MAJ', // 접속 부사

      // 감탄사
      'IC', //  감탄사

      // 조사
//      'JKS', // 주격 조사
//      'JKC', // 보격 조사
//      'JKG', // 관형격 조사
//      'JKO', // 목적격 조사
//      'JKB', // 부사격 조사
//      'JKV', // 호격 조사
//      'JKQ', // 인용격 조사
//      'JX', //  보조사
//      'JC', //  접속 조사

      // 선어말 어미
      'EP', //  선어말 어미

      // 어말 어미
      'EF', //  종결 어미
      'EC', //  연결 어미
      'ETN', // 명사형 전성 어미
      'ETM', // 관형형 전성 어미

      // 접두사
      'XPN', // 체언 접두사

      // 접미사
//      'XSN', // 명사 파생 접미사
//      'XSV', // 동사 파생 접미사
//      'XSA', // 형용사 파생 접미사

      // 어근
      'XR', //  어근

      // 부호
      'SF', //  마침표, 물음표, 느낌표
      'SE', //  줄임표 …
      'SSO', // 여는 괄호 (, [
      'SSC', // 닫는 괄호 ), ]
      'SC', //  구분자 , · / :
      'SY', //

      // 한글 이외
      'SL', //  외국어
      'SH', //  한자
      'SN', //  숫자

      // 기타
      'COMPOUND', // 복합
    ];

    var stopwords = [
      '말',
      '자',
      '지난',
      '이날',
      '때',
      'document',
      'getelementbyid',
      'height',
      'if',
      'width',
      'artimg',
      'ht',
      'rate',
      'style',
      'var',
      'wd',
    ];

    yield client.indices.create({
      index: esidx,
      body: {
        settings: {
          index: {
            analysis: {
              filter : {
                type_filter: {
                  type: 'keep_types',
                  types: types
                },
                word_filter: {
                  type: 'stop',
                  stopwords: stopwords
                }
              },
              analyzer: {
                korean: {
                  type: 'custom',
                  tokenizer: 'mecab_ko_standard_tokenizer',
                  filter: [
                    'type_filter',
                    'word_filter',
                  ]
                },
              }
            }
          }
        }
      }
    });

    yield client.indices.putMapping({
      index: esidx,
      type: estype,
      body: {
        properties: {
          title: {
            type: 'string',
            index_analyzer: 'korean',
            search_analyzer: 'standard'
          },
          body: {
            type: 'string',
            index_analyzer: 'korean',
            search_analyzer: 'standard'
          },
        }
      }
    });
  }

  // Get mongo data
  var cursor = Article.db.collections.articles.find({
    esidx: { $nin: [esidx] }
  });

  for (;;) {
    ret = yield function (done) {
      cursor.next(done);;
    };

    if (!ret) { break; }

    let idx = yield client.index({
      index: esidx,
      type: estype,
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
      esidx, estype, idx._id
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
