'use strict';
const api_Key = {
  nps : 'FiAxcO8Cgj4inVDJSkiBlJcD6VJHQiRhirFiPyed'
}; 
const hostURL = {
  camp : 'https://api.nps.gov/api/v1/campgrounds'
};

function handleSearch() {
    $('.search-button').on('click', function(event) {
      $('.js-container').addClass('hidden');
      changeBackgroundImage();
      selectedFormdata();
   
    });
  }

  function changeBackgroundImage() {
    $("html").css("background-image", "url('https://images.unsplash.com/photo-1446483284190-e09276f22d63?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1050&q=80')");
  }

  function formatQueryParams(params) {
    const queryItems = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    return queryItems.join('&');
  }

  function getCampingDetails(query) {
    const params = {
      stateCode: query,    
      start: '0',
      fields: 'addresses,fees,operatingHours,contacts',
      apiKey:(api_Key.nps)
      
    };
    const queryString = formatQueryParams(params)
    const campURL = (hostURL.camp) + '?' + queryString;
  
    console.log(campURL);
   
   
    fetch(campURL)
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error(response.statusText);
      })
      .then(responseJson => displayResults(responseJson))
      .catch(err => {
        $('#js-error-message').text(`Something went wrong ${err.message}`);
      });
  }
 
  function displayResults(responseJson) {
    // if there are previous results, remove them
    console.log(responseJson);
    $('#results-list').empty();

   let campinfoList = [];

   // iterate through the items array
  for (let i = 0; i < responseJson.data.length; i++){
    let output = responseJson.data[i];
      if (output.campsites.totalSites > 0){
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

    //push the results in output array    
        campinfoList.push(campinfo);
      }
  };

displayInPage(campinfoList);
getCampAddress(campinfoList); 

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

function getCampAddress(campinfoList){
    //display images
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
}


  function selectedFormdata() {
    const searchState = $('#search-state-list').val();
    const searchDate = $('#js-search-date').val();
    getCampingDetails(searchState);
  }




  function handleCampingApp() {
    handleSearch();
  }

  // when the page loads, call `handleCampingApp`
  $(handleCampingApp);