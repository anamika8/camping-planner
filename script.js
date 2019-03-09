'use strict';

function handleSearch() {
    $('.search-button').on('click', function(event) {
      $('.js-container').addClass('hidden');
      changeBackgroundImage();
    });
  }

  function changeBackgroundImage() {
    $("html").css("background-image", "url('https://images.unsplash.com/photo-1446483284190-e09276f22d63?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1050&q=80')");
  }

  function handleCampingApp() {
    handleSearch();
  }

  // when the page loads, call `handleCampingApp`
  $(handleCampingApp);