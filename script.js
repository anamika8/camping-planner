'use strict';
const apiKeys = {
  nps : 'FiAxcO8Cgj4inVDJSkiBlJcD6VJHQiRhirFiPyed',
  gMap : 'AIzaSyDQxa1C5wJQc_9k2zQHOTSvknhcVZgVE8c'
}; 
const hostURLs = {
  camp : 'https://api.nps.gov/api/v1/campgrounds',
  googleMap : 'https://maps.googleapis.com/maps/api/place/textsearch/json',
  googlePhoto : 'https://maps.googleapis.com/maps/api/place/photo'
};

const defaultMessages = {
  noFeesInfoAvailable : "Fees Information Not Available",
  noHoursInfoAvailable : "No Operating Hours information is available",
  noDescriptionAvailable : "No Campground description available",
  noPhysicalAddressAvailable : "No Physical Address for this Campground is available",
  noPhoneNumberAvailable : " MissingPhone Number"
};


function handleSearch() {
    $('.search-button').on('click', function(event) {
      $('.js-container').addClass('hidden');
      showCampfireBurningGif();
      selectedFormdata(); 
    });
  }

/*Changing the background of the page*/
  function changeBackgroundImage() {
    $("html").css("background-image", "url('https://images.unsplash.com/photo-1446483284190-e09276f22d63?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1050&q=80')");
  }

  function showCampfireBurningGif() {
    $("html").css("background-image", "url('https://www.sunnysports.com/blog/wp-content/uploads/2017/10/biolite-firepit.gif')");
  }


/* Get the values selected by the user*/ 
  function selectedFormdata() {
    const searchState = $('#search-state-list').val();
    const searchDate = $('#js-search-date').val();

    getCampingURL(searchState)
    .then(function(campURL){
      return fetchCampInfo(campURL);
    })
    .then(function(responseJson){
     return populateCampingList(responseJson);
    })
    .then(function(campInfoList){
     return fetchCampAddress(campInfoList);
    })
    .then(function(campInfoList){
      return getPhotoReference(campInfoList);
     })
     .then(function(campInfoList){
        return getImageURL(campInfoList);
     })
    .then(function(campInfoList){
      displayResults(campInfoList);
    });
    
  }

 /*create a string with the original URL and the new parameters*/
  function formatQueryParams(params) {
    //create an array of the keys in the "params" object
    const queryItems = Object.keys(params)
    //for each of the keys in that array, create a string with the key and the key's value in the "params" object
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    //return a string of the keys and values, separated by "&"
    return queryItems.join('&');
  }
  
/*Get the main URL and fields to fetch the data */
  let getCampingURL = function(query){
    return new Promise(function(resolve,reject){

      const params = {
        stateCode: query,    
        start: '0',
        fields: 'addresses,fees,operatingHours,contacts',
        apiKey:(apiKeys.nps)
        
      };

      const queryString = formatQueryParams(params)
      const campURL = (hostURLs.camp) + '?' + queryString;
      console.log(campURL);
      resolve(campURL);

    });
  };

  /* Used to fetch campinformation using the campURL */
  let fetchCampInfo = function(campURL){
    return new Promise(function(resolve,reject) {
      
       fetch(campURL)
      .then(response => {
       if (response.ok) {
         resolve(response.json());
       }
       reject(new Error(response.statusText)); 
     });          
  });
 };

 /* Filter the values in response*/
function isCampsiteEligible(dataValue){
    if ((dataValue.campsites.totalSites > 0 )
      && (dataValue.hasOwnProperty('addresses')) 
      //checking the field is not null
      && (((dataValue['addresses']) && (dataValue['addresses'].length > 0)) 
      || (dataValue['latLong']))) {
          return true;
    } 
    return false;
  }

