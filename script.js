'use strict';
/**
* Global Variables
*/
const apiKeys = {
  nps: 'FiAxcO8Cgj4inVDJSkiBlJcD6VJHQiRhirFiPyed',
  gMap: 'AIzaSyDQxa1C5wJQc_9k2zQHOTSvknhcVZgVE8c'
};
const hostURLs = {
  camp: 'https://api.nps.gov/api/v1/campgrounds',
  googleMap: 'https://maps.googleapis.com/maps/api/place/textsearch/json',
  googlePhoto: 'https://maps.googleapis.com/maps/api/place/photo'
};

const defaultMessages = {
  noFeesInfoAvailable: "Fees Information Not Available",
  noHoursInfoAvailable: "No Operating Hours information is available",
  noDescriptionAvailable: "No Campground description available",
  noPhysicalAddressAvailable: "No Physical Address for this Campground is available",
  noPhoneNumberAvailable: " MissingPhone Number",
  noEmailAddressAvailable: "Not Available",
  noWeatherInformationAvailable: "No Weather information is available",
  noDataAvailable: "No Campgrounds are Available"
};

const proxyurl = "https://cors-anywhere.herokuapp.com/";

let stateNameSelected = "";

/**
 * When user click on search button , it will changed the first page
 * and call the function to load data about campground details.
 */
function handleSearch() {
  $('.search-button').on('click', function (event) {
    $('.js-container').addClass('hidden');
    showCampfireBurningGif();
    selectedFormdata();
  });
}

/**
 * Enables the search button only if state is selected
 */
function checkStateSelected() {
  $('#search-state-list').on('change', function (event) {
    let searchState = $(this).val();
    if (searchState != "") {
      $(".submission").removeClass("searchDisabled");
      stateNameSelected = $(this).find('option:selected').attr("title");
      console.log("State name selected: " + stateNameSelected);
    }
  });
}

/**
 * This method changes the background of the page.
*/
function changeBackgroundImage() {
  $("html").css("background-image", "url('https://images.unsplash.com/photo-1446483284190-e09276f22d63?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1050&q=80')");
}

/**
* This method shows the campfire image till data shows up.
*/
function showCampfireBurningGif() {
  $("html").css("background-image", "url('https://www.sunnysports.com/blog/wp-content/uploads/2017/10/biolite-firepit.gif')");
}


/**
 * This method is calling all promises in sequential manner.
 */
function selectedFormdata() {
  const searchState = $('#search-state-list').val();

  getCampingURL(searchState)
    .then(function (campURL) {
      return fetchCampInfo(campURL);
    })
    .then(function (responseJson) {
      return populateCampingList(responseJson);
    })
    .then(function (campInfoList) {
      return fetchCampAddress(campInfoList);
    })
    .then(function (campInfoList) {
      return getPhotoReference(campInfoList);
    })
    .then(function (campInfoList) {
      return getImageURL(campInfoList);
    })
    .then(function (campInfoList) {
      displayResults(campInfoList);
    })
    .catch(err => {
      displayNoDataAvailable(err.message);
    });
}

/**
 * Create an encoded string with the original URL and the new parameters
 */
function formatQueryParams(params) {
  //create an array of the keys in the "params" object
  const queryItems = Object.keys(params)
    //for each of the keys in that array, create a string with the key and the key's value in the "params" object
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
  //return a string of the keys and values, separated by "&"
  return queryItems.join('&');
}

/**
* This method construct the NPS URL to fetch campground information 
*/
let getCampingURL = function (query) {
  return new Promise(function (resolve, reject) {

    const params = {
      stateCode: query,
      start: '0',
      fields: 'addresses,fees,operatingHours,contacts',
      apiKey: (apiKeys.nps)

    };

    const queryString = formatQueryParams(params)
    const campURL = proxyurl + (hostURLs.camp) + '?' + queryString;
    console.log(campURL);
    resolve(campURL);

  });
};

