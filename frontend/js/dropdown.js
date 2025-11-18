// Dropdown menu functionality
document.addEventListener('DOMContentLoaded', function() {
  const dropdown = document.querySelector('.dropdown');
  const dropdownToggle = document.querySelector('.dropdown-toggle');
  
  if (dropdownToggle) {
    // Toggle dropdown on click
    dropdownToggle.addEventListener('click', function(e) {
      e.preventDefault();
      dropdown.classList.toggle('open');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
      }
    });
    
    // Keep dropdown open when hovering over menu items
    const dropdownMenu = document.querySelector('.dropdown-menu');
    if (dropdownMenu) {
      dropdownMenu.addEventListener('mouseenter', function() {
        dropdown.classList.add('open');
      });
    }
  }
});
