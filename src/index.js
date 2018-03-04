var fs = require("fs"),
  express = require("express"),
  bodyParser = require("body-parser"),
  session = require("express-session"),
  cors = require("cors"),
  errorhandler = require("errorhandler"),
  mongoose = require("mongoose"),
  helmet = require("helmet"),
  dotenv = require("dotenv");

var isProduction = process.env.NODE_ENV === "production";

// Create global app object
var app = express();

app.use(helmet());

app.use(cors());

// Normal express config defaults
app.use(require("morgan")("dev"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(require("method-override")());
app.use(express.static(__dirname + "/public"));

app.use(
  session({
    secret: "conduit",
    cookie: { maxAge: 60000 },
    resave: false,
    saveUninitialized: false
  })
);

if (!isProduction) {
  app.use(errorhandler());
  // load dev ENV variables
  dotenv.config();
}

if (isProduction) {
  var sslCA = [fs.readFileSync("mongo.cert")];
  var options = {
    ssl: true,
    sslValidate: true,
    sslCA
  };
  mongoose.connect(process.env.MONGODB_URI, options);
} else {
  mongoose.connect("mongodb://localhost/db_name");
  mongoose.set("debug", true);
}

require("./models/User");
require("./models/Point");
require("./config/passport");

app.use(require("./routes"));

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error("Not Found");
  err.status = 404;
  next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (!isProduction) {
  app.use(function(err, req, res) {
    console.log(err.stack);

    res.status(err.status || 500);

    res.json({
      errors: {
        message: err.message,
        error: err
      }
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res) {
  res.status(err.status || 500);
  res.json({
    errors: {
      message: err.message,
      error: {}
    }
  });
});

// finally, let's start our server...
var server = app.listen(process.env.PORT || 3000, function() {
  console.log("Listening on port " + server.address().port);
});
