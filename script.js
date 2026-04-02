const header = document.querySelector(".site-header");
const revealItems = document.querySelectorAll(".reveal");
const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");

const contactForm = document.querySelector("#contact-form");
const formStatus = document.querySelector("#form-status");
const WORKER_URL = "https://natalia-nutri.ivantimockin19.workers.dev";
const REQUEST_TIMEOUT_MS = 15000;

const portalAuth = document.querySelector("#portal-auth");
const portalDashboard = document.querySelector("#portal-dashboard");
const registerForm = document.querySelector("#register-form");
const loginForm = document.querySelector("#login-form");
const authStatus = document.querySelector("#portal-auth-status");
const bookingForm = document.querySelector("#booking-form");
const bookingStatus = document.querySelector("#booking-status");
const appointmentList = document.querySelector("#appointment-list");
const chatLog = document.querySelector("#chat-log");
const chatForm = document.querySelector("#chat-form");
const chatStatus = document.querySelector("#chat-status");
const logoutButton = document.querySelector("#portal-logout");
const portalUserName = document.querySelector("#portal-user-name");
const portalUserEmail = document.querySelector("#portal-user-email");
const chatGateNote = document.querySelector("#chat-gate-note");
const clearSystemNoticesButton = document.querySelector("#clear-system-notices");
const portalTabs = document.querySelectorAll("[data-portal-tab]");

const USERS_STORAGE_KEY = "nutri_portal_users";
const SESSION_STORAGE_KEY = "nutri_portal_session";
const LEADS_STORAGE_KEY = "nutri_portal_leads";
const DEMO_USER = {
  name: "Тестовый клиент",
  email: "test",
  password: "test",
  appointments: [
    {
      id: "demo-appointment-1",
      service: "Первичная консультация",
      date: "2026-04-08T11:00",
      notes: "Хочу обсудить питание, уровень энергии и режим дня.",
      status: "scheduled",
    },
  ],
  chat: [
    {
      id: "demo-chat-1",
      author: "Система",
      text: "Тестовая запись активна. Здесь можно посмотреть, как работает кабинет.",
      time: "2026-04-01T09:00:00.000Z",
    },
    {
      id: "demo-chat-2",
      author: "Наталья",
      text: "Здравствуйте! Это тестовый режим кабинета. После записи здесь открывается чат и управление приемом.",
      time: "2026-04-01T09:05:00.000Z",
    },
  ],
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const syncHeader = () => {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 12);
};

syncHeader();
window.addEventListener("scroll", syncHeader);

if (revealItems.length) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.18,
  });

  revealItems.forEach((item) => observer.observe(item));
}

