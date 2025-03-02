
const sensorUrl = 'https://api.opensensemap.org/boxes?grouptag=cleanairfrome&full=true';
import { getAqIndexForMeasurements, pm25ToIndex, pm10ToIndex } from "./airquality-index.js"

import { throwHttpErrors } from "../utils.js"

export function fetchMeasurements() {
    return fetch(sensorUrl)
            .then(throwHttpErrors)
            .then(res => res.json())
            .then(getSimpleDeviceObject)
}
const staleDataAgeInHours = 2;
const publicDeviceWhitelist = 
[
//"5eeba76aee9b25001b3ba5c7", //0
//"5ee618b7dc1438001b14eb7f", //1
"5ee63c4adc1438001b233b53", //2
//"5eeb8c02ee9b25001b30c6e0", //3 - RETIRED
"5eeb9259ee9b25001b334899", //4
//"5ee60cf3dc1438001b1036ea", //5
"5eeba101ee9b25001b391ca0", //6
//"5f021451b9d0aa001c3ebb78", //7
//"5f06485a987fd4001b20527d", //8
"5f739230821102001bae1f41", //9
"5fafb35e9b2df8001b0602e8", //10
"61329d57d5bb40001c30da26", //11
"6132a1ecd5bb40001c32e7c0", //12
"6132ab47d5bb40001c372466", //13
"6132abf8d5bb40001c377481", //14
"6132acb4d5bb40001c37caea", //15
"6132ad1fd5bb40001c37fa6a", //16
"6132ad8fd5bb40001c382d63", //17
"6132adddd5bb40001c385195", //18
//"6132ae3dd5bb40001c387cee", //19 - RETIRED
"6132ae97d5bb40001c38a617", //20
"6143b77699eb9a001bada3e6", //21
//"6281685a8c8358001cd27010", //22 - RETIRED
"62816cfa8c8358001cd4cb93", //23
"65db78eb578b6f00081e8d75", //24
"6620252806bfc60008629785", //25
"66203c1e06bfc600088a6c31", //26
"662382baeaca630008b1a785", //27
"66238c26eaca630008c205ed", //28
"662391c5eaca630008cb98b9", //29
"662397e8eaca630008d65012", //30
"6623c143eaca6300081e1db0", //31
"6623c971eaca6300082c2513", //32
]

const stagingDeviceWhitelist = 
[
"5eeba76aee9b25001b3ba5c7", //0
"5ee618b7dc1438001b14eb7f", //1
"5ee63c4adc1438001b233b53", //2
"5eeb8c02ee9b25001b30c6e0", //3
"5eeb9259ee9b25001b334899", //4
"5ee60cf3dc1438001b1036ea", //5
"5eeba101ee9b25001b391ca0", //6
"5f021451b9d0aa001c3ebb78", //7
"5f06485a987fd4001b20527d", //8
"5f739230821102001bae1f41", //9
"5fafb35e9b2df8001b0602e8", //10
"61329d57d5bb40001c30da26", //11
"6132a1ecd5bb40001c32e7c0", //12
"6132ab47d5bb40001c372466", //13
"6132abf8d5bb40001c377481", //14
"6132acb4d5bb40001c37caea", //15
"6132ad1fd5bb40001c37fa6a", //16
"6132ad8fd5bb40001c382d63", //17
"6132adddd5bb40001c385195", //18
"6132ae3dd5bb40001c387cee", //19
"6132ae97d5bb40001c38a617", //20
"6143b77699eb9a001bada3e6", //21
"6281685a8c8358001cd27010", //22
"62816cfa8c8358001cd4cb93", //23
"65db78eb578b6f00081e8d75", //24
"6620252806bfc60008629785", //25
"66203c1e06bfc600088a6c31", //26
"662382baeaca630008b1a785", //27
"66238c26eaca630008c205ed", //28
"662391c5eaca630008cb98b9", //29
"662397e8eaca630008d65012", //30
"6623c143eaca6300081e1db0", //31
"6623c971eaca6300082c2513", //32
]

function deviceEnabled(id){
    var hostname = window.location.hostname;
    var whitelist = hostname === "cleanairfrome.org" 
                            ? publicDeviceWhitelist
                            : stagingDeviceWhitelist;
    return whitelist.includes(id);
}

