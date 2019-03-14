'use strict';
const apiKeys = {
  nps : 'FiAxcO8Cgj4inVDJSkiBlJcD6VJHQiRhirFiPyed',
  gMap : 'AIzaSyDQxa1C5wJQc_9k2zQHOTSvknhcVZgVE8c'
}; 
const hostURLs = {
  camp : 'https://api.nps.gov/api/v1/campgrounds',
  googleMap : 'https://maps.googleapis.com/maps/api/place/textsearch/json'
};

function handleSearch() {
    $('.search-button').on('click', function(event) {
      $('.js-container').addClass('hidden');
      changeBackgroundImage();
      selectedFormdata();
   
    });
  }

/*Changing the background of the page*/
  function changeBackgroundImage() {
    $("html").css("background-image", "url('https://images.unsplash.com/photo-1446483284190-e09276f22d63?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1050&q=80')");
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
    
    .then(function(responseJson){
      displayResults(responseJson);
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
          desc : output.description,
          fee : output.fees,
          contact : output.contacts,
          hours: output.operatingHours,
          address : output.addresses,
          coordinate : output.latLong   
        };
        console.log(campinfo);
        //push the results in output array    
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
    let imageReferenceURL = "";
    let photoReference = "";

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
        imageReferenceURL = (hostURLs.googleMap) + '?' + locationQuery;
        photoReference = fetchImageReference(imageReferenceURL);
        console.log(photoReference);
        campInfo.photoReference = photoReference;       
     }           
 resolve(campInfoList);
  });        
};

function fetchImageReference(imageReferenceURL){
  
     let photoReference = "";
      const proxyurl = "https://cors-anywhere.herokuapp.com/";
      fetch(proxyurl + imageReferenceURL)
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error(response.statusText);
      })
      .then(responseJson => {
        photoReference = extractPhotoReference(responseJson);
        console.log("Photo Reference =" + photoReference);
      })
      .catch(err => {
        console.log("Error message = " + err.message);
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


/*
function displayResults(responseJson) {
    // if there are previous results, remove them
    console.log(responseJson);
    $('#results-list').empty();

displayInPage(campInfoList); 

};

//display the results in the page
function displayInPage(campInfoList){

  // display in the UI
   for(let i=0; i < campInfoList.length; i++) {
    let campinfo = campInfoList[i];
    $('#results-list').append(
      `<li>
      <h3>${campinfo.name}</a></h3>
      <p>${campinfo.desc}</p>        
      </li>`
    );
  }
 //display the results section  
  $('#results').removeClass('hidden');
}*/


  function handleCampingApp() {
    handleSearch();
  }

  // when the page loads, call `handleCampingApp`
  $(handleCampingApp);