if (toggle && nav) {
  toggle.addEventListener("click", () => {
    nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(nav.classList.contains("is-open")));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

const readUsers = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeUsers = (users) => {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

const ensureDemoUser = () => {
  const users = readUsers();
  const hasDemoUser = users.some((user) => user.email === DEMO_USER.email);
  if (!hasDemoUser) {
    users.push(DEMO_USER);
    writeUsers(users);
  }
};

const readLeads = () => {
  try {
    return JSON.parse(localStorage.getItem(LEADS_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const storeLeadLocally = (payload) => {
  const leads = readLeads();
  leads.unshift({
    id: crypto.randomUUID(),
    ...payload,
    createdAt: new Date().toISOString(),
    source: "local-fallback",
  });
  localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads.slice(0, 50)));
};

const getSessionEmail = () => localStorage.getItem(SESSION_STORAGE_KEY) || "";

const setSessionEmail = (email) => {
  if (email) {
    localStorage.setItem(SESSION_STORAGE_KEY, email);
  } else {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
};

const getCurrentUser = () => {
  const email = getSessionEmail();
  return readUsers().find((user) => user.email === email) || null;
};

const saveCurrentUser = (nextUser) => {
  const users = readUsers().map((user) => (user.email === nextUser.email ? nextUser : user));
  writeUsers(users);
};

const hasActiveAppointment = (user) =>
  Boolean(user?.appointments?.some((item) => item.status !== "cancelled"));

const formatDateTime = (value) => {
  if (!value) return "Дата не указана";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const pad = (value) => String(value).padStart(2, "0");

const toDateValue = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const getBookingDateField = () => bookingForm?.querySelector('input[name="bookingDate"]') || null;
const getBookingTimeField = () => bookingForm?.querySelector('input[name="bookingTime"]') || null;

const getEarliestBookingDate = () => {
  const now = new Date();
  const earliest = new Date(now);
  const hours = now.getHours();
  const minutes = now.getMinutes();

  if (hours > 10 || (hours === 10 && minutes > 0)) {
    earliest.setDate(earliest.getDate() + 1);
  }

  earliest.setHours(10, 0, 0, 0);
  return earliest;
};

const normalizeAppointmentDate = (dateValue, timeValue) => {
  if (!dateValue || !timeValue) return "";
  return `${dateValue}T${timeValue}`;
};

const validateAppointmentDate = (dateValue, timeValue) => {
  if (!dateValue || !timeValue) {
    return "Выберите дату и время приема.";
  }

  const rawValue = normalizeAppointmentDate(dateValue, timeValue);
  const selected = new Date(rawValue);
  if (Number.isNaN(selected.getTime())) {
    return "Укажите корректную дату и время.";
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const selectedDay = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate());

  if (selected < now) {
    return "Нельзя записаться на прошедшую дату.";
  }

  if (selectedDay < startOfToday) {
    return "Нельзя записаться на прошедший день.";
  }

  const selectedHours = selected.getHours();
  const selectedMinutes = selected.getMinutes();
  const inWorkingHours =
    (selectedHours > 10 || (selectedHours === 10 && selectedMinutes >= 0)) &&
    (selectedHours < 18 || (selectedHours === 18 && selectedMinutes === 0));

  if (!inWorkingHours) {
    return "Запись доступна только с 10:00 до 18:00.";
  }

  const workStartedToday = now.getHours() > 10 || (now.getHours() === 10 && now.getMinutes() > 0);
  const isSameDay =
    selected.getFullYear() === now.getFullYear() &&
    selected.getMonth() === now.getMonth() &&
    selected.getDate() === now.getDate();

  if (isSameDay && workStartedToday) {
    return "Если рабочий день уже начался, запись на сегодня недоступна.";
  }

  return "";
};

const syncBookingConstraints = () => {
  const dateField = getBookingDateField();
  const timeField = getBookingTimeField();
  if (!dateField || !timeField) return;

  const earliest = getEarliestBookingDate();
  dateField.min = toDateValue(earliest);
  timeField.min = "10:00";
  timeField.max = "18:00";
  timeField.step = 1800;

  const todayValue = toDateValue(new Date());
  if (dateField.value === todayValue) {
    const now = new Date();
    const roundedMinutes = now.getMinutes() <= 30 ? 30 : 60;
    const nextHour = roundedMinutes === 60 ? now.getHours() + 1 : now.getHours();
    const nextMinute = roundedMinutes === 60 ? 0 : 30;
    const nextTime = `${pad(Math.max(10, nextHour))}:${pad(nextMinute)}`;
    timeField.min = nextTime > "10:00" ? nextTime : "10:00";
  }
};

const appendNataliaReply = (user, text) => {
  user.chat.push({
    id: crypto.randomUUID(),
    author: "Наталья",
    text,
    time: new Date().toISOString(),
  });
};

const setStatus = (node, text = "", kind = "") => {
  if (!node) return;
  node.textContent = text;
  node.className = kind ? `form-status ${kind}` : "form-status";
};

const renderPortal = () => {
  if (!portalAuth || !portalDashboard) return;

  const user = getCurrentUser();

  if (!user) {
    portalAuth.classList.remove("is-hidden");
    portalDashboard.classList.add("is-hidden");
    return;
  }

  portalAuth.classList.add("is-hidden");
  portalDashboard.classList.remove("is-hidden");

  if (portalUserName) portalUserName.textContent = user.name;
  if (portalUserEmail) portalUserEmail.textContent = user.email;

  if (appointmentList) {
    const appointments = (user.appointments || []).filter((item) => item.status !== "cancelled");
    if (!appointments.length) {
      appointmentList.innerHTML = '<p class="portal-empty">Пока нет записей. После бронирования здесь появятся консультации и доступ к чату.</p>';
    } else {
      appointmentList.innerHTML = appointments
        .slice()
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map((item) => `
          <article class="appointment-card">
            <div class="appointment-card-head">
              <div>
                <strong>${escapeHtml(item.service)}</strong>
                <div class="appointment-meta">${escapeHtml(formatDateTime(item.date))}</div>
              </div>
              <span class="appointment-status ${item.status === "cancelled" ? "is-cancelled" : ""}">
                ${item.status === "cancelled" ? "Отменено" : "Запланировано"}
              </span>
            </div>
            <p class="appointment-meta">${escapeHtml(item.notes || "Без дополнительного комментария")}</p>
            <div class="appointment-card-actions">
              <button class="btn btn-secondary" type="button" data-action="reschedule" data-id="${item.id}" ${item.status === "cancelled" ? "disabled" : ""}>Перенести</button>
              <button class="btn btn-secondary" type="button" data-action="cancel" data-id="${item.id}" ${item.status === "cancelled" ? "disabled" : ""}>Отменить</button>
            </div>
          </article>
        `)
        .join("");
    }

    appointmentList.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        const appointment = currentUser.appointments.find((item) => item.id === button.dataset.id);
        if (!appointment) return;

        if (button.dataset.action === "cancel") {
          appointment.status = "cancelled";
          currentUser.chat.push({
            id: crypto.randomUUID(),
            author: "Система",
            text: `Прием "${appointment.service}" был отменен.`,
            time: new Date().toISOString(),
          });
        }

        if (button.dataset.action === "reschedule") {
          const initialValue = appointment.date.replace("T", " ").slice(0, 16);
          const nextDate = window.prompt("Введите новую дату и время в формате ГГГГ-ММ-ДД ЧЧ:ММ", initialValue);
          if (!nextDate) return;
          const normalizedDate = nextDate.includes("T") ? nextDate : nextDate.replace(" ", "T");
          const dateError = validateAppointmentDate(normalizedDate);
          if (dateError) {
            window.alert(dateError);
            return;
          }
          appointment.date = normalizedDate;
          currentUser.chat.push({
            id: crypto.randomUUID(),
            author: "Система",
            text: `Прием "${appointment.service}" перенесен на ${formatDateTime(appointment.date)}.`,
            time: new Date().toISOString(),
          });
        }

        saveCurrentUser(currentUser);
        renderPortal();
      });
    });
  }

  const chatEnabled = hasActiveAppointment(user);
  if (chatGateNote) {
    chatGateNote.textContent = chatEnabled
      ? "Можно написать Наталье по текущей записи."
      : "Чат откроется после записи на консультацию или прием.";
  }

  if (chatForm) {
    const chatTextarea = chatForm.querySelector("textarea");
    const chatButton = chatForm.querySelector("button");
    if (chatTextarea) chatTextarea.disabled = !chatEnabled;
    if (chatButton) chatButton.disabled = !chatEnabled;
  }

  if (chatLog) {
    if (!user.chat?.length) {
      chatLog.innerHTML = '<p class="portal-empty">Здесь будет история сообщений после подтвержденной записи.</p>';
    } else {
      chatLog.innerHTML = user.chat
        .map((message) => {
          const isOwnMessage = message.author === user.name;
          const messageClass = isOwnMessage ? "chat-message is-own" : "chat-message is-incoming";
          return `
          <article class="${messageClass}">
            <strong>${escapeHtml(message.author)}</strong>
            <div>${escapeHtml(message.text)}</div>
            <time datetime="${message.time}">${escapeHtml(formatDateTime(message.time))}</time>
          </article>
        `;
        })
        .join("");
    }
  }
};

if (contactForm && formStatus) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = contactForm.querySelector('button[type="submit"]');
    const formData = new FormData(contactForm);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      contact: String(formData.get("contact") || "").trim(),
      message: String(formData.get("message") || "").trim(),
    };

    setStatus(formStatus, "Отправляем заявку...");
    if (submitButton) submitButton.disabled = true;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(`${WORKER_URL}/add_client`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify(payload),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Не удалось отправить заявку.");
      }

      contactForm.reset();
      setStatus(formStatus, "Спасибо! Заявка отправлена, я свяжусь с вами.", "is-success");
    } catch (error) {
      storeLeadLocally(payload);
      contactForm.reset();

      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus(formStatus, "Сервер временно не отвечает, но заявка сохранена локально в браузере.", "is-success");
      } else if (error instanceof TypeError) {
        setStatus(formStatus, "Нет доступа к серверу. Заявка сохранена локально, чтобы вы не потеряли данные.", "is-success");
      } else {
        setStatus(formStatus, "Заявка сохранена локально. Можно продолжить работу на сайте.", "is-success");
      }
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

portalTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    portalTabs.forEach((item) => item.classList.toggle("is-active", item === tab));
    if (registerForm) registerForm.classList.toggle("is-hidden", tab.dataset.portalTab !== "register");
    if (loginForm) loginForm.classList.toggle("is-hidden", tab.dataset.portalTab !== "login");
    setStatus(authStatus);
  });
});