function lastMeasurementIsAfterUpdated(x){
    var minutesLastMeasurementCanBeOlderThanUpdated = 5;
    var lastMeasurementTime = new Date(x.lastMeasurementAt).getTime();
    var updatedTime = new Date(x.updatedAt).getTime();
    var leeway = minutesLastMeasurementCanBeOlderThanUpdated * 10000;
    return lastMeasurementTime >= updatedTime - leeway;
}

function getSimpleDeviceObject(opensensemapDevices) {

    return opensensemapDevices
        .filter(x => deviceEnabled(x._id) && lastMeasurementIsAfterUpdated(x) )
        .map(x => {
        console.debug(x);
        
        return {
            boxid: x._id, 
            name: x.name,
            latitude: x.currentLocation.coordinates[1],
            longitude: x.currentLocation.coordinates[0],
            streetname: "",
            description: x.description ?? "",
            lastMeasurementAt: x.lastMeasurement,
            measurements: getMeasurements(x.sensors),
            defraAqi:               function () { return getAqIndexForMeasurements(this.measurements) },
            latestDustReadingDate:  function () { return getLastDustReadingDateFromMeasurements(this.measurements) },
            readingIsStale:         function () { return checkReadingIsStale(this.latestDustReadingDate()) }
        }
    })
}

function getLastDustReadingDateFromMeasurements(measurements) {
    var dustDates = measurements.filter(x => x.name.startsWith("PM"))
        .map(x => moment(x.readingTaken));
    return moment.max(dustDates).toDate();
}

export function fetchDeviceStats(boxid, phenomenon, statisticalOperation, sampleHours) {
    var statsUrl = "https://api.opensensemap.org/statistics/descriptive/?format=json&download=false"
    // fromDate=2020-06-27T14:54:00Z&toDate=2020-06-27T14:54:00Z
    statsUrl += "&boxid=" + boxid
    statsUrl += "&phenomenon=" + phenomenon
    statsUrl += "&operation=" + statisticalOperation
    statsUrl += "&window=" + sampleHours + "h"

    // columns = [boxId, boxName, exposure, height, lat, lon, phenomenon, sensorType, unit]
    statsUrl += "&columns=unit,sensorType,phenomenon" 

    var toDate = moment();
    var fromDate = toDate.subtract(sampleHours, 'hours');
    statsUrl += "&fromDate=" + fromDate.toISOString();
    statsUrl += "&toDate=" + toDate.toISOString()

    console.debug(statsUrl);
    return fetch(statsUrl)
        .then(throwHttpErrors)
        .then(res => res.json().then(x => {
                // console.log(phenomenon+ " stats:");
                // console.log(x);
                return processValues(x, phenomenon)
            })
        )
}


function processValues(values, phenomenon) {
    if (!values) {
        console.debug("empty response");
        return [0];
    }
    values = values[0];
    var mappedValues = getMappedValues(values);
    //not always a single value, even though sample window is the same ad the filter period
    // so we us a dumb MAX of the values provided (could use latest...?)
    mappedValues.value = Math.max(...mappedValues);
    if (phenomenon === "PM2.5") mappedValues.defraAqi = pm25ToIndex(mappedValues.value);
    if (phenomenon === "PM10")  mappedValues.defraAqi = pm10ToIndex(mappedValues.value);
    return mappedValues;
}

function getMappedValues(values) {
    //values are keyed by datetime, and not contained in a values array, so we have to find properties that are valid dates...
    if (!values) {
        console.debug("no data");
        return [0];
    }
    var valueFields = Object.keys(values).filter(y => moment(y).isValid());
    if (!valueFields || valueFields.length == 0) {
        console.debug("no values");
        return [];
    }
    console.debug("values: " + valueFields);
    var mappedValues = valueFields?.map(x => values[x]);
    return mappedValues;
}

export function checkReadingIsStale(latestDustReadingDate) {
    var freshnessLimit = moment().subtract(staleDataAgeInHours, 'hours');
    return moment(latestDustReadingDate).isBefore(freshnessLimit);
}

function getMeasurements(sensors) {
    return sensors.filter(x => x?.lastMeasurement ).map(y => {
        return {
            name: y.title,
            type: y.sensorType,
            units: y.unit,
            reading: y.lastMeasurement?.value,
            readingTaken: y.lastMeasurement?.createdAt,
        }
    });
}