/*Populate Camping list values*/
 let populateCampingList = function(responseJson){
    return new Promise(function(resolve,reject) {
     let campInfoList = [];
 // iterate through the items array
 for (let i = 0; i < responseJson.data.length; i++){
    let output = responseJson.data[i];
      if (isCampsiteEligible(output)){
        let campinfo = {};
        campinfo = {
          name : output.name,
          parkCode : output.parkCode,
          desc : output.description,
          fee : output.fees,
          contact : output.contacts,
          hours: output.operatingHours,
          address : output.addresses,
          coordinate : output.latLong,
          weather : output.weatherOverview,
          // returns a short description to be shown in the UI
          shortDescription : function(wordLength) {
             //checking the field is not null
             if(!this.desc || this.desc == '') {
               return defaultMessages.noDescriptionAvailable;
             }
             let whitespace = " ";
             let wordsArray = this.desc.split(whitespace);
             let shortDescription = '';
             if (wordsArray.length <= wordLength) {
               shortDescription = this.desc;
             } else {
               let shortDescArray = [];
               for (let i=0; i < wordLength; i++) {
                 shortDescArray.push(wordsArray[i]);
               }
               shortDescArray.push("...");
               shortDescription = shortDescArray.join(whitespace);
             }
             return shortDescription;
          },
          // returns the physical address to be shown in the UI
          displayAddress : function() {
             //checking the field is not null or empty.if yes we are displaying latLong value
            if((typeof this.address == "undefined") || this.address.length == 0){
              let latLongValArray = this.coordinate.replace("{lat:","").replace(", lng:",",").replace("}","").split(",");
              return convertDMS(latLongValArray[0], latLongValArray[1]);
            }
            let addressToShow = "";
            for (let j=0; j < this.address.length; j++){
              let addressJson = this.address[j];
              if(addressJson.type == "Physical") {
                 //making sure both the address lines are not empty
                if((addressJson.line2 != "") || (addressJson.line1 != "")){
                  addressToShow += (addressJson.line2 != "") ? `${addressJson.line2},` : "";
                  addressToShow += (addressJson.line1 != "") ? `${addressJson.line1},` : "";
                  addressToShow += (addressJson.postalCode != "") ? `${addressJson.postalCode}` : "";
                } else if(this.coordinate == ""){ //in case address lines as well as latLong is also empty
                  addressToShow =  defaultMessages.noPhysicalAddressAvailable; 
                } else { //both address lines are empty but latLong is having value
                  let latLongValArray = this.coordinate.replace("{lat:","").replace(", lng:",",").replace("}","").split(",");
                  addressToShow = convertDMS(latLongValArray[0], latLongValArray[1]);
                }
                break;
              }            
            }
            return addressToShow;
          },
          // returns the fees for this campground
          displayFees : function() {
            if((typeof this.fee == "undefined") || this.fee.length == 0){
              return defaultMessages.noFeesInfoAvailable;
            }
            let feeInfoToShow = "";
            let feeInfo = {};
            for (let i=0; i < this.fee.length; i++) {
              feeInfo = this.fee[i];
              feeInfoToShow += `${feeInfo.title} : $${feeInfo.cost}/night <br>`; 
            }
            return feeInfoToShow;
          },
          // returns the operation hours information
          displayOperatingHours : function() {
            if((typeof this.hours == "undefined") || this.hours.length == 0){
              return defaultMessages.noHoursInfoAvailable;
            }
            let hours = this.hours[0];
            return Object.keys(hours.standardHours).map(key => ` ${key.substring(0,3).toUpperCase()} : ${hours.standardHours[key]}` );
          },
          // returns the phone & fax number in tooltip
          tooltipPhoneNumber : function() {
            if((typeof this.contact == "undefined") || this.contact.length == 0){
              return defaultMessages.noPhoneNumberAvailable;
            }
            let phoneNumbers = this.contact.phoneNumbers;
            if((typeof phoneNumbers == "undefined") || phoneNumbers.length == 0){
              return defaultMessages.noPhoneNumberAvailable;
            }
            let phoneNumberToShow = "";
            for(let i=0; i < phoneNumbers.length; i++) {
              phoneNumberToShow += `${phoneNumbers[i].type} : ${phoneNumbers[i].phoneNumber}  `;
            }
            return phoneNumberToShow;
          },
          // returns the phone & fax number in tooltip
          displayPhoneNumber : function() {
            if((typeof this.contact == "undefined") || this.contact.length == 0){
              return defaultMessages.noPhoneNumberAvailable;
            }
            let phoneNumbers = this.contact.phoneNumbers;
            if((typeof phoneNumbers == "undefined") || phoneNumbers.length == 0){
              return defaultMessages.noPhoneNumberAvailable;
            }
            let phoneNumberToShow = "";
            for(let i=0; i < phoneNumbers.length; i++) {
              if (phoneNumbers[i].type == "Voice") {
                phoneNumberToShow = phoneNumbers[i].phoneNumber;
                break;
              }
            }
            if (phoneNumberToShow == "") {
              phoneNumberToShow = defaultMessages.noPhoneNumberAvailable;
            }
            return phoneNumberToShow;
          }
        };
        console.log(campinfo);
        //push the results into output array    
        campInfoList.push(campinfo);
      }    
  }  
resolve(campInfoList);
  
 });
};