/**
* This method calls the NPS URL to fetch campground information 
* from NPS site.
*/
let fetchCampInfo = function (campURL) {
  return new Promise(function (resolve, reject) {

    fetch(campURL)
      .then(response => {
        if (response.ok) {
          resolve(response.json());
        }
        reject(new Error(response.statusText));
      });
  });
};

/**
 * This method is used to filter data which will be used 
 * to get proper camground information from NPS site
 */
function isCampsiteEligible(dataValue) {
  if ((dataValue.campsites.totalSites > 0)
    && (dataValue.hasOwnProperty('addresses'))
    //checking the field is not null
    && (((dataValue['addresses']) && (dataValue['addresses'].length > 0))
      || (dataValue['latLong']))) {
    return true;
  }
  return false;
}

/**
 * This method is used to create campInfoList array which is a
 * collection of campInfo objects having campground information  
 */
let populateCampingList = function (responseJson) {
  return new Promise(function (resolve, reject) {
    if (responseJson.total > 0) {
      let campInfoList = [];
      // iterate through the items array
      for (let i = 0; i < responseJson.data.length; i++) {
        let output = responseJson.data[i];
        if (isCampsiteEligible(output)) {
          let campInfo = createCampInfoObject(output);
          console.log(campInfo);
          //push the results into output array    
          campInfoList.push(campInfo);
        }
      }
      if (campInfoList.length == 0) {
        reject(new Error(defaultMessages.noDataAvailable));
      } else {
        resolve(campInfoList);
      }
    } else {
      reject(new Error(defaultMessages.noDataAvailable));
    }

  });
};

/**
 * This method is used to fetch the address of the campgrounds.
 */
