exports.callback = function(req, res){
  res.send('Login success');
};

exports.error = function(req, res){
  res.send('Login Failed');
};