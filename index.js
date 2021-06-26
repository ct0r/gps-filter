const url = "http://localhost:8080";

async function init() {
  const id = "run-1624717795720";
  const rawData = await loadRawData(id);
  const garminData = await loadGarminData(id);

  const kalman = new Kalman();
  const filteredData = rawData.map((event) => {
    kalman.map(event);

    return {
      date: kalman.date,
      latitude: kalman.latitude,
      longitude: kalman.longitude,
    };
  });

  const rawModel = getModel(rawData);
  const garminModel = getModel(garminData);
  const filteredModel = getModel(filteredData);
  console.log("raw distance", rawModel.distance);
  console.log("filtered distance", filteredModel.distance);
  console.log("garmin distance", garminModel.distance);

  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 16,
    center: { lat: rawData[0].latitude, lng: rawData[0].longitude },
  });

  drawLine(map, rawData, "#FF0000");
  drawLine(map, filteredData, "#0000FF");
  drawLine(map, garminData, "#E55300");
}

async function loadRawData(id) {
  const text = await fetch(`${url}/data/${id}.csv`).then((res) => res.text());

  return text
    .split("\n")
    .filter((line) => line)
    .map((line) => line.split(";"))
    .flatMap((cols) => ({
      date: parseInt(cols[0]),
      latitude: parseFloat(cols[2]),
      longitude: parseFloat(cols[3]),
      accuracy: parseFloat(cols[4]),
      elevation: parseFloat(cols[5]),
      elevationAccuracy: parseFloat(cols[6]),
      speed: parseFloat(cols[7]),
      speedAccuracy: parseFloat(cols[8]),
      bearing: parseFloat(cols[9]),
      bearingAccuracy: parseFloat(cols[10]),
    }));
}

async function loadGarminData(id) {
  const data = await fetch(`${url}/data/${id}.geojson`).then((res) =>
    res.json()
  );

  return data.features[0].geometry.coordinates[0].map(
    ([longitude, latitude]) => ({
      latitude,
      longitude,
    })
  );
}

function drawLine(map, events, color) {
  new google.maps.Polyline({
    path: events.map(({ latitude, longitude }) => ({
      lat: latitude,
      lng: longitude,
    })),
    geodesic: true,
    strokeColor: color,
    strokeOpacity: 1.0,
    strokeWeight: 2,
  }).setMap(map);
}

function getModel(events) {
  return events.reduce((model, event) => model.add(event), new Model());
}

class Kalman {
  qMps = 3;
  date;
  latitude;
  longitude;
  variance;

  map({ date, latitude, longitude, accuracy }) {
    if (this.date) {
      let timeIncrement = date - this.date;
      let variance =
        this.variance + (timeIncrement * this.qMps * this.qMps) / 1000;
      let gain = variance / (variance + accuracy * accuracy);

      this.latitude += gain * (latitude - this.latitude);
      this.longitude += gain * (longitude - this.longitude);
      this.variance = (1 - gain) * variance;
    } else {
      this.latitude = latitude;
      this.longitude = longitude;
      this.variance = accuracy * accuracy;
    }

    this.date = date;
  }
}

class Model {
  latitude;
  longitude;
  distance = 0;

  add({ latitude, longitude }) {
    if (this.latitude && this.longitude) {
      this.distance += getDistance(
        this.latitude,
        this.longitude,
        latitude,
        longitude
      );
    }

    this.latitude = latitude;
    this.longitude = longitude;

    return this;
  }
}

const earthRadius = 6371000.0;
const degreesToRadians = Math.PI / 180;

function getDistance(fromLatitude, fromLongitude, toLatitude, toLongitude) {
  var dLat = (toLatitude - fromLatitude) * degreesToRadians;
  var sLat = (toLatitude + fromLatitude) * degreesToRadians;
  var dLng = (toLongitude - fromLongitude) * degreesToRadians;

  return (
    Math.sqrt(Math.pow(dLng * Math.cos(sLat / 2), 2) + dLat * dLat) *
    earthRadius
  );
}
