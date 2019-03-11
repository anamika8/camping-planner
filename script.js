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
      apiKey: api_Key.nps
      
    };
    const queryString = formatQueryParams(params)
    const campURL = hostURL.camp + '?' + queryString;
  
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


    for (let i = 0; i < responseJson.data.length; i++){
      // for each video object in the items 
      //array, add a list item to the results 
      //list with the video title, description,
      //and thumbnail

    $('#results-list').append(
      `<li>
      <h3>${responseJson.data[i].name}</a></h3>
      <p>${responseJson.data[i].description}</p>           
      </li>`
    )};
  //display the results section  
  $('#results').removeClass('hidden');
  };

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