/* fetch the adress value from campinfo object*/
let fetchCampAddress = function(campInfoList){
    return new Promise(function(resolve,reject) {
      let googleAddress = "";

      for(let i=0; i < campInfoList.length; i++) {
          let addressJson = {};
          let campInfo = campInfoList[i];
          let campAddress = campInfo.address;
          
          for (let j=0; j < campAddress.length; j++){
            if(campAddress[j].type == "Physical") {
              if((campAddress[j].line2 != "") && (campAddress[j].line2 != "")){
                addressJson = campAddress[j];
                //console.log(addressJson.line2 + ', ' + addressJson.line1);
                googleAddress = `${addressJson.line2}, ${addressJson.line1}, ${addressJson.postalCode}`;
              } else {
                googleAddress = `${campInfo.coordinate}`;
              }
             console.log(googleAddress); 
            }            
          }
          campInfo.googleMapAddress = googleAddress;  
      }
      resolve(campInfoList);
    });   
};

/* Fetch the photo reference using Google Maps Geocoding API */
let getPhotoReference = function(campInfoList){
 
  return new Promise(function(resolve,reject) {
    let allPromises = [];

    for(let i=0; i < campInfoList.length; i++){
      let campInfo = campInfoList[i];
      let campAddress = campInfo.googleMapAddress;
      let params = {};
      
      if (campAddress.includes("lat:")){
        let latLong = campAddress.replace("{lat:","").replace(", lng:",",").replace("}","");     
        params = {
          location: latLong,
          type:'campground',
          key:(apiKeys.gMap)      
        };
     } else {          
        let photoReference = campAddress.split(" ").join("+");
         params = {
          query: photoReference,
          key:(apiKeys.gMap)      
         };
    }
        const locationQuery = formatQueryParams(params);
        const imageReferenceURL = (hostURLs.googleMap) + '?' + locationQuery;  
        let newPromise = fetchImageReference(imageReferenceURL);
        allPromises[i] = newPromise; 
     }

// make all promise in sequential manner
     Promise.all(allPromises)
      .then(function(campDetailsArray){
          for (let i = 0; i < campDetailsArray.length; i++) {
            let campInfo = campInfoList[i];
            campInfo.photoReference = campDetailsArray[i];
          }
      resolve(campInfoList);
      });
  });     
};


let  fetchImageReference = function(imageReferenceURL){
  return new Promise(function(resolve,reject) {
     let photoReference = "";
      const proxyurl = "https://cors.io/?";
      fetch(proxyurl + imageReferenceURL)
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error(response.statusText);
      })
      .then(responseJson => {
        photoReference = extractPhotoReference(responseJson);
        resolve(photoReference);
      })
      .catch(err => {
        console.log("Error message = " + err.message);
      });   
  });
}

/**
 * This method extracts the 'photo_reference' value from the results,
 * from the first result set as it is the nearest 
 */
function extractPhotoReference(responseJson) {
  let photoReference = "";
  if(!responseJson) {
     console.log("The result object from google maps api is null or undefined");
     return photoReference;
  }
  if(responseJson.hasOwnProperty("status") && responseJson.status == "OK"){
    //getting the first result set only
    let results = responseJson.results[0];
    // again getting the photo reference from the first photo available
    if(results.hasOwnProperty("photos") && results.photos.length > 0) {
      photoReference = results.photos[0].photo_reference;
    }
  } 
  return photoReference;
}

/* Used to fetch imageURL from google map api*/
let getImageURL = function(campInfoList){
    return new Promise(function(resolve,reject) {   

      for(let i=0; i < campInfoList.length; i++){
        let campInfo = campInfoList[i];
        const params = {
            photoreference: (campInfo.photoReference),    
            maxheight: '300',
            key:(apiKeys.gMap)   
          };
    
          const queryString = formatQueryParams(params) 
          const imageURL = (hostURLs.googlePhoto) + '?' + queryString;
          campInfo.imageURL = imageURL; 
        }
      resolve(campInfoList);
    });
};
/*
let fetchImage = function(imageURL){
  return new Promise(function(resolve,reject) { 
    fetch(imageURL)
      .then(response => {
       if (response.ok) {
         resolve(response.json());
       }
       reject(new Error(response.statusText)); 
     });  

});
};*/

