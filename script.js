'use strict';
const apiKeys = {
  nps : 'FiAxcO8Cgj4inVDJSkiBlJcD6VJHQiRhirFiPyed'
}; 
const hostURLs = {
  camp : 'https://api.nps.gov/api/v1/campgrounds'
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
    .then(function(campinfoList){
     return fetchCampAddress(campinfoList);
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
      && (dataValue['addresses'])  //checking the field is not null
      && (dataValue['addresses'].length > 0)){
          return true;
    } 
    return false;
  }

/*Populate Camping list values*/
 let populateCampingList = function(responseJson){
    return new Promise(function(resolve,reject) {
     let campinfoList = [];
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
        campinfoList.push(campinfo);
      }    
  }
  console.log(campinfoList.length);
  resolve(campinfoList);
  
 });
};

/* fetch the adress value from campinfo object*/
function fetchCampAddress(campinfoList){

    return new Promise(function(resolve,reject) {
        for(let i=0; i < campinfoList.length; i++) {
            let addressJson = {};
            let campAddress = campinfoList[i].address;
            for (let j=0; j < campAddress.length; j++){
              if(campAddress[j].type == "Physical" ){
                addressJson = campAddress[j];
                console.log(addressJson.line2 + ', ' + addressJson.line1);
              }
            }
        }
        resolve(campinfoList);
    });

    
}


function displayResults(responseJson) {
    // if there are previous results, remove them
    console.log(responseJson);
    $('#results-list').empty();

displayInPage(campinfoList); 

};

//display the results in the page
function displayInPage(campinfoList){

  // display in the UI
   for(let i=0; i < campinfoList.length; i++) {
    let campinfo = campinfoList[i];
    $('#results-list').append(
      `<li>
      <h3>${campinfo.name}</a></h3>
      <p>${campinfo.desc}</p>        
      </li>`
    );
  }
 //display the results section  
  $('#results').removeClass('hidden');
}


  function handleCampingApp() {
    handleSearch();
  }

  // when the page loads, call `handleCampingApp`
  $(handleCampingApp);