const loginMode = new URLSearchParams(window.location.search).get("mode");
if (loginMode === "login" && portalTabs.length >= 2) {
  portalTabs.forEach((item) => item.classList.toggle("is-active", item.dataset.portalTab === "login"));
  if (registerForm) registerForm.classList.add("is-hidden");
  if (loginForm) loginForm.classList.remove("is-hidden");
}

if (registerForm) {
  registerForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(registerForm);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "").trim();

    if (!name || !email || !password) {
      setStatus(authStatus, "Заполните все поля регистрации.", "is-error");
      return;
    }

    if (password.length < 4) {
      setStatus(authStatus, "Пароль должен содержать минимум 4 символа.", "is-error");
      return;
    }

    const users = readUsers();
    if (users.some((user) => user.email === email)) {
      setStatus(authStatus, "Пользователь с таким email уже зарегистрирован.", "is-error");
      return;
    }

    users.push({
      name,
      email,
      password,
      appointments: [],
      chat: [],
    });

    writeUsers(users);
    setSessionEmail(email);
    registerForm.reset();
    setStatus(authStatus, "Кабинет создан. Теперь можно записаться на консультацию.", "is-success");
    renderPortal();
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(loginForm);
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "").trim();
    const user = readUsers().find((item) => item.email === email && item.password === password);

    if (!user) {
      setStatus(authStatus, "Неверный email или пароль.", "is-error");
      return;
    }

    setSessionEmail(user.email);
    loginForm.reset();
    setStatus(authStatus);
    renderPortal();
  });
}

