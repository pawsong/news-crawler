'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ArticleSchema = new Schema({
  article_id: { type: String, unique: true },
  press: { type: String },
  writer: { type: String },
  category: { type: String },
  subcategory: { type: String },
  title: { type: String },
  date: { type: Date },
  body: { type: String },
  url: { type: String },
  esidx: [],
});

module.exports = mongoose.model('Article', ArticleSchema);
