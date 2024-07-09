const mongoose = require('mongoose');
const { peopleSchema } = require('./schemas');

const peopleModel = mongoose.model('People', peopleSchema);

module.exports = {peopleModel };