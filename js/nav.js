(function () {
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  var scrim = document.querySelector('.nav-scrim');
  if (!toggle || !links) return;

  function close() {
    links.classList.remove('nav-open');
    toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    if (scrim) scrim.classList.remove('nav-open');
    document.body.style.overflow = '';
  }

  function open() {
    links.classList.add('nav-open');
    toggle.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    if (scrim) scrim.classList.add('nav-open');
    document.body.style.overflow = 'hidden';
  }

  toggle.addEventListener('click', function () {
    if (links.classList.contains('nav-open')) close(); else open();
  });
  if (scrim) scrim.addEventListener('click', close);
  links.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', close);
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth > 768) close();
  });
})();