let fetchCampAddress = function (campInfoList) {
  return new Promise(function (resolve, reject) {
    let googleAddress = "";

    for (let i = 0; i < campInfoList.length; i++) {
      let addressJson = {};
      let campInfo = campInfoList[i];
      let campAddress = campInfo.address;

      for (let j = 0; j < campAddress.length; j++) {
        if (campAddress[j].type == "Physical") {
          addressJson = campAddress[j];
          if ((campAddress[j].line1 != "") && (campAddress[j].line2 != "")) {
            googleAddress = `${addressJson.line2}, ${addressJson.line1}, ${addressJson.postalCode}`;
          } else if (campInfo.coordinate == '') {
            googleAddress = `${campInfo.name}, ${addressJson.postalCode}`;
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

/**
 * This method is used to store the photo reference property in the 
 * campInfo object and contruct the URL which will be used in another 
 * Google Maps Geocoding API.
 */
let getPhotoReference = function (campInfoList) {

  return new Promise(function (resolve, reject) {
    let allPromises = [];

    for (let i = 0; i < campInfoList.length; i++) {
      let campInfo = campInfoList[i];
      let campAddress = campInfo.googleMapAddress;
      let params = {};

      if (campAddress.includes("lat:")) {
        let latLong = campAddress.replace("{lat:", "").replace(", lng:", ",").replace("}", "");
        params = {
          location: latLong,
          type: 'campground',
          key: (apiKeys.gMap)
        };
      } else {
        let addressForPhotoreference = campAddress.split(" ").join("+");
        params = {
          query: addressForPhotoreference,
          key: (apiKeys.gMap)
        };
      }
      const locationQuery = formatQueryParams(params);
      const imageReferenceURL = (hostURLs.googleMap) + '?' + locationQuery;
      let newPromise = fetchImageReference(imageReferenceURL);
      allPromises[i] = newPromise;
    }

    // make all promise in sequential manner
    Promise.all(allPromises)
      .then(function (campDetailsArray) {
        for (let i = 0; i < campDetailsArray.length; i++) {
          let campInfo = campInfoList[i];
          campInfo.photoReference = campDetailsArray[i];
        }
        resolve(campInfoList);
      });
  });
};

/**
 * This method is used to fetch the photo reference value using
 * another Google Maps Geocoding API
 */
let fetchImageReference = function (imageReferenceURL) {
  return new Promise(function (resolve, reject) {
    let photoReference = "";
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
  if (!responseJson) {
    console.log("The result object from google maps api is null or undefined");
    return photoReference;
  }
  if (responseJson.hasOwnProperty("status") && responseJson.status == "OK") {
    //getting the first result set only
    let results = responseJson.results[0];
    // again getting the photo reference from the first photo available
    if (results.hasOwnProperty("photos") && results.photos.length > 0) {
      photoReference = results.photos[0].photo_reference;
    }
  }
  return photoReference;
}

/**
 * This method is used to fetch the image reference URL from Google Maps Geocoding API
 *  using the information (photo reference) received from previous method.
 */
let getImageURL = function (campInfoList) {
  return new Promise(function (resolve, reject) {

    for (let i = 0; i < campInfoList.length; i++) {
      let campInfo = campInfoList[i];
      const params = {
        photoreference: (campInfo.photoReference),
        maxheight: '300',
        key: (apiKeys.gMap)
      };

      const queryString = formatQueryParams(params)
      const imageURL = (hostURLs.googlePhoto) + '?' + queryString;
      campInfo.imageURL = imageURL;
    }
    resolve(campInfoList);
  });
};

/**
 * Creates the basic campInfo object with its associated methods
 * from the JSON response of /campgrounds API.
 */
function createCampInfoObject(output) {
  const campInfo = {
    name: output.name,
    parkCode: output.parkCode,
    desc: output.description,
    fee: output.fees,
    contact: output.contacts,
    hours: output.operatingHours,
    address: output.addresses,
    coordinate: output.latLong,
    weather: output.weatherOverview,
    campsites: output.campsites,
    // returns a short description to be shown in the UI
    shortDescription: function (wordLength) {
      return returnCampgroundShortDescription(this.desc, wordLength);
    },
    // returns the physical address to be shown in the UI
    displayAddress: function () {
      return returnCampsitePhysicalAddress(this.address, this.coordinate);
    },
    // returns the fees for this campground
    displayFees: function () {
      return returnParkFeeInfo(this.fee);
    },
    // returns the operation hours information
    displayOperatingHours: function () {
      return returnDisplayOperatingHours(this.hours);
    },
    // returns the phone & fax number in tooltip
    tooltipPhoneNumber: function () {
      return returnTooltipPhoneNumber(this.contact);
    },
    // returns the phone to display in UI
    displayPhoneNumber: function () {
      return returnPhoneNumberToDisplay(this.contact);
    },
    //returns the email to display in UI
    displayEmailAddress: function () {
      return returnEmailAddressToDisplay(this.contact);
    }
  };
  return campInfo;
}

/**
 * Returns campground short description based on 
 * given word length
 */
function returnCampgroundShortDescription(desc, wordLength) {
  //checking the field is not null
  if (!desc || desc == '') {
    return defaultMessages.noDescriptionAvailable;
  }
  let whitespace = " ";
  let wordsArray = desc.split(whitespace);
  let shortDescription = '';
  if (wordsArray.length <= wordLength) {
    shortDescription = desc;
  } else {
    let shortDescArray = [];
    for (let i = 0; i < wordLength; i++) {
      shortDescArray.push(wordsArray[i]);
    }
    shortDescArray.push("...");
    shortDescription = shortDescArray.join(whitespace);
  }
  return shortDescription;
}

/**
 * Returns the Physical address with zip code or the latitude/ longitude
 * of the campground
 */
function returnCampsitePhysicalAddress(address, coordinate) {
  //checking the field is not null or empty.if yes we are displaying latLong value
  if ((typeof address == "undefined") || address.length == 0) {
    let latLongValArray = coordinate.replace("{lat:", "").replace(", lng:", ",").replace("}", "").split(",");
    return convertDMS(latLongValArray[0], latLongValArray[1]);
  }
  let addressToShow = "";
  for (let j = 0; j < address.length; j++) {
    let addressJson = address[j];
    if (addressJson.type == "Physical") {
      //making sure both the address lines are not empty
      if ((addressJson.line2 != "") || (addressJson.line1 != "")) {
        addressToShow += (addressJson.line2 != "") ? `${addressJson.line2},` : "";
        addressToShow += (addressJson.line1 != "") ? `${addressJson.line1},` : "";
        addressToShow += (addressJson.postalCode != "") ? `${addressJson.postalCode}` : "";
      } else if (coordinate == "") { //in case address lines as well as latLong is also empty
        addressToShow = defaultMessages.noPhysicalAddressAvailable;
      } else { //both address lines are empty but latLong is having value
        let latLongValArray = coordinate.replace("{lat:", "").replace(", lng:", ",").replace("}", "").split(",");
        addressToShow = convertDMS(latLongValArray[0], latLongValArray[1]);
      }
      break;
    }
  }
  return addressToShow;
}

/**
 * Method returns basic Park Fee information in a single string
 * to be displayed in the UI
 */
function returnParkFeeInfo(fee) {
  if ((typeof fee == "undefined") || fee.length == 0) {
    return defaultMessages.noFeesInfoAvailable;
  }
  let feeInfoToShow = "";
  let feeInfo = {};
  for (let i = 0; i < fee.length; i++) {
    feeInfo = fee[i];
    feeInfoToShow += `${feeInfo.title} : $${feeInfo.cost}/night <br>`;
    break;
  }
  return feeInfoToShow;
}

/**
 * Method returns all the Operating Hours in a single String
 * to be displayed in the UI
 */
function returnDisplayOperatingHours(hoursArray) {
  if ((typeof hoursArray == "undefined") || hoursArray.length == 0) {
    return defaultMessages.noHoursInfoAvailable;
  }
  let hours = hoursArray[0];
  return Object.keys(hours.standardHours).map(key => ` ${key.substring(0, 3).toUpperCase()} : ${hours.standardHours[key]}`);
}

/**
 * Method returns all the Phone and Fax Numbers to show as a tooltip.
 * If no contact number is available, an appropriate message will be displayed.
 */
function returnTooltipPhoneNumber(contact) {
  if ((typeof contact == "undefined") || contact.length == 0) {
    return defaultMessages.noPhoneNumberAvailable;
  }
  let phoneNumbers = contact.phoneNumbers;
  if ((typeof phoneNumbers == "undefined") || phoneNumbers.length == 0) {
    return defaultMessages.noPhoneNumberAvailable;
  }
  let phoneNumberToShow = "";
  for (let i = 0; i < phoneNumbers.length; i++) {
    phoneNumberToShow += `${phoneNumbers[i].type} : ${phoneNumbers[i].phoneNumber}  `;
  }
  return phoneNumberToShow;
}

/**
 * Method returns the Phone Number to show in the UI
 * If no phone number is available, an appropriate message will be displayed.
 */
function returnPhoneNumberToDisplay(contact) {
  if ((typeof contact == "undefined") || contact.length == 0) {
    return defaultMessages.noPhoneNumberAvailable;
  }
  let phoneNumbers = contact.phoneNumbers;
  if ((typeof phoneNumbers == "undefined") || phoneNumbers.length == 0) {
    return defaultMessages.noPhoneNumberAvailable;
  }
  let phoneNumberToShow = "";
  for (let i = 0; i < phoneNumbers.length; i++) {
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

/**
 * Method returns the email address to show in the UI
 * If no email address is available, an appropriate message will be displayed.
 */
function returnEmailAddressToDisplay(contact) {
  if ((typeof contact == "undefined") || contact.length == 0) {
    return defaultMessages.noEmailAddressAvailable;
  }
  let emailAddresses = contact.emailAddresses;
  if ((typeof emailAddresses == "undefined") || emailAddresses.length == 0) {
    return defaultMessages.noEmailAddressAvailable;
  }
  let emailToSend = "";
  for (let i = 0; i < emailAddresses.length; i++) {
    emailToSend = `${emailAddresses[i].emailAddress}`;
    break;
  }

  if (emailToSend == "") {
    emailToSend = defaultMessages.noEmailAddressAvailable;
  }
  return emailToSend;

}

/**
 * Method used to display results in the UI
 */
function displayResults(campInfoList) {
  toggleBootstrapStylesheet();
  $("body").css("background-color", "transparent");
  changeBackgroundImage();

  // if there are previous results, remove them
  $('#results-list').empty();
  // display in the UI
  for (let i = 0; i < campInfoList.length; i++) {
    let campInfo = campInfoList[i];
    $('#results-list').append(generateHTMLData(campInfo, i));
  };

  setResultsPageHeaderInfo();

  //display the results section  
  $('#results').removeClass('hidden');
};

/**
 * Sets the display page header information with state name
 */
function setResultsPageHeaderInfo() {
  let newHTMLValues = `<strong>Available Campgrounds in ${stateNameSelected} state</strong>`;
  $('#displayTitle').html(newHTMLValues);
}

/**
* Collection of methods which is used to return data to display
* in the UI
*/
function generateHTMLData(campInfo, i) {
  let returnHTML =
    `<div class="camping-item d-md-flex justify-content-between">`
    + returnHTMLForImageAndNameSection(campInfo)
    + returnHTMLForDescriptionSection(campInfo)
    + returnHTMLForFeesSection(campInfo)
    + returnHTMLForBookingContactsSection(campInfo)
    + returnHTMLForOtherInfoSection(campInfo, i)
    + `</div>`;

  return returnHTML;
}

/**
* Method returns the image of the campground in UI.
*/
function returnHTMLForImageAndNameSection(campInfo) {
  let returnHTML =
    `
  <div class="px-3 my-3">
    <a class="camping-item-list" href="#">
        <div class="camping-item-list-thumb"><img src="${campInfo.imageURL}" alt="list"></div>
        <div class="camping-item-list-info">
            <h4 class="camping-item-list-title">${campInfo.name}</h4>
            <span><strong><i class="fa fa-home" style="font-size:24px;color:blue;cursor:default"></i>:</strong>${campInfo.displayAddress()}</span>
            <span><strong>Operating Hours:</strong>${campInfo.displayOperatingHours()}</span>
        </div>
    </a>
  </div>
  `;
  return returnHTML;
}


/**
* Method returns the short description of the campground in UI.
*/
function returnHTMLForDescriptionSection(campInfo) {
  let returnHTML =
    `
    <div class="px-3 my-3">
        <div class="camping-item-label">Description</div>
        <div class="camping-item-value" title="${campInfo.desc}">
        ${campInfo.shortDescription(30)}
        </div>
    </div>
    `;
  return returnHTML;
}

/**
* Method returns the fees of the campground in UI.
*/
function returnHTMLForFeesSection(campInfo) {
  let returnHTML =
    `
    <div class="px-3 my-3">
          <div class="camping-item-label">Fees</div><span class="camping-item-value">${campInfo.displayFees()}</span>
    </div>           
    `;
  return returnHTML;
}

/**
 * Method returns the Email Address of the campground in UI.
 */
function returnHTMLForBookingContactsSection(campInfo) {
  let returnHTML =
    `
    <div class="px-3 my-3 text-center">
          <div class="camping-item-label">Booking Contacts</div>
           <span class="camping-item-value"><strong><i class="fa fa-phone" style="font-size:24px;color:blue" title="${campInfo.tooltipPhoneNumber()}"></i></strong>${campInfo.displayPhoneNumber()}</span>
           <br>
          <span class="camping-item-value"><a href="mailto:${campInfo.displayEmailAddress()}" title="${campInfo.displayEmailAddress()}"><strong><i class="fa fa-envelope" style="font-size:20px;color:blue"></i></strong></a></span>
    </div>
    `;
  return returnHTML;
}

/**
* Method returns the weather overview and other information of the 
* campground in a pop-up box in UI.
*/
function returnHTMLForOtherInfoSection(campInfo, i) {
  const weatherPopUpVar = {
    weatherAnchorId: `weather-${i}`,
    popupBoxId: `weatherPopup-${i}`,
    popupContent: `weatherContent-${i}`
  };

  const informationPopUpVar = {
    informationAnchorId: `information-${i}`,
    popupBoxId: `informationPopup-${i}`,
    popupContent: `informationContent-${i}`
  };
  let returnHTML =
    `
    <div class="px-3 my-3 text-center">
      <div class="camping-item-label">Other Information</div>
      <span class="camping-item-value weatherPopupClass" id="${weatherPopUpVar.weatherAnchorId}"><strong><i class="fa fa-cloud" style="font-size:20px;color:blue"></i></strong></span>
      <div class="popup-overlay" id="${weatherPopUpVar.popupBoxId}">
        <div class="popup-content" id=${weatherPopUpVar.popupContent}>
          <h5>Weather Overview</h5>
          <p>${campInfo.weather}</p>
          <button class="closer">Close</button>    
          </div>
      </div>
      <br>
      <span class="camping-item-value informationPopUpClass" id="${informationPopUpVar.informationAnchorId}"><strong><i class="fa fa-info-circle" style="font-size:20px;color:red"></i></strong></span>
      <div class="popup-overlay" id="${informationPopUpVar.popupBoxId}">
      <div class="popup-content" id=${informationPopUpVar.popupContent}>
        <h5>Informations</h5>
        <p>Number of Total Sites available : ${campInfo.campsites.totalSites}</p>
        <p>Number of Tents available : ${campInfo.campsites.tentOnly}</p>
        <p>Number of Electrical Hookups : ${campInfo.campsites.electricalHookups}</p>
        <p>Number of RV available : ${campInfo.campsites.rvOnly}</p>
        <p>Number of Boat available : ${campInfo.campsites.walkBoatTo}</p>
        <button class="closer">Close</button>    
        </div>
      </div>
    </div>
    `;
  return returnHTML;
}

/**
* Method used to create the pop-up to handle other information of the campground.
*/
function handlePopUpInformation() {
  //appends an "active" class to .popup and .popup-content when the "Open" button is clicked
  $('.container').on('click', '.informationPopUpClass', function (event) {
    let anchorId = $(this).attr('id');
    let index = anchorId.split('-')[1];
    let informationPopupBoxId = `informationPopup-${index}`;
    let informationPopupContentId = `informationContent-${index}`;
    $(`#${informationPopupBoxId}`).addClass("active");
    $(`#${informationPopupContentId}`).addClass("active");
  });

  //removes the "active" class to .popup and .popup-content when the "Close" button is clicked 
  $(".container").on("click", '.closer', function () {
    let anchorId = $(this).parent().attr('id');
    let index = anchorId.split('-')[1];
    let informationPopupBoxId = `weatherPopup-${index}`;
    let informationPopupContentId = `weatherContent-${index}`;
    $(`#${informationPopupBoxId}`).removeClass("active");
    $(`#${informationPopupContentId}`).removeClass("active");
  });

  //removes the "active" class to .popup and .popup-content when the "Close" button is clicked 
  $(".container").on("click", '.popup-overlay', function () {
    let informationPopupBoxId = $(this).attr('id');
    $(".popup-overlay, .popup-content").removeClass("active");
  });
}

/**
* Method used to create the pop-up to handle weather overview of the campground.
*/
function handlePopUpWeather() {
  //appends an "active" class to .popup and .popup-content when the "Open" button is clicked
  $('.container').on('click', '.weatherPopupClass', function (event) {
    let anchorId = $(this).attr('id');
    let index = anchorId.split('-')[1];
    let targetPopupBoxId = `weatherPopup-${index}`;
    let targetPopupContentId = `weatherContent-${index}`;
    $(`#${targetPopupBoxId}`).addClass("active");
    $(`#${targetPopupContentId}`).addClass("active");
  });

  //removes the "active" class to .popup and .popup-content when the "Close" button is clicked 
  $(".container").on("click", '.closer', function () {
    let anchorId = $(this).parent().attr('id');
    let index = anchorId.split('-')[1];
    let targetPopupBoxId = `weatherPopup-${index}`;
    let targetPopupContentId = `weatherContent-${index}`;
    $(`#${targetPopupBoxId}`).removeClass("active");
    $(`#${targetPopupContentId}`).removeClass("active");
  });

  //removes the "active" class to .popup and .popup-content when the "Close" button is clicked 
  $(".container").on("click", '.popup-overlay', function () {
    let targetPopupBoxId = $(this).attr('id');
    $(".popup-overlay, .popup-content").removeClass("active");

  });
}

/**
 * Return the HTML when no data is available.
 */
function returnHTMLforNoData(errorMessage) {
  let htmlForNoData =
    `
  <div class="alert alert-info alert-dismissible fade show text-center mb-30"><strong>${errorMessage}</strong>
  </div>
  <hr class="my-2">
  <div class="row pt-3 pb-5 mb-2">
    <div class="col-sm-6 mb-3 resetPage"><a class="btn btn-style-1 btn-primary btn-block" href="#">Back</a>
    </div>
    <div class="col-sm-6 mb-3"><a class="btn btn-style-1 btn-primary btn-block"
        href="https://www.nps.gov/index.htm"
        title="This will redirect you the NPS Website for More Information">More Information</a>
    </div>
  </div>`;
  return htmlForNoData;
}

/**
 * Method used to display in the UI when no data available.
 */
function displayNoDataAvailable(errorMessage) {
  let htmlForNoData = returnHTMLforNoData(errorMessage);

  toggleBootstrapStylesheet();
  $("body").css("background-color", "transparent");
  changeBackgroundImage();
  $('#no-results').html(htmlForNoData);
  $('#no-results').removeClass('hidden');
}

/**
* Method used to toggle the bootstrap library applied in HTML page
*/
function toggleBootstrapStylesheet() {
  if ($('link[href="https://netdna.bootstrapcdn.com/bootstrap/4.1.1/css/bootstrap.min.css"]').prop('disabled')) {
    $('link[href="https://netdna.bootstrapcdn.com/bootstrap/4.1.1/css/bootstrap.min.css"]').prop('disabled', false);
  } else {
    $('link[href="https://netdna.bootstrapcdn.com/bootstrap/4.1.1/css/bootstrap.min.css"]').prop('disabled', true);
  }
}

/**
* Use the back button to get back to the front page.
*/
function handleBackButton() {
  $('.container').on('click', '.resetPage', function (event) {
    event.preventDefault();
    location.reload();
  });
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

/**
 * Displays the subheading with animation
*/
function animatedText() {
  // Wrap every letter in a span
  $('.ml9 .letters').each(function () {
    $(this).html($(this).text().replace(/([^\x00-\x80]|\w)/g, "<span class='letter'>$&</span>"));
  });

  anime.timeline({ loop: true })
    .add({
      targets: '.ml9 .letter',
      scale: [0, 1],
      duration: 1500,
      elasticity: 600,
      delay: function (el, i) {
        return 45 * (i + 1)
      }
    }).add({
      targets: '.ml9',
      opacity: 0,
      duration: 1000,
      easing: "easeOutExpo",
      delay: 1000
    });
}

/**
 * The main function used to call the app Camp-Planner.
 */
$(function handleCampingApp() {
  console.log('App loaded! Waiting for submit!');
  toggleBootstrapStylesheet();
  checkStateSelected();
  handleSearch();
  handlePopUpWeather();
  handlePopUpInformation();
  handleBackButton();
  animatedText();
});