require('dotenv').config()

const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/exercise-track', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const exerciseSchema = new mongoose.Schema({
  description: String,
  duration: {
    type: Number,
    min: 0
  },
  date: {
    type: Date,
    default: () => (new Date())
  }
})

const Exercise = mongoose.model('Exercise', exerciseSchema);

const userSchema = new mongoose.Schema({
  name: String,
  log: [exerciseSchema]
})

const User = mongoose.model('User', userSchema);

function formatUser(savedUser, log = false) {
  let result = {
    username: savedUser.name,
    _id: savedUser.id
  };
  result.count = savedUser.log.length;
  if(log) {
    result.log = savedUser.log;
  }
  return result;
}

app.post('/api/exercise/new-user', async function(req, res) {
  if(!req.body.username) res.sendStatus(400);
  const user = new User({ name: req.body.username });
  let savedUser;
  try {
    savedUser = await user.save();
  } catch(err) {
    res.sendStatus(500);
  }
  res.json(formatUser(savedUser));
})

app.get('/api/exercise/users', async function(req, res) {
  let users;
  try {
    users = await User.find();
  } catch(err) {
    res.sendStatus(500);
  }
  res.json(users.map((user) => (formatUser(user))));
})

app.post('/api/exercise/add', async function(req, res) {
  if(!req.body.userId || !req.body.description || !req.body.duration)
    res.sendStatus(400);
  let user;
  try {
    user = await User.findById(req.body.userId);
  } catch(err) {
    res.sendStatus(404);
  }
  user.log.push(new Exercise({
    description: req.body.description,
    duration: parseInt(req.body.duration, 10),
    date: new Date(req.body.date)
  }));
  let savedUser;
  try {
    savedUser = await user.save();
  } catch(err) {
    res.sendStatus(500);
  }
  res.json(formatUser(savedUser, true));
})

app.get('/api/exercise/log/:userId', async function(req, res) {
  console.log(req.params.userId);
  let user;
  try {
    user = await User.findById(req.params.userId);
  } catch(error) {
    res.sendStatus(404);
  }
  res.json(formatUser(user, true));
})

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
