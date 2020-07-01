import { getColourClassForAqi } from "./airquality-index.js"
import { loadStreetNames } from "./streetnames.js"
import { fetchMeasurements, checkReadingIsStale } from "./opensensemap.js"
import * as css from "./styling-constants.js"
/*
Provisional vanilla JS to populate sensor readings direcly from OpenMapSense API
Expects itemListContainer to exist - injects DOM objects inside of that

Experiments and custom CSS here:
    https://codepen.io/Formidablr/pen/WNrGGLW?editors=0110

*/

document.addEventListener("DOMContentLoaded", populateLiveView);

var showDetail = document.querySelector("#showDetail");
showDetail.addEventListener("change", populateLiveView);

function populateLiveView() {
    //TODO: start using a data persistance/caching scheme and/or SPA framework or PWA structure to prevent spamming the API
    //TODO: extend the data fetching to smooth the changes using a rolling average of recent values rather than a point measurement
    fetchMeasurements()
        .then(updateReadings)
        .catch(printError);
}

function updateReadings(data) {
    console.log(data);
    var section = document.querySelector("#itemListContainer");
    section.innerText = '';
    data.sort((a,b)=>alphaSort(a.name, b.name));
    data.sort((a, b) => boolSortAsc(a.readingIsStale(),b.readingIsStale()))
    data.forEach(device => section.appendChild(createInfoBox(device.name, 
                                                             device.defraAqi(),
                                                             device.measurements, 
                                                             device.latestDustReadingDate()))                   
                            )
    loadStreetNames(data, device => {
        var card = document.querySelector("#" + device.name + "-title");
        card.innerText = device.streetname;
    });
}


function createInfoBox(deviceName, defraAqi, measurements, latestDustReadingDate) {
    var stale = checkReadingIsStale(latestDustReadingDate);
    var colorClass = getColourClassForAqi(defraAqi, stale);
    var card = cardWithTitle(deviceName, colorClass);
    var values = document.createElement("DIV");
    values.classList.add(...css.READINGS_CLASSLIST);
    values.id = deviceName;
    if (showDetail.checked)
        measurements.filter(x=> x.name.startsWith('PM')).forEach(measurement =>
            values.appendChild(sensorReading(...Object.values(measurement), css.READINGDETAIL_CLASSLIST)));

    values.appendChild(sensorReading("Defra DAQI", undefined, "", 
                                     stale && !showDetail.checked ? "-" : defraAqi, undefined, 
                                     css.READINGINDEX_CLASSLIST))
    card.appendChild(values);
    if (showDetail.checked)
        card.appendChild(footerWithTextItems([moment(latestDustReadingDate).format("ddd Do MMM, HH:mm")]));
    return card;
}


function cardWithTitle(titleText, iconColorClass) {
    var card = document.createElement("DIV");
    card.classList.add(...css.CARD_CLASSLIST);
    card.appendChild(cardHeaderWithTitle(titleText, iconColorClass));
    return card;
}

function cardHeaderWithTitle(titleText, iconColorClass) {
    var header = document.createElement("DIV");
    header.classList.add(...css.CARDHEADER_CLASSLIST);

    var title = document.createElement("LABEL");
    title.classList.add(...css.CARDHEADERTITLE_CLASSLIST);
    title.id = titleText + '-title';
    title.innerText = titleText;

    header.appendChild(title);
    var iconSpan = document.createElement("SPAN");
    iconSpan.classList.add(...css.CARDICONCONTAINER_CLASSLIST);
    var icon = document.createElement("I");
    icon.classList.add(...css.CARDICON_CLASSLIST, iconColorClass);
    iconSpan.appendChild(icon);
    header.appendChild(iconSpan);
    return header;
}

function footerWithTextItems(items) {
    var footer = document.createElement("DIV");
    footer.classList.add(...css.CARDFOOTER_CLASSLIST);
    items.forEach(x => footer.appendChild(footerItemWithText(x)));
    return footer;
}

function footerItemWithText(text) {
    var footerContent = document.createElement("SPAN");
    footerContent.classList.add(...css.CARDFOOTERITEM_CLASSLIST);
    footerContent.innerText = text;
    return footerContent;
}

function sensorReading(name, type, units, reading, readingTaken, valueClasslist) {
    var readingLine = document.createElement("DIV");
    readingLine.classList.add(...css.READING_CLASSLIST);

    var inner = document.createElement("DIV");
    var label = document.createElement("P");
    label.classList.add(...css.READINGLABEL_CLASSLIST);
    label.innerText = name;

    var value = document.createElement("P");
    value.classList.add(...valueClasslist);
    value.innerText = reading + units ;

    inner.appendChild(label);
    inner.appendChild(value);
    readingLine.appendChild(inner);
    return readingLine
}

function printError(error) {
    console.log(error);
}


const boolSortAsc = (a, b) => (a === b) ? 0 : a ? 1 : -1;

function alphaSort(a, b) {
    var nameA = a.toUpperCase(); // ignore upper and lowercase
    var nameB = b.toUpperCase(); // ignore upper and lowercase
    return (nameA === nameB) ? 0 : nameA < nameB ? -1 : 1; 
}