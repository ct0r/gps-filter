const url = "http://localhost:8080";

async function init() {
  const rawData = await loadCsvData("1624217927");

  const kalman = new Kalman();
  const filteredData = rawData.map((event) => {
    kalman.map(event);

    return {
      date: kalman.date,
      latitude: kalman.latitude,
      longitude: kalman.longitude,
    };
  });

  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 16,
    center: { lat: rawData[0].latitude, lng: rawData[0].longitude },
  });

  new google.maps.Polyline({
    path: rawData.map(({ latitude, longitude }) => ({
      lat: latitude,
      lng: longitude,
    })),
    geodesic: true,
    strokeColor: "#FF0000",
    strokeOpacity: 1.0,
    strokeWeight: 2,
  }).setMap(map);

  new google.maps.Polyline({
    path: filteredData.map(({ latitude, longitude }) => ({
      lat: latitude,
      lng: longitude,
    })),
    geodesic: true,
    strokeColor: "#0000FF",
    strokeOpacity: 1.0,
    strokeWeight: 2,
  }).setMap(map);
}

async function loadCsvData(id) {
  const text = await fetch(`${url}/data/${id}.csv`).then((res) => res.text());

  return text
    .split("\n")
    .filter((line) => line)
    .map((line) => line.split(";"))
    .flatMap((cols) => ({
      date: parseInt(cols[0]),
      latitude: parseFloat(cols[2]),
      longitude: parseFloat(cols[3]),
      elevation: parseFloat(cols[4]),
      accuracy: parseFloat(cols[5]),
    }));
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
