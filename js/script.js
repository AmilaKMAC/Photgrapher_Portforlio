document.addEventListener('DOMContentLoaded', function () {

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Sticky nav background on scroll ---------- */
  var nav = document.getElementById('siteNav');
  function toggleNavBg() {
    if (window.scrollY > 40) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }
  toggleNavBg();
  window.addEventListener('scroll', toggleNavBg);

  /* ---------- Collapse mobile menu after clicking a link ---------- */
  var navLinks = document.querySelectorAll('#navMenu .nav-link');
  var navMenuEl = document.getElementById('navMenu');
  navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      if (navMenuEl.classList.contains('show')) {
        var bsCollapse = bootstrap.Collapse.getOrCreateInstance(navMenuEl);
        bsCollapse.hide();
      }
    });
  });

  /* ---------- Active nav link highlighting via scroll position ---------- */
  var sections = document.querySelectorAll('section[id], header[id]');
  var navLinkMap = {};
  navLinks.forEach(function (link) {
    var id = link.getAttribute('href').replace('#', '');
    navLinkMap[id] = link;
  });

  var navObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var id = entry.target.getAttribute('id');
      var link = navLinkMap[id];
      if (!link) return;
      if (entry.isIntersecting) {
        Object.values(navLinkMap).forEach(function (l) { l.classList.remove('active'); });
        link.classList.add('active');
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

  sections.forEach(function (s) { navObserver.observe(s); });

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll('[data-reveal]');
  var revealObserver = new IntersectionObserver(function (entries, obs) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(function (el) { revealObserver.observe(el); });

  /* ---------- Portfolio: build cards + hero strip from assets/portfolio.json ---------- */
  var CATEGORY_LABELS = { weddings: 'Weddings', portraits: 'Portraits', events: 'Events', commercial: 'Commercial' };
  var CATEGORY_COLORS = { weddings: 'cobalt', portraits: 'yellow', events: 'pink', commercial: 'ink' };

  var portfolioGrid = document.getElementById('portfolioGrid');
  var portfolioEmpty = document.getElementById('portfolioEmpty');
  var shotsRow = document.getElementById('latestShotsRow');
  var shotsPrev = document.getElementById('shotsPrev');
  var shotsNext = document.getElementById('shotsNext');

  function cardHTML(item) {
    var label = CATEGORY_LABELS[item.category] || item.category;
    var color = CATEGORY_COLORS[item.category] || 'ink';
    return (
      '<div class="col-md-6 col-lg-4 portfolio-item" data-category="' + item.category + '">' +
        '<div class="work-card" data-bs-toggle="modal" data-bs-target="#lightboxModal" ' +
             'data-title="' + item.title + '" data-category-label="' + label + '" data-desc="" data-img="' + item.src + '">' +
          '<span class="plate-tag plate-tag--' + color + '">' + label + '</span>' +
          '<img src="' + item.src + '" class="img-fluid" alt="' + item.title + '" loading="lazy">' +
          '<div class="work-card__caption"><h3>' + item.title + '</h3><p>' + label + '</p></div>' +
        '</div>' +
      '</div>'
    );
  }

  function initFilters() {
    var filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        filterChips.forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        var filter = chip.getAttribute('data-filter');
        document.querySelectorAll('.portfolio-item').forEach(function (item) {
          var category = item.getAttribute('data-category');
          item.classList.toggle('hidden', !(filter === 'all' || category === filter));
        });
      });
    });
  }

  var shots = [];
  var shotsIndex = 0;
  function renderShots() {
    if (!shotsRow || shots.length === 0) return;
    shotsRow.innerHTML = '';
    var visibleCount = Math.min(3, shots.length);
    for (var i = 0; i < visibleCount; i++) {
      var shot = shots[(shotsIndex + i) % shots.length];
      var img = document.createElement('img');
      img.src = shot.src;
      img.alt = shot.title || 'Portfolio piece';
      img.loading = 'lazy';
      shotsRow.appendChild(img);
    }
  }

  if (portfolioGrid) {
    fetch('assets/portfolio.json')
      .then(function (res) {
        if (!res.ok) throw new Error('manifest not found');
        return res.json();
      })
      .then(function (items) {
        if (!items || items.length === 0) {
          if (portfolioEmpty) portfolioEmpty.classList.remove('d-none');
          return;
        }
        portfolioGrid.innerHTML = items.map(cardHTML).join('');
        shots = items;
        renderShots();
      })
      .catch(function () {
        // Most likely opened via file:// (browsers block fetch of local JSON that way)
        // or the manifest hasn't been generated yet. Deploys via the GitHub Action
        // generate it automatically — see README "Local preview" section.
        if (portfolioEmpty) {
          portfolioEmpty.classList.remove('d-none');
          portfolioEmpty.textContent = 'Couldn\'t load the photo list. If you\'re previewing locally, run it through a local server (see README) rather than opening the file directly.';
        }
      })
      .finally(function () {
        initFilters();
      });
  }

  if (shotsPrev) shotsPrev.addEventListener('click', function () {
    if (shots.length === 0) return;
    shotsIndex = (shotsIndex - 1 + shots.length) % shots.length;
    renderShots();
  });
  if (shotsNext) shotsNext.addEventListener('click', function () {
    if (shots.length === 0) return;
    shotsIndex = (shotsIndex + 1) % shots.length;
    renderShots();
  });

  /* ---------- Lightbox modal population ---------- */
  var lightboxModal = document.getElementById('lightboxModal');
  if (lightboxModal) {
    lightboxModal.addEventListener('show.bs.modal', function (event) {
      var trigger = event.relatedTarget;
      if (!trigger) return;

      var img = trigger.getAttribute('data-img');
      var title = trigger.getAttribute('data-title');
      var desc = trigger.getAttribute('data-desc');
      var categoryLabel = trigger.getAttribute('data-category-label');

      document.getElementById('lightboxImg').src = img;
      document.getElementById('lightboxImg').alt = title || '';
      document.getElementById('lightboxTitle').textContent = title || '';
      var descEl = document.getElementById('lightboxDesc');
      descEl.textContent = desc || '';
      descEl.classList.toggle('d-none', !desc);

      var catEl = document.getElementById('lightboxCategory');
      catEl.textContent = categoryLabel || '';
      catEl.className = 'plate-tag'; // reset
      var colorMap = { Weddings: 'plate-tag--cobalt', Portraits: 'plate-tag--yellow', Events: 'plate-tag--pink', Commercial: 'plate-tag--ink' };
      if (colorMap[categoryLabel]) catEl.classList.add(colorMap[categoryLabel]);
    });
  }

  /* ---------- Contact form validation + AJAX submit (Formspree) ---------- */
  var form = document.getElementById('contactForm');
  var statusEl = document.getElementById('formStatus');

  if (form) {
    form.addEventListener('submit', function (event) {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
        form.classList.add('was-validated');
        return;
      }

      // If the action still points at the placeholder, don't attempt a real submit.
      var action = form.getAttribute('action') || '';
      if (action.indexOf('YOUR_FORM_ID') !== -1) {
        event.preventDefault();
        statusEl.textContent = 'Form endpoint not configured yet — add a Formspree form ID in index.html to activate this form.';
        return;
      }

      // Submit via fetch so we can show an inline confirmation instead of a redirect.
      event.preventDefault();
      var data = new FormData(form);
      statusEl.textContent = 'Sending…';

      fetch(action, {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json' }
      }).then(function (response) {
        if (response.ok) {
          statusEl.textContent = 'Thanks — your message is on its way. I\'ll reply within two business days.';
          form.reset();
          form.classList.remove('was-validated');
        } else {
          statusEl.textContent = 'Something went wrong sending that. Please try again or email hello@mayareyesdesign.com directly.';
        }
      }).catch(function () {
        statusEl.textContent = 'Something went wrong sending that. Please try again or email hello@mayareyesdesign.com directly.';
      });
    }, false);
  }

});
