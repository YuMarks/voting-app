var express = require('express');
var app = express();
var url = require('url');
require('dotenv').config();
var port = 8080;
var http = require('http');
var path = require('path');
var bodyParser = require('body-parser'); //Parse incoming request bodies under req.body
var cookieParser =require('cookie-parser');// populate req.cookies
var passport = require('passport'); //authentication middleware
var passportLocal = require('passport-local'); //Passport strategy for authenticating with a username and password.
var session = require('express-session'); //stores session data on server
var GithubStrategy = require('passport-github').Strategy;
var methodOverride = require('express-method-override');
var mongoose = require('mongoose');
var sassMiddleware = require('node-sass-middleware');
var dbInfo = process.env.MONGOLAB_URI;


var urlCurrent = '';
var voteId;
var auth = require('./routes/auth.js');

mongoose.connect(dbInfo);
var Schema = mongoose.Schema;
mongoose.Promise = global.Promise; //got a depreciation warning even though not using a promise
var sort_by = function(field){
   //field is value to sort by
   return function (a,b) {
   var key = function (x) {return x[field]};
   var A = key(a), B = key(b);
   
	  return ( (A < B) ? -1 : ((A > B) ? 1 : 0) );                  
   };
};

var pollSchema = new Schema({
    voteIdAllow: [], 
    desc: String,
    results: [],
    createdBy: String,
    date: Number
});
var Poll = mongoose.model('Poll', pollSchema);

    var pollArr = [];
    pollArr = [];
    var pollMap = {};
    Poll.find({}, function(err, polls){
    if(err) throw err;
        polls.forEach(function(poll){
        pollMap['date'] =  poll.date;
        pollMap['id'] = poll.id;
        pollMap['desc'] = poll.desc;
        pollArr.push(pollMap);
        pollMap = {};
    });
pollArr.sort(sort_by('id')).reverse();

    });


// Creates array containing poll info to be displayed and sorts by date created
function createPollArr(){
    pollArr = [];
    pollMap = {};
    Poll.find({}, function(err, polls){
    if(err) throw err;
        polls.forEach(function(poll){
        pollMap['date'] =  poll.date;
        pollMap['id'] = poll.id;
        pollMap['desc'] = poll.desc;
        pollArr.push(pollMap);
        pollMap = {};
    });
pollArr.sort(sort_by('id')).reverse();
})}
/* Commented this next part out since I don't need a new seasons poll added everytime run
var season = new Poll({
   voteIdAllow: [{voteIdTag: 1}],
   desc: "Zim, Dim, or Gaz?",
   results: [{id:"Zim", votes:0}, {id:"Dim", votes: 0}, {id:"Gaz", votes: 0}],
   createdBy: 'Woo'
}); 

season.save(function(err){
    if(err) throw err;
   console.log('Poll saved successfully'); 
});  */


//app.use(methodOverride());
app.use(cookieParser()); //must be used first, populates req.cookies
app.use(session({ //for persistent login
    secret: process.env.MY_SECRET, //used to hash the session
    }));
app.use(passport.initialize()); //authentication middleware
app.use(passport.session());
passport.use(new GithubStrategy({ //authenticate using GitHub 
  clientID: process.env.GITHUB_KEY,
  clientSecret: process.env.GITHUB_SECRET,
  callbackURL: 'https://voting-app-ymarks.c9users.io/auth/github/callback'
}, function(accessToken, refreshToken, profile, done){
  done(null, {
    accessToken: accessToken,
    profile: profile
  });
}));

passport.serializeUser(function(user, done) { //translates data into storable format
  done(null, user);
});

passport.deserializeUser(function(user, done) { // extrancts data
  done(null, user);
});

app.get('/auth/github',  
passport.authenticate('github'));

app.get('/auth/github/callback', 
  passport.authenticate('github', { failureRedirect: '/login' }), //goes to Git Hub login page if failed to authenticate
  function(req, res) {
     
  if(req.session.userID){  // logout 
      req.session.userID = undefined;
      res.redirect('/');
  }
      
      var userID = req.user.profile.id;
      req.session.userID = userID;  
      var lastPageVisited = req.headers.referer;
      req.session.lastPageVisited = lastPageVisited;
      
    // successful login, redirect to lastPageVisited
    if(req.session.lastPageVisited === undefined){
        res.redirect('/');
        }else{
            res.redirect(req.session.lastPageVisited);
            }
  });