// Example box: https://opensensemap.org/explore/5eeba76aee9b25001b3ba5c7
//  Bulk download
//      https://docs.opensensemap.org/#api-Measurements-getData
//
//  smoothing data
//   https://docs.opensensemap.org/#api-Statistics-descriptive
//   Docs say [to-date] [optional]	[RFC3339Date]
//     validation says toDate is required & rejects RFC3339Date - UTC date works

//  https://api.opensensemap.org/statistics/descriptive/?boxid=5eeba76aee9b25001b3ba5c7&phenomenon=PM2.5&fromDate=2020-06-20T11:33:28Z&toDate=2020-06-27T11:33:28Z&window=1h&operation=arithmeticMean&format=json
//  https://api.opensensemap.org/statistics/descriptive/?boxid=5eeba76aee9b25001b3ba5c7&phenomenon=PM2.5&fromDate=2020-06-20T11:33:28Z&toDate=2020-06-27T11:33:28Z&window=10m&operation=harmonicMean&format=json
//      "No senseBoxes found"
//          phenomenon is case sensitive


/*
    We're aiming for a 1, 2 or 3 hr moving average

    Operations available:
        arithmeticMean, geometricMean, harmonicMean, max, median, min, mode, rootMeanSquare, standardDeviation, sum, variance


    
    https://api.opensensemap.org/statistics/descriptive/?
    boxid=5eeba76aee9b25001b3ba5c7
    &phenomenon=PM2.5
    &fromDate=2020-06-27T13:00:00Z
    &toDate=2020-06-27T14:00:00Z
    &window=1h
    &operation=harmonicMean
    &format=json

    https://api.opensensemap.org/statistics/descriptive/?boxid=5eeba76aee9b25001b3ba5c7&phenomenon=PM2.5&fromDate=2020-06-27T13:00:00Z&toDate=2020-06-27T14:00:00Z&window=1h&operation=harmonicMean&format=json

    [
        {
            "sensorId": "5eeba76aee9b25001b3ba5ca",
            "2020-06-27T13:00:00.000Z": 0.9500000000000001
        }
    ]

    https://api.opensensemap.org/statistics/descriptive/?boxid=5eeba76aee9b25001b3ba5c7&phenomenon=PM2.5&fromDate=2020-06-27T11:00:00Z&toDate=2020-06-27T14:00:00Z&window=1h&operation=harmonicMean&format=json
[
    {
        "sensorId": "5eeba76aee9b25001b3ba5ca",
        "2020-06-27T11:00:00.000Z": 1.1617650581410062,
        "2020-06-27T12:00:00.000Z": 0.8167551291309599,
        "2020-06-27T13:00:00.000Z": 0.8330249110320286
    }
]

    https://api.opensensemap.org/statistics/descriptive/?boxid=5eeba76aee9b25001b3ba5c7&phenomenon=PM2.5&fromDate=2020-06-27T11:00:00Z&toDate=2020-06-27T14:00:00Z&window=3h&operation=harmonicMean&format=json
    [
        {
            "sensorId": "5eeba76aee9b25001b3ba5ca",
            "2020-06-27T09:00:00.000Z": 0.7194981705796314,
            "2020-06-27T12:00:00.000Z": 0.8194224813473212
        }
    ]
    
    https://api.opensensemap.org/statistics/descriptive/?boxid=5eeba76aee9b25001b3ba5c7&phenomenon=PM2.5&fromDate=2020-06-27T11:00:00Z&toDate=2020-06-27T14:00:00Z&window=110m&operation=harmonicMean&format=json
    
    https://api.opensensemap.org/statistics/descriptive/?boxid=5eeba76aee9b25001b3ba5c7&phenomenon=PM2.5&&fromDate=2020-06-27T14:54:00Z&toDate=2020-06-27T14:54:00Z&window=3h&operation=harmonicMean&format=json
    https://api.opensensemap.org/statistics/descriptive/?boxid=5eeba76aee9b25001b3ba5c7&phenomenon=PM2.5&&fromDate=2020-06-27T14:54:00Z&toDate=2020-06-27T14:54:00Z&window=3h&operation=arithmeticMean&format=json
    
    https://api.opensensemap.org/statistics/descriptive/?
    boxid=5eeba76aee9b25001b3ba5c7&
    phenomenon=PM2.5&
    fromDate=2020-06-27T14:54:00Z&
    toDate=2020-06-27T14:54:00Z&
    window=3h&
    operation=harmonicMean&
    format=json



    https://api.opensensemap.org/statistics/descriptive/?boxid=5eeba76aee9b25001b3ba5c7&phenomenon=PM2.5&&fromDate=2020-06-27T14:54:00Z&toDate=2020-06-27T14:54:00Z&window=1h&operation=harmonicMean&format=json&download=false
    https://api.opensensemap.org/statistics/descriptive/?boxid=5eeba76aee9b25001b3ba5c7&phenomenon=PM2.5&&fromDate=2020-06-27T14:54:00Z&toDate=2020-06-27T14:54:00Z&window=1h&operation=arithmeticMean&format=json&download=false
    https://api.opensensemap.org/statistics/descriptive/?boxid=5eeba76aee9b25001b3ba5c7&phenomenon=PM2.5&&fromDate=2020-06-27T14:54:00Z&toDate=2020-06-27T14:54:00Z&window=1h&operation=geometricMean&format=json&download=false



    harmonic mean
    [
        {
            "sensorId": "5eeba76aee9b25001b3ba5ca",
            "2020-06-27T14:00:00.000Z": 1.2816240943398634
        }
    ]
    arithmetic mean
    [
        {
            "sensorId": "5eeba76aee9b25001b3ba5ca",
            "2020-06-27T14:00:00.000Z": 1.31
        }
    ]
    geometric mean
    [
        {
            "sensorId": "5eeba76aee9b25001b3ba5ca",
            "2020-06-27T14:00:00.000Z": 1.357849848222598
        }
    ]


   https://api.opensensemap.org/statistics/descriptive/?boxid=5eeba76aee9b25001b3ba5c7&phenomenon=PM2.5&&fromDate=2020-06-27T13:54:00Z&toDate=2020-06-27T14:54:00Z&window=1m&operation=arithmeticMean&format=json
   values in period
   [
       {
           "sensorId": "5eeba76aee9b25001b3ba5ca",
           "2020-06-27T13:56:00.000Z": 1,
           "2020-06-27T14:00:00.000Z": 1,
           "2020-06-27T14:04:00.000Z": 1.3,
           "2020-06-27T14:12:00.000Z": 1.3,
           "2020-06-27T14:20:00.000Z": 1.3,
           "2020-06-27T14:16:00.000Z": 1.37,
           "2020-06-27T14:08:00.000Z": 1.58,
           "2020-06-27T14:24:00.000Z": 1.62
        }
    ]
    


result structure is annoying:
    [
        {
            "sensorId": "5eeba76aee9b25001b3ba5ca",
            "2020-06-27T14:00:00.000Z": 1.357849848222598
        }
    ]

should be:

            "sensorId": "5eeba76aee9b25001b3ba5ca",
            [
                {
                "date": "2020-06-27T14:00:00.000Z"
                "value": 1.357849848222598
                }
            ]
or at the very least:
            "sensorId": "5eeba76aee9b25001b3ba5ca",
            "values": [
                "2020-06-27T14:00:00.000Z": 1.357849848222598
            ]


bulk data fetch
?boxid=5eeba76aee9b25001b3ba5c7&
https://api.opensensemap.org/boxes/5ee63c4adc1438001b233b53/data/5ee63c4adc1438001b233b57?from-date=2020-06-27T13:54:00Z&to-date=2020-06-27T14:54:00Z&download=true&format=json
https://api.opensensemap.org/boxes/5ee63c4adc1438001b233b53/data/5ee63c4adc1438001b233b56?from-date=2020-06-27T13:54:00Z&to-date=2020-06-27T14:54:00Z&download=true&format=json



Seems very fast to download 3000 records for a week's worth of data.
Data is always a delimited file - default CSV
Multiple boxes can be included in boxid, comma separated
https://api.opensensemap.org/boxes/data?boxId=5ee63c4adc1438001b233b53&from-date=2020-06-27T13:54:00Z&to-date=2020-08-27T14:54:00Z&phenomenon=PM2.5
https://api.opensensemap.org/boxes/data?boxId=5ee63c4adc1438001b233b53&from-date=2020-06-27T13:54:00Z&to-date=2020-08-27T14:54:00Z&phenomenon=PM10

Can limit data going over the wire by selecting only the columns we need:
https://api.opensensemap.org/boxes/data?boxId=5ee63c4adc1438001b233b53&from-date=2020-06-27T13:54:00Z&to-date=2020-08-27T14:54:00Z&phenomenon=PM2.5&columns=createdAt,value

        */
