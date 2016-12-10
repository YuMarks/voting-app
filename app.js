// reference project: https://fcc-voting-arthow4n.herokuapp.com/polls
var dotenv = require('dotenv').config(),
    mongodb = require('mongodb'),
    MongoClient = mongodb.MongoClient,
    http = require('http'),
    port = process.env.PORT || 8080,
    html = '',
    div = '',
    dbInfo = process.env.MONGOLAB_URI;
    
var server = http.createServer(function(req, res){
    MongoClient.connect(dbInfo, function(err, db) {
        if(err){
            console.log(err);
        }else{
            console.log("connection open");
            var poll = {
                question: "What language do you want to learn?",
                choice1: "Spanish",
                choice2: "French"
            };
            var polls = db.collection('polls');
            polls.insert(
                poll,
                function(err, data){
                    if(err){
                        console.log(err);
                        res.end();
                    }else{
                        console.log(data.ops[0].question); //get data
                        html += "<div>" + data.ops[0].question + "</div>";
                        //+ "<div>" + data.ops[0].choice1 + "</div>" + "<div>" + data.ops[0].choice2 + "</div></p>";
                        res.end(html);
                    }
                });
    }
    });
    
    
});
server.listen(port);