/* Технология тепла — интерактив лендинга.
   Без зависимостей: сайт должен открываться как обычный файл и работать на любом хостинге. */

(function () {
  "use strict";

  var PHONE = "+79533663012";
  var PHONE_HUMAN = "+7 (953) 366-30-12";
  var WHATSAPP = "https://wa.me/79533663012";
  // В MAX нет ссылок по номеру телефона, как в WhatsApp: нужна личная ссылка вида
  // https://max.ru/u/... из приложения (Профиль → QR-код → Поделиться). Подставьте её
  // здесь — все кнопки MAX на сайте берут адрес отсюда.
  var MAX_CHAT = "https://max.ru/";
  var EMAIL = "sgoronkov@yandex.ru";
  var LEAD_ENDPOINT = "send-lead.php";

  /* ------------------------------------------------------------ Телефон */

  function normalizePhone(raw) {
    var d = (raw || "").replace(/\D/g, "");
    if (d.charAt(0) === "8" && d.length === 11) d = "7" + d.slice(1);
    if (d.charAt(0) === "9" && d.length === 10) d = "7" + d;
    if (d && d.charAt(0) !== "7") d = "7" + d.replace(/^7+/, "");
    return d.slice(0, 11);
  }

  function formatPhone(digits) {
    var d = digits || "";
    var out = "+7";
    if (d.length > 1) out += " " + d.slice(1, 4);
    if (d.length > 4) out += " " + d.slice(4, 7);
    if (d.length > 7) out += "-" + d.slice(7, 9);
    if (d.length > 9) out += "-" + d.slice(9, 11);
    return out;
  }

  function isValidPhone(digits) {
    return /^7\d{10}$/.test(digits);
  }

  function bindPhoneInput(input) {
    input.addEventListener("focus", function () {
      if (!input.value.trim()) input.value = "+7";
    });
    input.addEventListener("input", function () {
      input.value = formatPhone(normalizePhone(input.value));
    });
    input.addEventListener("keydown", function (event) {
      if (event.key !== "Backspace") return;
      if (normalizePhone(input.value).length <= 1) {
        event.preventDefault();
        input.value = "+7";
      }
    });
  }

  /* ------------------------------------------------------------ Отправка заявки

     Основной путь — POST на серверный обработчик, который шлёт письмо.
     Если обработчика нет (сайт открыт как файл или лежит на хостинге без PHP),
     заявка не теряется: собираем её в письмо и отдаём почтовой программе. */

  function mailtoFallback(payload) {
    var lines = Object.keys(payload)
      .filter(function (key) { return key !== "website" && payload[key]; })
      .map(function (key) { return key + ": " + payload[key]; });

    window.location.href =
      "mailto:" + EMAIL +
      "?subject=" + encodeURIComponent("Заявка с сайта «Технология тепла»") +
      "&body=" + encodeURIComponent(lines.join("\n"));
  }

  function sendLead(payload) {
    return fetch(LEAD_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
          if (!response.ok || !data.ok) throw new Error(data.error || "Ошибка отправки");
          return { viaMail: false };
        });
      })
      .catch(function () {
        mailtoFallback(payload);
        return { viaMail: true };
      });
  }

  /* ------------------------------------------------------------ Галерея */

  var PROJECTS = [
    { file: "project-01", alt: "Настенный котёл, бойлер косвенного нагрева и коллекторы тёплого пола" },
    { file: "project-02", alt: "Два настенных котла с общей обвязкой и группой безопасности" },
    { file: "project-03", alt: "Узел водоподготовки и распределительные коллекторы" },
    { file: "project-04", alt: "Ввод воды с накопительной ёмкостью" },
    { file: "project-05", alt: "Котельная в деревянном доме: котёл, бойлер, расширительный бак" },
    { file: "project-06", alt: "Каскад из пяти настенных котлов" },
    { file: "project-07", alt: "Коллекторные стояки в техническом помещении" },
    { file: "project-08", alt: "Котельная с напольным бойлером и системой фильтрации" },
    { file: "project-09", alt: "Распределительный коллектор с приборами учёта" },
    { file: "project-10", alt: "Котельная со щитом автоматики и бойлером" },
    { file: "project-11", alt: "Котёл с гидравлической стрелкой и насосными группами" },
    { file: "project-12", alt: "Обвязка котла и гидроаккумулятор водоснабжения" },
    { file: "project-13", alt: "Контуры тёплого пола перед заливкой стяжки" },
    { file: "project-14", alt: "Коллектор тёплого пола и раскладка контуров" },
    { file: "project-15", alt: "Укладка тёплого пола, подготовка контуров" },
    { file: "project-16", alt: "Коллектор тёплого пола с расходомерами" },
    { file: "project-17", alt: "Тёплый пол в жилом доме перед заливкой" }
  ];

  function renderGallery() {
    var gallery = document.getElementById("gallery");
    if (!gallery) return;

    gallery.innerHTML = PROJECTS.map(function (item) {
      return (
        '<li class="gallery__item">' +
        '<a class="gallery__link" href="assets/img/projects/' + item.file + '.jpg"' +
        ' data-lightbox data-caption="' + item.alt + '">' +
        '<img src="assets/img/projects/' + item.file + '-thumb.jpg" alt="' + item.alt + '"' +
        ' width="700" height="525" loading="lazy" decoding="async">' +
        "</a></li>"
      );
    }).join("");
  }

  /* ------------------------------------------------------------ Мобильное меню в шапке */

  function initMenu() {
    var burger = document.getElementById("burger");
    var nav = document.getElementById("nav");
    if (!burger || !nav) return;

    function setOpen(open) {
      nav.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    }

    burger.addEventListener("click", function () {
      setOpen(burger.getAttribute("aria-expanded") !== "true");
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setOpen(false);
    });
  }

  /* ------------------------------------------------------------ Шапка и подсветка пунктов меню */

  function initHeader() {
    var header = document.getElementById("header");
    var fab = document.querySelector(".fab");
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav__list a[href^="#"]'));
    var sections = links
      .map(function (link) { return document.querySelector(link.getAttribute("href")); })
      .filter(Boolean);

    function onScroll() {
      var y = window.scrollY;
      if (header) header.classList.toggle("is-stuck", y > 8);
      if (fab) fab.classList.toggle("is-visible", y > 700);

      var activeIndex = -1;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].getBoundingClientRect().top <= 140) activeIndex = i;
      }
      links.forEach(function (link, i) {
        link.classList.toggle("is-active", i === activeIndex);
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ------------------------------------------------------------ Аккордеон */

  function initAccordion() {
    var items = document.querySelectorAll(".acc");

    Array.prototype.forEach.call(items, function (item) {
      var head = item.querySelector(".acc__head");
      if (!head) return;

      item.classList.toggle("is-open", head.getAttribute("aria-expanded") === "true");

      head.addEventListener("click", function () {
        var open = head.getAttribute("aria-expanded") !== "true";
        head.setAttribute("aria-expanded", String(open));
        item.classList.toggle("is-open", open);
      });
    });
  }

  /* ------------------------------------------------------------ Лайтбокс */

  function initLightbox() {
    var box = document.getElementById("lightbox");
    var image = document.getElementById("lightbox-img");
    var caption = document.getElementById("lightbox-caption");
    if (!box || !image || !caption) return;

    var links = [];
    var index = 0;
    var lastFocused = null;

    function collect() {
      links = Array.prototype.slice.call(document.querySelectorAll("[data-lightbox]"));
    }

    function show(i) {
      index = (i + links.length) % links.length;
      var link = links[index];
      image.src = link.getAttribute("href");
      image.alt = link.getAttribute("data-caption") || "";
      caption.textContent = link.getAttribute("data-caption") || "";
    }

    function open(i) {
      lastFocused = document.activeElement;
      box.hidden = false;
      document.body.style.overflow = "hidden";
      show(i);
      box.querySelector(".lightbox__close").focus();
    }

    function close() {
      box.hidden = true;
      image.src = "";
      document.body.style.overflow = "";
      if (lastFocused) lastFocused.focus();
    }

    collect();

    document.addEventListener("click", function (event) {
      var link = event.target.closest("[data-lightbox]");
      if (!link) return;
      event.preventDefault();
      collect();
      open(links.indexOf(link));
    });

    box.addEventListener("click", function (event) {
      if (event.target.closest(".lightbox__close") || event.target === box) return close();
      if (event.target.closest(".lightbox__nav--prev")) show(index - 1);
      if (event.target.closest(".lightbox__nav--next")) show(index + 1);
    });

    document.addEventListener("keydown", function (event) {
      if (box.hidden) return;
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") show(index - 1);
      if (event.key === "ArrowRight") show(index + 1);
    });
  }

  /* ------------------------------------------------------------ Попап заявки */

  function toggleError(id, show) {
    var el = document.getElementById(id);
    if (el) el.classList.toggle("is-shown", Boolean(show));
  }

  function initLeadModal() {
    var overlay = document.getElementById("leadModal");
    var form = document.getElementById("leadForm");
    if (!overlay || !form) return;

    var nameInput = document.getElementById("leadName");
    var phoneInput = document.getElementById("leadPhone");
    var privacy = document.getElementById("leadPrivacy");
    var privacyRow = document.getElementById("leadPrivacyRow");
    var formWrap = document.getElementById("leadModalFormWrap");
    var success = document.getElementById("leadModalSuccess");
    var submitBtn = document.getElementById("leadSubmitBtn");
    var sendError = document.getElementById("leadSendError");
    var lastFocused = null;

    bindPhoneInput(phoneInput);

    function open() {
      lastFocused = document.activeElement;
      overlay.hidden = false;
      requestAnimationFrame(function () { overlay.classList.add("is-open"); });
      document.body.classList.add("modal-open");

      form.reset();
      formWrap.style.display = "";
      success.classList.remove("is-shown");
      phoneInput.value = "+7";
      nameInput.classList.remove("is-invalid");
      phoneInput.classList.remove("is-invalid");
      privacyRow.classList.remove("is-invalid");
      ["leadNameError", "leadPhoneError", "leadPrivacyError", "leadSendError"].forEach(function (id) {
        toggleError(id, false);
      });

      setTimeout(function () { nameInput.focus(); }, 60);
    }

    function close() {
      overlay.classList.remove("is-open");
      document.body.classList.remove("modal-open");
      setTimeout(function () { overlay.hidden = true; }, 250);
      if (lastFocused) lastFocused.focus();
    }

    document.addEventListener("click", function (event) {
      var trigger = event.target.closest(".js-open-lead");
      if (!trigger) return;
      event.preventDefault();
      open();
    });

    document.getElementById("leadModalClose").addEventListener("click", close);
    document.getElementById("leadModalDone").addEventListener("click", close);

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) close();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && overlay.classList.contains("is-open")) close();
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var name = nameInput.value.trim();
      var digits = normalizePhone(phoneInput.value);
      var valid = true;

      toggleError("leadSendError", false);
      sendError.textContent = "";

      nameInput.classList.toggle("is-invalid", !name);
      toggleError("leadNameError", !name);
      if (!name) valid = false;

      phoneInput.classList.toggle("is-invalid", !isValidPhone(digits));
      toggleError("leadPhoneError", !isValidPhone(digits));
      if (!isValidPhone(digits)) valid = false;

      privacyRow.classList.toggle("is-invalid", !privacy.checked);
      toggleError("leadPrivacyError", !privacy.checked);
      if (!privacy.checked) valid = false;

      if (!valid) return;

      submitBtn.disabled = true;
      submitBtn.textContent = "Отправляем…";

      sendLead({
        name: name,
        phone: "+" + digits,
        source: "Попап заявки",
        website: document.getElementById("leadWebsite").value
      }).then(function (result) {
        formWrap.style.display = "none";
        success.classList.add("is-shown");
        if (result.viaMail) {
          success.querySelector("p").textContent =
            "Заявка открыта в вашей почтовой программе — отправьте письмо, и мы свяжемся с вами. " +
            "Если письмо не открылось, позвоните: " + PHONE_HUMAN;
        }
      }).then(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Отправить заявку";
      });
    });
  }

  /* ------------------------------------------------------------ Подробная форма в секции заявки */

  function initSectionForm() {
    var form = document.getElementById("lead-form");
    if (!form) return;

    var status = document.getElementById("form-status");
    var phone = form.querySelector("#f-phone");

    bindPhoneInput(phone);

    function setError(field, message) {
      var wrap = field.closest(".field") || field.closest(".consent");
      var box = document.querySelector('[data-error-for="' + (field.id || field.name) + '"]');
      if (wrap && wrap.classList) wrap.classList.toggle("has-error", Boolean(message));
      if (box) {
        box.textContent = message || "";
        box.classList.toggle("is-visible", Boolean(message));
      }
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var name = form.elements.name;
      var area = form.elements.area;
      var consent = form.elements.consent;
      var digits = normalizePhone(phone.value);
      var ok = true;

      if (!name.value.trim()) {
        setError(name, "Напишите, как к вам обращаться");
        ok = false;
      } else setError(name, "");

      if (!isValidPhone(digits)) {
        setError(phone, "Укажите номер полностью");
        ok = false;
      } else setError(phone, "");

      if (area.value && (Number(area.value) < 10 || Number(area.value) > 2000)) {
        setError(area, "Похоже на опечатку — проверьте площадь");
        ok = false;
      } else setError(area, "");

      if (!consent.checked) {
        setError(consent, "Нужно согласие на обработку данных");
        ok = false;
      } else setError(consent, "");

      if (!ok) {
        var firstInvalid = form.querySelector(".has-error input, .has-error textarea");
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      var scope = Array.prototype.slice
        .call(form.querySelectorAll('input[name="scope"]:checked'))
        .map(function (input) { return input.value; })
        .join(", ");

      var button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      button.textContent = "Отправляем…";

      sendLead({
        name: name.value.trim(),
        phone: "+" + digits,
        area: area.value ? area.value + " м²" : "",
        scope: scope,
        comment: form.elements.comment.value.trim(),
        source: "Форма в секции заявки",
        website: form.elements.website.value
      }).then(function (result) {
        status.textContent = result.viaMail
          ? "Заявка открыта в почтовой программе — отправьте письмо. Если оно не открылось, позвоните: " + PHONE_HUMAN
          : "Заявка отправлена. Перезвоним в рабочее время.";
        status.classList.add("is-visible", "is-ok");
        form.reset();
        button.disabled = false;
        button.textContent = "Отправить заявку";
      });
    });
  }

  /* ------------------------------------------------------------ Нижний док на мобильных */

  var ICON = {
    chat:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
      '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
    phone:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
      '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    whatsapp:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.87 1.22 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35zM12.05 21.8h-.02a9.77 9.77 0 0 1-4.98-1.36l-.36-.21-3.7.97.99-3.61-.23-.37a9.76 9.76 0 0 1-1.5-5.22c0-5.4 4.4-9.79 9.8-9.79 2.62 0 5.08 1.02 6.93 2.87a9.73 9.73 0 0 1 2.87 6.93c0 5.4-4.4 9.79-9.8 9.79zM20.52 3.45A11.7 11.7 0 0 0 12.05 0C5.58 0 .32 5.26.32 11.73c0 2.07.54 4.09 1.57 5.87L.22 24l6.55-1.72a11.7 11.7 0 0 0 5.28 1.34h.01c6.47 0 11.73-5.26 11.73-11.73 0-3.13-1.22-6.08-3.44-8.3z"/></svg>',
    max:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
      '<rect x="3" y="3" width="18" height="18" rx="5.5"/><path d="M8 16.2V8.4l4 4.2 4-4.2v7.8"/></svg>',
    mail:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
      '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    burger:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">' +
      '<path d="M4 7h16M4 12h16M4 17h16"/></svg>'
  };

  function initMobileDock() {
    if (window.matchMedia("(min-width: 861px)").matches) return;

    document.body.classList.add("has-mobile-dock");

    var dock = document.createElement("div");
    dock.className = "mobile-dock";
    dock.innerHTML = [
      '<div class="mobile-dock-half">',
      '<button class="mobile-dock-btn" id="dockContactBtn" type="button" aria-expanded="false" aria-label="Способы связи">',
      ICON.chat, "<span>Связаться</span></button>",
      '<div class="mobile-dock-flyout" id="dockContactFlyout" role="menu">',
      '<a href="tel:' + PHONE + '" role="menuitem" aria-label="Позвонить">' + ICON.phone + "</a>",
      '<a href="' + WHATSAPP + '" target="_blank" rel="noopener" role="menuitem" aria-label="WhatsApp">' + ICON.whatsapp + "</a>",
      '<a href="' + MAX_CHAT + '" target="_blank" rel="noopener" role="menuitem" aria-label="Написать в MAX">' + ICON.max + "</a>",
      '<a href="mailto:' + EMAIL + '" role="menuitem" aria-label="Написать на почту">' + ICON.mail + "</a>",
      "</div></div>",
      '<div class="mobile-dock-half">',
      '<button class="mobile-dock-btn" id="dockMenuBtn" type="button" aria-expanded="false" aria-label="Меню">',
      ICON.burger, "<span>Меню</span></button>",
      "</div>"
    ].join("");
    document.body.appendChild(dock);

    var backdrop = document.createElement("div");
    backdrop.className = "mobile-dock-backdrop";
    document.body.appendChild(backdrop);

    var panel = document.createElement("div");
    panel.className = "mobile-dock-nav";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "Навигация");
    panel.innerHTML = [
      '<div class="mobile-dock-nav-header">',
      '<a class="mobile-dock-nav-logo" href="#top">Технология <span>тепла</span></a>',
      '<button class="mobile-dock-nav-close" type="button" aria-label="Закрыть">×</button>',
      "</div>",
      '<ul class="mobile-dock-nav-list">',
      '<li><a href="#services">Услуги</a></li>',
      '<li><a href="#mistakes">5 переплат</a></li>',
      '<li><a href="#design">Проектирование</a></li>',
      '<li><a href="#projects">Проекты</a></li>',
      '<li><a href="#process">Как работаем</a></li>',
      '<li><a href="#contacts">Контакты</a></li>',
      '<li><button class="dock-nav-cta js-open-lead" type="button">Оставить заявку</button></li>',
      "</ul>"
    ].join("");
    document.body.appendChild(panel);

    var contactBtn = document.getElementById("dockContactBtn");
    var flyout = document.getElementById("dockContactFlyout");
    var menuBtn = document.getElementById("dockMenuBtn");

    function closeContact() {
      flyout.classList.remove("is-open");
      contactBtn.classList.remove("is-active");
      contactBtn.setAttribute("aria-expanded", "false");
    }

    function closeMenu() {
      panel.classList.remove("is-open");
      menuBtn.classList.remove("is-active");
      menuBtn.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    }

    function closeAll() {
      closeContact();
      closeMenu();
      backdrop.classList.remove("is-open");
    }

    contactBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      var open = !flyout.classList.contains("is-open");
      closeAll();
      if (!open) return;
      flyout.classList.add("is-open");
      contactBtn.classList.add("is-active");
      contactBtn.setAttribute("aria-expanded", "true");
      backdrop.classList.add("is-open");
    });

    menuBtn.addEventListener("click", function () {
      var open = !panel.classList.contains("is-open");
      closeAll();
      if (!open) return;
      panel.classList.add("is-open");
      menuBtn.classList.add("is-active");
      menuBtn.setAttribute("aria-expanded", "true");
      backdrop.classList.add("is-open");
      document.body.style.overflow = "hidden";
    });

    backdrop.addEventListener("click", closeAll);
    panel.querySelector(".mobile-dock-nav-close").addEventListener("click", closeAll);
    panel.addEventListener("click", function (event) {
      if (event.target.closest("a, button")) closeAll();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeAll();
    });
  }

  /* ------------------------------------------------------------ Появление блоков при скролле */

  function initReveal() {
    if (!("IntersectionObserver" in window)) return;

    var targets = document.querySelectorAll(
      ".section__head, .card, .stat, .acc, .conclusion, .design, .step, .contacts__item, .form, .lead__text, .callout"
    );

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -60px 0px" });

    Array.prototype.forEach.call(targets, function (target) {
      target.classList.add("reveal");
      observer.observe(target);
    });
  }

  /* ------------------------------------------------------------ Запуск */

  function init() {
    var year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());

    Array.prototype.forEach.call(document.querySelectorAll(".js-max-link"), function (link) {
      link.href = MAX_CHAT;
    });

    renderGallery();
    initMenu();
    initHeader();
    initAccordion();
    initLightbox();
    initLeadModal();
    initSectionForm();
    initMobileDock();
    initReveal();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
