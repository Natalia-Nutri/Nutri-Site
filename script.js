const header = document.querySelector(".site-header");
const revealItems = document.querySelectorAll(".reveal");
const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");
const contactForm = document.querySelector("#contact-form");
const formStatus = document.querySelector("#form-status");
const WORKER_URL = "https://natalia-nutri.ivantimockin19.workers.dev";
const REQUEST_TIMEOUT_MS = 15000;

const syncHeader = () => {
  header.classList.toggle("is-scrolled", window.scrollY > 12);
};

syncHeader();
window.addEventListener("scroll", syncHeader);

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

    formStatus.textContent = "Отправляем заявку...";
    formStatus.className = "form-status";
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
      formStatus.textContent = "Спасибо! Заявка отправлена, я свяжусь с вами.";
      formStatus.className = "form-status is-success";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        formStatus.textContent = "Сервер долго не отвечает. Возможно, мешает VPN или нестабильное соединение.";
      } else if (error instanceof TypeError) {
        formStatus.textContent = "Не удалось подключиться к серверу. Проверьте VPN, сеть и доступность workers.dev.";
      } else {
        formStatus.textContent = error instanceof Error ? error.message : "Произошла ошибка при отправке.";
      }
      formStatus.className = "form-status is-error";
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}
