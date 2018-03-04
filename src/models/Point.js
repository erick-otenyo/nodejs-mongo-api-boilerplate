import { autoIncrement } from "mongoose-plugin-autoinc";

var mongoose = require("mongoose"),
  uniqueValidator = require("mongoose-unique-validator");

var PointSchema = new mongoose.Schema(
  {
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    coordinates: Array
  },
  { timestamps: true }
);

PointSchema.plugin(uniqueValidator, { message: "is already taken" });

PointSchema.plugin(autoIncrement, {
  model: "Point",
  startAt: 1
});

PointSchema.methods.togeoJSONFor = function() {
  return {
    type: "Feature",
    id: this._id,
    geometry: {
      type: "Point",
      coordinates: this.coordinates
    },
    properties: {
      name: this.name,
      user: this.user
    }
  };
};

mongoose.model("Point", PointSchema);