function displayResults(campInfoList) {
  toggleBootstrapStylesheet();
  $("body").css("background-color", "transparent");
  changeBackgroundImage();
  
// if there are previous results, remove them
  $('#results-list').empty();
// display in the UI
   for(let i=0; i < campInfoList.length; i++) {
    let campInfo = campInfoList[i];
    /*$('#results-list').append(
      `<li>
      <h3>${campinfo.name}</a></h3>
      <p>${campinfo.desc}</p>      
      <p>${campinfo.photoReference}</p>        
      </li>`*/
     
      $('#results-list').append(
      `
      <div class="camping-item d-md-flex justify-content-between">
      <div class="px-3 my-3">
          <a class="camping-item-list" href="#">
              <div class="camping-item-list-thumb"><img src="${campInfo.imageURL}" alt="list"></div>
              <div class="camping-item-list-info">
                  <h4 class="camping-item-list-title">${campInfo.name}</h4><span><strong><i class="fa fa-home" style="font-size:24px;color:blue"></i>:</strong> ${campInfo.displayAddress()}</span><span><strong>Operating Hours:</strong>${campInfo.displayOperatingHours()}</span>
              </div>
          </a>
      </div>
      <div class="px-3 my-3">
          <div class="camping-item-label">Description</div>
          <div class="camping-item-value" title="${campInfo.desc}">
            ${campInfo.shortDescription(30)}
          </div>
      </div>
      <div class="px-3 my-3">
          <div class="camping-item-label">Fees</div><span class="camping-item-value">${campInfo.displayFees()}</span>
      </div>           
      <div class="px-3 my-3 text-center">
          <div class="camping-item-label">Booking Contacts</div>
           <span class="camping-item-value"><strong><i class="fa fa-phone" style="font-size:24px;color:blue" title="${campInfo.tooltipPhoneNumber()}"></i></strong>${campInfo.displayPhoneNumber()}</span>
           <br>
          <span class="camping-item-value"><strong><i class="fa fa-envelope" style="font-size:20px;color:blue"></i></strong>value</span>
      </div>
      <div class="px-3 my-3">
          <div class="camping-item-label">Other Information</div>
          <span class="camping-item-value"><strong><i class="fa fa-cloud" style="font-size:20px;color:blue"></i> :</strong>value</span>
          <br>
          <span class="camping-item-value"><strong><i class="fa fa-info-circle" style="font-size:20px;color:red"></i> :</strong>value</span>
      </div>
  </div>
`
 );

}
  
 //display the results section  
  $('#results').removeClass('hidden'); 
};

function toggleBootstrapStylesheet(){
  if($('link[href="http://netdna.bootstrapcdn.com/bootstrap/4.1.1/css/bootstrap.min.css"]').prop('disabled')) {
    $('link[href="http://netdna.bootstrapcdn.com/bootstrap/4.1.1/css/bootstrap.min.css"]').prop('disabled', false);
  } else {
    $('link[href="http://netdna.bootstrapcdn.com/bootstrap/4.1.1/css/bootstrap.min.css"]').prop('disabled', true);
  }
}

/**
 * Converts coordinates to Degrees, Minutes and Seconds
 */
function toDegreesMinutesAndSeconds(coordinate) {
  var absolute = Math.abs(coordinate);
  var degrees = Math.floor(absolute);
  var minutesNotTruncated = (absolute - degrees) * 60;
  var minutes = Math.floor(minutesNotTruncated);
  var seconds = Math.floor((minutesNotTruncated - minutes) * 60);

  return degrees + " " + minutes + " " + seconds;
}

/**
 * Converts latitude and longitude values to more readable formats
 */
function convertDMS(lat, lng) {
  var latitude = toDegreesMinutesAndSeconds(lat);
  var latitudeCardinal = Math.sign(lat) >= 0 ? "N" : "S";

  var longitude = toDegreesMinutesAndSeconds(lng);
  var longitudeCardinal = Math.sign(lng) >= 0 ? "E" : "W";

  return latitude + " " + latitudeCardinal + "; " + longitude + " " + longitudeCardinal;
}

$(function handleCampingApp() {
    console.log('App loaded! Waiting for submit!');
    toggleBootstrapStylesheet();
    //$('link[href="http://netdna.bootstrapcdn.com/bootstrap/4.1.1/css/bootstrap.min.css"]').prop('disabled', true);
    handleSearch();
});