app.use(sassMiddleware({  // allows a sass file to be used and automatically generates a css file
      src: path.join(__dirname, 'views'),
      dest: path.join(__dirname, 'views'),
      debug: true,
      indentedSyntax: true,
      outputStyle: 'compressed',
      prefix: '/stylesheets'
}));
app.use(express.static(path.join(__dirname, 'views')));  

app.use(bodyParser.urlencoded({extended: false}));  //read HTTP POST data, stored in req.body
// configure app    
app.set('view engine', 'ejs'); 
app.set('views', path.join(__dirname, 'views'));

app.get('/', function(req, res){  //serve login page
    res.render('indexvote',
    {title: 'Vote Here!',
    items: pollArr,
    userID: req.session.userID,  
    });
});   


app.get('/addPoll', function(req, res){
  if(!req.session.userID){
      res.redirect('/auth/github');
   }else {
    res.render('addPoll');
   }
});

app.get('/displayPoll/:version', function(req, res){ //get id of poll from url
    var cookie = req.cookies.cookieName;
    voteId = req.cookies.cookieName;
    console.log(cookie);
  if (cookie === undefined)
  {
    // no: set a new cookie
    var randNum=Math.random().toString(); // generates a decimal
    randNum=randNum.substring(2,randNum.length); // removes two place so no longer decimal
    //maxAge = server time + milliseconds. httpOnly ensures cookie is only accessed by server
    res.cookie('cookieName',randNum, { maxAge: 900000, httpOnly: true });
    
  } 
 
   var id = req.params.version;
   urlCurrent = id;
   
   Poll.findById(id, function (err, docs){ //search database for document
      if(err) throw err;
      
     var findIt = false; 
     for(var i = 0; i < docs.voteIdAllow.length; i++){
         if(docs.voteIdAllow[i].voteIdTag == voteId){
             findIt = true;  // user has already voted, 
         }
     }
      
       res.render('displayPoll',
        {
        items: docs,
        userID: req.session.userID,
        findIt: findIt
    });
      
     
   });
  
});

app.get('/myPolls', function(req, res){  //user can view polls they created
    if(!req.session.userID){
      res.redirect('/auth/github');
   }
    var myPollsArr = []; 
    Poll.find({'createdBy': req.session.userID}, function(err, polls){
        if(err) throw err;
        polls.forEach(function(poll){
        var myPollsObj ={};
        myPollsObj['id'] = poll.id;
        myPollsObj['desc'] = poll.desc;
        myPollsArr.push(myPollsObj);
    });       
        myPollsArr.sort(sort_by('id')).reverse();    
            res.render('myPolls',
            {title: 'Polls you created',
            items: myPollsArr,
            userID: req.session.userID,
            });
    });
});

app.post('/add', function(req, res){
    // Gets index number of voted item and updates it in database
    var votedItem = req.body.selectpicker;
    votedItem = Number(votedItem);
    var i = votedItem;
    var update = {"$inc": {} , "$push": {} };  //create array to send to update method
    if(req.body.option){
     update["$push"]["results."+i+".id"] = req.body.option;    
    }
    update["$inc"]["results."+i+".votes"] = 1;
    update["$push"]["voteIdAllow"] = {voteIdTag: voteId};
   
     
    
    
 Poll.findByIdAndUpdate(urlCurrent,update, function (err, docs){
      if(err) throw err;
      });
      res.redirect('/displayPoll/'+ urlCurrent);
      
   });
    
app.post('/addPoll', function(req, res){    //create a poll (if logged in only)
   var desc = req.body.pollName;
   var results = [];
   var optionArr = {}; 
   var tempArr = [];
   tempArr.push(req.body.option1, req.body.option2);
   if(req.body.option != undefined){ //if another option is added past two default fields, push into array
    tempArr.push(req.body.option);
   }
  for(var i = 0; i< tempArr.length; i++){
      optionArr['id'] = tempArr[i];
      optionArr['votes'] = 0;
      results.push(optionArr);
      optionArr = {};
  }
  
   var season = new Poll({
   voteIdAllow: [{voteIdTag: 1}],
   desc: desc,
   results: results,
   createdBy: req.session.userID,
   date: new Date().getTime()
}); 

season.save(function(err){
    if(err) throw err;
   
   createPollArr();
   
});
  
   res.redirect('/');
   
   
});
   
app.post('/deletePoll/:version', function(req, res){ 
    
    var delPoll = req.params.version;
    Poll.findByIdAndRemove(delPoll, function (err, docs){
        if (err) throw err;
    });
    createPollArr();  // recreate pollArr so order is correct
    res.redirect('/myPolls');
});

app.listen(port, function(){
    console.log('Node.js listening on port ' + port + '...');
    
});