if (bookingForm) {
  syncBookingConstraints();
  getBookingDateField()?.addEventListener("change", syncBookingConstraints);

  bookingForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const user = getCurrentUser();
    if (!user) {
      setStatus(bookingStatus, "Сначала войдите в кабинет.", "is-error");
      return;
    }

    const formData = new FormData(bookingForm);
    const bookingDate = String(formData.get("bookingDate") || "").trim();
    const bookingTime = String(formData.get("bookingTime") || "").trim();
    const appointment = {
      id: crypto.randomUUID(),
      service: String(formData.get("service") || "").trim(),
      date: normalizeAppointmentDate(bookingDate, bookingTime),
      notes: String(formData.get("notes") || "").trim(),
      status: "scheduled",
    };

    if (!appointment.service || !appointment.date) {
      setStatus(bookingStatus, "Выберите формат и дату приема.", "is-error");
      return;
    }

    const dateError = validateAppointmentDate(bookingDate, bookingTime);
    if (dateError) {
      setStatus(bookingStatus, dateError, "is-error");
      return;
    }

    user.appointments.push(appointment);
    user.chat.push({
      id: crypto.randomUUID(),
      author: "Система",
      text: `Новая запись оформлена: "${appointment.service}" на ${formatDateTime(appointment.date)}.`,
      time: new Date().toISOString(),
    });
    saveCurrentUser(user);

    bookingForm.reset();
    syncBookingConstraints();
    setStatus(bookingStatus, "Запись сохранена. Чат с Натальей уже доступен.", "is-success");
    renderPortal();
  });
}

if (chatForm) {
  chatForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const user = getCurrentUser();
    if (!user || !hasActiveAppointment(user)) {
      setStatus(chatStatus, "Чат доступен только после записи на прием.", "is-error");
      return;
    }

    const field = chatForm.querySelector("textarea");
    const text = field ? field.value.trim() : "";
    if (!text) return;

    user.chat.push({
      id: crypto.randomUUID(),
      author: user.name,
      text,
      time: new Date().toISOString(),
    });
    appendNataliaReply(user, "Сообщение получено. Я вернусь с ответом в ближайшее время и помогу подготовиться к приему.");
    saveCurrentUser(user);

    if (field) field.value = "";
    setStatus(chatStatus, "Сообщение отправлено.", "is-success");
    renderPortal();
  });
}

if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    setSessionEmail("");
    setStatus(bookingStatus);
    setStatus(chatStatus);
    renderPortal();
  });
}

if (clearSystemNoticesButton) {
  clearSystemNoticesButton.addEventListener("click", () => {
    const user = getCurrentUser();
    if (!user) return;

    user.chat = (user.chat || []).filter((message) => message.author !== "Система");
    saveCurrentUser(user);
    setStatus(chatStatus);
    renderPortal();
  });
}

ensureDemoUser();
renderPortal();
