const url = "http://localhost:8080";

async function init() {
  const rawData = await loadCsvData("1624295189");
  console.log(rawData);

  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 12,
    center: { lat: rawData[0].latitude, lng: rawData[0].longitude },
  });

  const rawPath = new google.maps.Polyline({
    path: rawData.map(({ latitude, longitude }) => ({
      lat: latitude,
      lng: longitude,
    })),
    geodesic: true,
    strokeColor: "#FF0000",
    strokeOpacity: 1.0,
    strokeWeight: 2,
  });

  rawPath.setMap(map);
}

async function loadCsvData(id) {
  const text = await fetch(`${url}/data/${id}.csv`).then((res) => res.text());

  return text
    .split("\n")
    .filter((line) => line)
    .map((line) => {
      const cols = line.split(";");

      return {
        date: parseInt(cols[0]),
        latitude: parseFloat(cols[2]),
        longitude: parseFloat(cols[3]),
        elevation: parseFloat(cols[4]),
        accuracy: parseFloat(cols[5]),
      };
    });
}
