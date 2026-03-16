const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mindmap')
  .then(async () => {
    console.log('Connected to MongoDB');
    const result = await User.deleteMany({});
    console.log(`Deleted ${result.deletedCount} users from the database.`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
