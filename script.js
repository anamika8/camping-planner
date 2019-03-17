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


function handleSearch() {
    $('.search-button').on('click', function(event) {
      $('.js-container').addClass('hidden');
      showLoadingImage();
      //changeBackgroundImage();
      selectedFormdata(); 
    });
  }

/*Changing the background of the page*/
  function changeBackgroundImage() {
    $("html").css("background-image", "url('https://images.unsplash.com/photo-1446483284190-e09276f22d63?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1050&q=80')");
  }

  function showLoadingImage() {
    $("#js-container").css("opacity",0.5);
    $('.loading-img').show();
  }

  function disappearLoadingImage() {
    $('.loading-img').hide();
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
          weather : output.weatherOverview  
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
  disappearLoadingImage();
  changeBackgroundImage();
  
// if there are previous results, remove them
  $('#results-list').empty();
// display in the UI
   for(let i=0; i < campInfoList.length; i++) {
    let campinfo = campInfoList[i];
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
                    <div class="camping-item-list-thumb"><img src="https://maps.googleapis.com/maps/api/place/photo?photoreference=CmRaAAAAndc4Yr9Lijc9GDAAxnq28ui8cwolCjk3VqezsC3PF5SW8BVPNQboHdu_6d8jw4DrS9wyVqYaLRxuXPQVNcEExR2ECIQvB0HV7BST8q-n6eySkys14H0AAwazqK6mCELDEhD5ALCXwVh77oxP30-9k7FuGhSLQAmwU96SDvaxZZFAZCQvCd4cuQ&maxheight=300&key=AIzaSyDQxa1C5wJQc_9k2zQHOTSvknhcVZgVE8c" alt="list"></div>
                    <div class="camping-item-list-info">
                        <h4 class="camping-item-list-title">Mazama Village Campground</h4><span><strong>Address:</strong> home icon</span><span><strong>Operating Hours:</strong>time value</span>
                    </div>
                </a>
            </div>
            <div class="px-3 my-3 text-center">
                <div class="camping-item-label">Description</div>
                <div class="desc">
                   
                </div>
            </div>
            <div class="px-3 my-3 text-center">
                <div class="camping-item-label">Fees</div><span class="text-xl font-weight-medium">value</span>
            </div>           
            <div class="px-3 my-3 text-center">
                <div class="camping-item-label">Contact for Booking</div>
                <span><strong>Number:</strong>icon</span>
                <br>
                <span><strong>Email:</strong>value</span>
            </div>
            <div class="px-3 my-3 text-center">
                <div class="camping-item-label">Other Information</div>
                <span><strong>Weather:</strong>icon</span>
                <br>
                <span><strong>Alerts:</strong>value</span>
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

$(function handleCampingApp() {
    console.log('App loaded! Waiting for submit!');
    toggleBootstrapStylesheet();
    //$('link[href="http://netdna.bootstrapcdn.com/bootstrap/4.1.1/css/bootstrap.min.css"]').prop('disabled', true);
    handleSearch();
});