var router = require("express").Router();
var mongoose = require("mongoose");
var Point = mongoose.model("Point");
var User = mongoose.model("User");
var auth = require("../auth");

var Promise = global.Promise;

// Preload point objects on routes with ':point'
router.param("point", function(req, res, next, id) {
  Point.findOne({ _id: id })
    .populate("user")
    .then(function(point) {
      if (!point) {
        return res.sendStatus(404);
      }
      req.point = point;
      return next();
    })
    .catch(next);
});

// get all points
router.get("/", auth.optional, function(req, res, next) {
  var query = {};
  var limit = 10;
  var offset = 0;
  Promise.all([
    Point.find(query)
      .limit(Number(limit))
      .skip(Number(offset))
      .sort({ createdAt: "desc" })
      .exec(),
    Point.count(query).exec()
  ])
    .then(function(results) {
      var points = results[0];
      var pointsCount = results[1];

      return res.json({
        points: points.map(function(point) {
          return point.togeoJSONFor();
        }),
        pointsCount: pointsCount
      });
    })
    .catch(next);
});

// create new point
router.post("/", auth.required, function(req, res, next) {
  User.findById(req.payload.id)
    .then(function(user) {
      if (!user) {
        return res.sendStatus(401);
      }
      const { name, coordinates } = req.body.point;

      var point = new Point({ name: name, coordinates: coordinates });

      point.user = user;

      return point.save().then(function() {
        return res.json({ point: point.togeoJSONFor(user) });
      });
    })
    .catch(next);
});

// bulk add points
router.post("/bulk", auth.required, function(req, res, next) {
  User.findById(req.payload.id)
    .then(function(user) {
      if (!user) {
        return res.sendStatus(401);
      }
      var points = req.body.points.map(point => {
        const point_ = {
          user: new mongoose.Types.ObjectId(user._id),
          name: point.name,
          coordinates: point.coordinates
        };
        return point_;
      });

      return Point.insertMany(points).then(function(docs) {
        return res.json({
          points: {
            type: "FeatureCollection",
            features: docs.map(doc => {
              return doc.togeoJSONFor();
            })
          }
        });
      });
    })
    .catch(next);
});

// return a point
router.get("/:point", auth.optional, function(req, res, next) {
  Promise.all([
    req.payload ? User.findById(req.payload.id) : null,
    req.point.populate("admin").execPopulate()
  ])
    .then(function(results) {
      var user = results[0];

      return res.json({ point: req.point.togeoJSONFor(user) });
    })
    .catch(next);
});

// update point
router.put("/:point", auth.required, function(req, res, next) {
  User.findById(req.payload.id).then(function(admin) {
    if (req.point.user._id.toString() === req.payload.id.toString()) {
      if (typeof req.body.point.name !== "undefined") {
        req.point.name = req.body.point.name;
      }
      if (typeof req.body.point.coordinates !== "undefined") {
        req.point.coordinates = req.body.point.coordinates;
      }
      req.point
        .save()
        .then(function(point) {
          return res.json({ point: point.togeoJSONFor(admin) });
        })
        .catch(next);
    } else {
      return res.sendStatus(403);
    }
  });
});

// delete point
router.delete("/:point", auth.required, function(req, res, next) {
  User.findById(req.payload.id)
    .then(function(user) {
      if (!user) {
        return res.sendStatus(401);
      }

      if (req.point.user._id.toString() === req.payload.id.toString()) {
        return req.point.remove().then(function() {
          return res.sendStatus(204);
        });
      } else {
        return res.sendStatus(403);
      }
    })
    .catch(next);
});
module.exports = router;
