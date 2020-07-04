import { getColourClassForAqi, indexToPollutionBandFromAqi, getColourClassForPollutionBandFromAqi } from "./airquality-index.js"
import { loadStreetNames } from "./streetnames.js"
// import { fetchMeasurements, checkReadingIsStale, fetchDeviceStats } from "./opensensemap.js"
import { fetchMeasurements, checkReadingIsStale, fetchDeviceStats } from "./fake-opensensemap.js"
import * as css from "./styling-constants.js"
/*
Provisional vanilla JS to populate sensor readings direcly from OpenMapSense API
Expects itemListContainer to exist - injects DOM objects inside of that

Experiments and custom CSS here:
    https://codepen.io/Formidablr/pen/WNrGGLW?editors=0110

*/



/*

get list
  Work out if value is stale
draw basic structure
    calling back to populate the values async, 
      (need Ids on elements for re-finding)
        possibly show a spinner with some basic transition to show value



Eventually move to PWA with a component framework, but need to plan build/packaging
*/

const boolSortAsc = (a, b) => (a === b) ? 0 : a ? 1 : -1;

document.addEventListener("DOMContentLoaded", populateLiveView);

function populateLiveView() {
  //TODO: start using a data persistance/caching scheme and/or SPA framework or PWA structure to prevent spamming the API
  fetchMeasurements()
    .then(populateSensorList)
    .catch(printError);
}



function populateSensorList(data) {
  data.sort((a, b) => alphaSort(a.name, b.name));
  data.sort((a, b) => boolSortAsc(a.readingIsStale(), b.readingIsStale()))


  //move DOM manipulation to own module(s)
  //populate itemListContainer from data
  var section = document.querySelector("#itemListContainer");
  section.innerText = '';
  data.forEach(device => 
    {
      section.appendChild(createInfoBox(device.boxid, device.name,
                                        device.defraAqi(),
                                        device.measurements,
                                        device.latestDustReadingDate()))
      }
  )
  //Not sure whether to pass API fetch lambda into DOM generation or have success callback call into DOM
  loadStreetNames(data, device => {
    var card = document.querySelector("#" + device.name + "-title");
    card.innerText = device.streetname;
  });
  //loadReadings
  //    loop through sensor DOM elements and call API to fetch reading
  //    set reading with transition
}


function createInfoBox(boxid, deviceName, defraAqi, measurements, latestDustReadingDate) {
  var stale = checkReadingIsStale(latestDustReadingDate);
  var colorClass = getColourClassForAqi(defraAqi, stale);
  var card = cardWithTitle(deviceName, colorClass);
  var values = document.createElement("DIV");
  values.classList.add("level-right-tablet", "has-text-centered", "mt-2");
  values.id = deviceName;

  if (!stale) {
    fetchDeviceStats(boxid, "PM2.5", "geometricMean", 3)
      .then(pm25 => {
        fetchDeviceStats(boxid, "PM10", "geometricMean", 3)
          .then(pm10 => {
            var daqi = (pm25 && pm10) ? Math.max(pm25.defraAqi, pm10.defraAqi) : "-";
            values.appendChild(sensorReading("Smoothed DAQI",
              undefined,
              "",
              stale ? "-" : daqi,
              undefined,
              css.READINGINDEX_CLASSLIST))

          });
      });
  }
  else {
    values.appendChild(sensorReading("Defra DAQI", undefined, "", "-", undefined, ["value-badge-outline", "is-size-4"]))
  }

  card.appendChild(values);
  return card;
}


function cardWithTitle(titleText, iconColorClass) {
  var card = document.createElement("DIV");
  card.classList.add("reading", "reading-bare", "level", "is-mobile", "is-marginless");
  card.appendChild(cardHeaderWithTitle(titleText, iconColorClass));
  return card;
}

function cardHeaderWithTitle(titleText, iconColorClass) {
  var header = document.createElement("DIV");
  header.classList.add("level-left-tablet",  "has-text-left");
  
  var inner = document.createElement("DIV");

  var title = document.createElement("DIV");
  title.classList.add("title","is-size-5","has-text-left-tablet","mb-3");
  title.id = titleText + '-title';
  title.innerText = titleText;
  inner.appendChild(title);

  var info = document.createElement("DIV");
  info.classList.add("has-text-left-tablet","has-text-weight-normal","is-size-6");
  //TODO: create an interim store, or parse from OpenSenseMap description
  info.innerHTML = "5 meters from traffic<br>1 sensor";

  inner.appendChild(info);
  header.appendChild(inner);
  var iconSpan = document.createElement("SPAN");
  iconSpan.classList.add("level-item");
  header.appendChild(iconSpan);
  return header;
}


function sensorReading(name, type, units, reading, readingTaken, valueClasslist) {
  var readingLine = document.createElement("DIV");
  readingLine.classList.add("level-item");

  var inner = document.createElement("DIV");
  var value = document.createElement("DIV");
  // var colorClass = getColourClassForPollutionBandFromAqi(reading);
  var colorClass = getColourClassForAqi(reading);
  console.log(colorClass);
  value.classList.add("value-badge", "is-size-4", "border", colorClass);
  var valueP = document.createElement("P");
  valueP.innerText = '' + reading + units;
  value.appendChild(valueP);

  var labelDiv = getInfoIconLinkWithText(indexToPollutionBandFromAqi(reading), "element-toggle");
  inner.appendChild(value);
  inner.appendChild(labelDiv);
  readingLine.appendChild(inner);
  return readingLine
}



function getInfoIconLinkWithText(text, forId) {
  var label = document.createElement("LABEL");
  label.htmlFor = forId;

  var a = document.createElement("A");
  a.classList.add("main-link");

  var textSpan = document.createElement("SPAN");
  textSpan.innerText = text;

  var i = document.createElement("I");
  i.classList.add("fas", "fa-info-circle", "has-text-grey", "ml-1");
  i.setAttribute("aria-hidden", "true");

  a.appendChild(textSpan);
  a.appendChild(i);

  label.appendChild(a);
  return label;
}


function printError(error) {
  console.log(error);
}



function alphaSort(a, b) {
  var nameA = a.toUpperCase(); // ignore upper and lowercase
  var nameB = b.toUpperCase(); // ignore upper and lowercase
  return (nameA === nameB) ? 0 : nameA < nameB ? -1 : 1;
}