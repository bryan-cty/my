// Show or hide the button based on the user's scroll position
window.onscroll = function () {
  var scrollToTopBtn = document.getElementById("scrollToTopBtn");
  if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
    scrollToTopBtn.style.display = "block";
  } else {
    scrollToTopBtn.style.display = "none";
  }
};

// Scroll to the top of the page when the button is clicked
function scrollToTop() {
  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;
}

var sections = document.querySelectorAll("section");
var currentSectionIndex = 0;

function scrollToSection(index) {
  sections[index].scrollIntoView({ behavior: "smooth" });
  currentSectionIndex = index;
}

window.addEventListener("wheel", function (event) {
  event.preventDefault();

  // determine direction of scroll
  var direction = event.deltaY > 0 ? "down" : "up";

  // scroll to next or previous section
  if (direction === "down" && currentSectionIndex < sections.length - 1) {
    scrollToSection(currentSectionIndex + 1);
  } else if (direction === "up" && currentSectionIndex > 0) {
    scrollToSection(currentSectionIndex - 1);
  }
});

// select navigation links
var navLinks = document.querySelectorAll(".nav-link");

// loop through navigation links and add event listener
for (var i = 0; i < navLinks.length; i++) {
  navLinks[i].addEventListener("click", closeNavbar);
}

// function to close navbar
function closeNavbar() {
  var navbar = document.querySelector(".navbar-collapse");
  if (navbar.classList.contains("show")) {
    navbar.classList.remove("show");
  }
}
