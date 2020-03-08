$(document).ready(function() {
  $("#right-arrow").click(function() {
    var currentSlide = $(".slide.active");
    var nextSlide = currentSlide.next();

    currentSlide.removeClass("active");

    if (nextSlide.length == 0) {
      $(".slide")
        .first()
        .addClass("active");
    }

    nextSlide.addClass("active");
  });

  $("#left-arrow").click(function() {
    var currentSlide = $(".slide.active");
    var prevSlide = currentSlide.prev();

    currentSlide.removeClass("active");

    if (prevSlide.length == 0) {
      $(".slide")
        .last()
        .addClass("active");
    }

    prevSlide.addClass("active");
  });
});
