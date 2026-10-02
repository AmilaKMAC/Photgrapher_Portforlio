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

  /* ---------- Portfolio: albums built from assets/portfolio.json ---------- */
  var COLORS = ['cobalt', 'yellow', 'pink', 'teal', 'ink'];

  var portfolioGrid = document.getElementById('portfolioGrid');
  var portfolioEmpty = document.getElementById('portfolioEmpty');
  var filterBar = document.getElementById('filterBar');
  var shotsRow = document.getElementById('latestShotsRow');
  var shotsPrev = document.getElementById('shotsPrev');
  var shotsNext = document.getElementById('shotsNext');

  var categoryInfo = {};   // id -> { label, color }
  var albums = [];

  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // Encode file paths so folder/file names containing spaces or symbols still load.
  function url(path) { return encodeURI(path); }

  function albumCardHTML(album, index) {
    var cat = categoryInfo[album.category] || { label: album.category, color: 'ink' };
    var countText = album.count === 1 ? '1 photo' : album.count + ' photos';
    return (
      '<div class="col-md-6 col-lg-4 portfolio-item" data-category="' + esc(album.category) + '">' +
        '<div class="work-card" role="button" tabindex="0" data-album-index="' + index + '" ' +
             'aria-label="Open album: ' + esc(album.title) + '">' +
          '<span class="plate-tag plate-tag--' + cat.color + '">' + esc(cat.label) + '</span>' +
          (album.count > 1 ? '<span class="album-count"><i class="bi bi-images"></i> ' + album.count + '</span>' : '') +
          '<img src="' + esc(url(album.cover)) + '" class="img-fluid" alt="' + esc(album.title) + '" loading="lazy">' +
          '<div class="work-card__caption"><h3>' + esc(album.title) + '</h3><p>' + esc(cat.label) + ' · ' + countText + '</p></div>' +
        '</div>' +
      '</div>'
    );
  }

  function buildFilters(categories) {
    if (!filterBar) return;
    var html = '<button class="filter-chip active" data-filter="all">All work</button>';
    categories.forEach(function (c) {
      html += '<button class="filter-chip" data-filter="' + esc(c.id) + '">' +
              '<i class="dot dot--' + categoryInfo[c.id].color + '"></i>' + esc(c.label) + '</button>';
    });
    filterBar.innerHTML = html;

    var chips = filterBar.querySelectorAll('.filter-chip');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        var filter = chip.getAttribute('data-filter');
        document.querySelectorAll('.portfolio-item').forEach(function (item) {
          item.classList.toggle('hidden', !(filter === 'all' || item.getAttribute('data-category') === filter));
        });
      });
    });
  }

  /* ----- Hero "Latest shots" strip (album covers, newest first) ----- */
  var shotsIndex = 0;
  function renderShots() {
    if (!shotsRow || albums.length === 0) return;
    shotsRow.innerHTML = '';
    var visibleCount = Math.min(3, albums.length);
    for (var i = 0; i < visibleCount; i++) {
      var album = albums[(shotsIndex + i) % albums.length];
      var img = document.createElement('img');
      img.src = url(album.cover);
      img.alt = album.title;
      img.loading = 'lazy';
      img.tabIndex = 0;
      img.setAttribute('role', 'button');
      (function (a) {
        var open = function () { openAlbum(a); };
        img.addEventListener('click', open);
        img.addEventListener('keydown', function (e) { if (e.key === 'Enter') open(); });
      })(album);
      shotsRow.appendChild(img);
    }
  }
  if (shotsPrev) shotsPrev.addEventListener('click', function () {
    if (albums.length === 0) return;
    shotsIndex = (shotsIndex - 1 + albums.length) % albums.length;
    renderShots();
  });
  if (shotsNext) shotsNext.addEventListener('click', function () {
    if (albums.length === 0) return;
    shotsIndex = (shotsIndex + 1) % albums.length;
    renderShots();
  });

  /* ----- Album modal: thumbnail grid + full-size viewer with prev/next ----- */
  var albumModalEl = document.getElementById('albumModal');
  var albumModal = albumModalEl ? bootstrap.Modal.getOrCreateInstance(albumModalEl) : null;
  var albumGrid = document.getElementById('albumGrid');
  var albumViewer = document.getElementById('albumViewer');
  var viewerImg = document.getElementById('viewerImg');
  var viewerCaption = document.getElementById('viewerCaption');
  var currentAlbum = null;
  var currentPhoto = 0;

  function showGrid() {
    albumViewer.classList.add('d-none');
    albumGrid.classList.remove('d-none');
    document.getElementById('albumHead').classList.remove('d-none');
  }

  function showPhoto(i) {
    if (!currentAlbum) return;
    var n = currentAlbum.photos.length;
    currentPhoto = (i + n) % n;
    var photo = currentAlbum.photos[currentPhoto];
    viewerImg.src = url(photo.src);
    viewerImg.alt = photo.title;
    viewerCaption.textContent = currentAlbum.title + '  ·  ' + (currentPhoto + 1) + ' / ' + n;
    albumViewer.classList.toggle('single', n === 1);
    albumGrid.classList.add('d-none');
    document.getElementById('albumHead').classList.add('d-none');
    albumViewer.classList.remove('d-none');
  }

  function openAlbum(album) {
    if (!albumModal) return;
    currentAlbum = album;
    var cat = categoryInfo[album.category] || { label: album.category, color: 'ink' };

    var tag = document.getElementById('albumCategory');
    tag.textContent = cat.label;
    tag.className = 'plate-tag plate-tag--' + cat.color;
    document.getElementById('albumTitle').textContent = album.title;
    document.getElementById('albumCount').textContent =
      album.count === 1 ? '1 photo' : album.count + ' photos';

    albumGrid.innerHTML = album.photos.map(function (p, i) {
      return '<button type="button" class="album-thumb" data-photo-index="' + i + '" aria-label="View photo ' + (i + 1) + '">' +
             '<img src="' + esc(url(p.src)) + '" alt="' + esc(p.title) + '" loading="lazy"></button>';
    }).join('');

    // One-photo albums skip the grid and open straight to the photo.
    if (album.photos.length === 1) {
      showPhoto(0);
    } else {
      showGrid();
    }
    albumModal.show();
  }

  if (albumGrid) {
    albumGrid.addEventListener('click', function (e) {
      var thumb = e.target.closest('.album-thumb');
      if (thumb) showPhoto(parseInt(thumb.getAttribute('data-photo-index'), 10));
    });
  }
  var viewerBack = document.getElementById('viewerBack');
  if (viewerBack) viewerBack.addEventListener('click', function () {
    if (currentAlbum && currentAlbum.photos.length === 1) { albumModal.hide(); } else { showGrid(); }
  });
  var viewerPrev = document.getElementById('viewerPrev');
  var viewerNext = document.getElementById('viewerNext');
  if (viewerPrev) viewerPrev.addEventListener('click', function () { showPhoto(currentPhoto - 1); });
  if (viewerNext) viewerNext.addEventListener('click', function () { showPhoto(currentPhoto + 1); });

  if (albumModalEl) {
    albumModalEl.addEventListener('keydown', function (e) {
      if (albumViewer.classList.contains('d-none')) return;
      if (e.key === 'ArrowLeft') showPhoto(currentPhoto - 1);
      if (e.key === 'ArrowRight') showPhoto(currentPhoto + 1);
    });
    // Touch swipe on the viewer
    var touchX = null;
    albumViewer.addEventListener('touchstart', function (e) { touchX = e.changedTouches[0].clientX; }, { passive: true });
    albumViewer.addEventListener('touchend', function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) showPhoto(currentPhoto + (dx < 0 ? 1 : -1));
      touchX = null;
    }, { passive: true });
    albumModalEl.addEventListener('hidden.bs.modal', function () { viewerImg.src = ''; });
  }

  /* ----- Load the manifest and render everything ----- */
  if (portfolioGrid) {
    fetch('assets/portfolio.json')
      .then(function (res) {
        if (!res.ok) throw new Error('manifest not found');
        return res.json();
      })
      .then(function (data) {
        var categories = data.categories || [];
        albums = data.albums || [];
        if (albums.length === 0) {
          if (portfolioEmpty) portfolioEmpty.classList.remove('d-none');
          return;
        }
        categories.forEach(function (c, i) {
          categoryInfo[c.id] = { label: c.label, color: COLORS[i % COLORS.length] };
        });
        buildFilters(categories);
        portfolioGrid.innerHTML = albums.map(albumCardHTML).join('');
        portfolioGrid.addEventListener('click', function (e) {
          var card = e.target.closest('.work-card');
          if (card) openAlbum(albums[parseInt(card.getAttribute('data-album-index'), 10)]);
        });
        portfolioGrid.addEventListener('keydown', function (e) {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          var card = e.target.closest('.work-card');
          if (card) { e.preventDefault(); openAlbum(albums[parseInt(card.getAttribute('data-album-index'), 10)]); }
        });
        renderShots();
      })
      .catch(function () {
        // Most likely opened via file:// or the manifest hasn't been generated yet.
        if (portfolioEmpty) {
          portfolioEmpty.classList.remove('d-none');
          portfolioEmpty.textContent = 'Couldn\'t load the photo list. If you\'re previewing locally, run it through a local server (see README) rather than opening the file directly.';
        }
      });
  }

  /* ---------- Contact form validation + AJAX submit (Formspree) ---------- */
  var form = document.getElementById('contactForm');
  var emailEl = document.getElementById('contactEmail');
  var contactEmail = emailEl ? emailEl.textContent.trim() : 'us';
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
          statusEl.textContent = 'Something went wrong sending that. Please try again or email ' + contactEmail + ' directly.';
        }
      }).catch(function () {
        statusEl.textContent = 'Something went wrong sending that. Please try again or email ' + contactEmail + ' directly.';
      });
    }, false);
  }

});
