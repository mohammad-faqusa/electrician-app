class Modal {
  constructor(options = {}) {
    this.id = options.id || "modal-" + Math.random().toString(36).substr(2, 9);
    this.title = options.title || "Modal";
    this.content = options.content || "";
    this.buttons = options.buttons || [
      {
        text: "Close",
        type: "secondary",
        id: "close",
        handler: () => this.close(),
      },
    ];
    this.onOpen = options.onOpen || (() => {});
    this.onClose = options.onClose || (() => {});
    this.element = null;
    this.overlay = null;
    this.isCreated = false;

    this.create();

    this.open = this.open.bind(this);
    this.close = this.close.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleOverlayClick = this.handleOverlayClick.bind(this);
  }

  create() {
    if (this.isCreated) return;

    this.overlay = document.createElement("div");
    this.overlay.className = "modal-overlay";
    this.overlay.id = this.id + "-overlay";

    this.element = document.createElement("div");
    this.element.className = "modal";
    this.element.setAttribute("role", "dialog");
    this.element.setAttribute("aria-labelledby", this.id + "-title");
    this.element.setAttribute("aria-modal", "true");

    const header = document.createElement("div");
    header.className = "modal-header";

    const title = document.createElement("h2");
    title.className = "modal-title";
    title.id = this.id + "-title";
    title.textContent = this.title;

    const closeButton = document.createElement("button");
    closeButton.className = "modal-close";
    closeButton.id = "header-device-modal-close";
    closeButton.setAttribute("aria-label", "Close modal");
    closeButton.innerHTML = "&times;";

    header.appendChild(title);
    header.appendChild(closeButton);

    const body = document.createElement("div");
    body.className = "modal-body";

    if (typeof this.content === "string") {
      body.innerHTML = this.content;
    } else if (this.content instanceof HTMLElement) {
      body.appendChild(this.content);
    }

    const footer = document.createElement("div");
    footer.className = "modal-footer";

    this.buttons.forEach((button) => {
      if (button.text === "x") {
        return closeButton.addEventListener("click", button.handler);
      }
      const buttonElement = document.createElement("button");
      buttonElement.className = `modal-button ${button.type}-button`;
      buttonElement.id =
        button.id || button.text.toLowerCase().replace(/\s+/g, "-");
      buttonElement.textContent = button.text;
      if (button.handler) {
        buttonElement.addEventListener("click", button.handler);
      }

      footer.appendChild(buttonElement);
    });

    this.element.appendChild(header);
    this.element.appendChild(body);
    this.element.appendChild(footer);
    this.overlay.appendChild(this.element);

    this.overlay.addEventListener("click", this.handleOverlayClick);

    document.body.appendChild(this.overlay);

    this.isCreated = true;
  }

  open() {
    if (!this.isCreated) {
      this.create();
    }

    this.overlay.classList.add("active");
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", this.handleKeyDown);

    setTimeout(() => {
      const closeButton = this.element.querySelector(".modal-close");
      if (closeButton) {
        closeButton.focus();
      }
    }, 100);

    if (typeof this.onOpen === "function") {
      this.onOpen();
    }
  }

  close() {
    this.overlay.classList.remove("active");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", this.handleKeyDown);

    if (typeof this.onClose === "function") {
      this.onClose();
    }
  }

  handleKeyDown(event) {
    if (event.key === "Escape") {
      this.close();
    }
  }

  handleOverlayClick(event) {
    if (event.target === this.overlay) {
      this.close();
    }
  }

  update(options = {}) {
    if (options.title) {
      this.title = options.title;
      const titleElement = this.element.querySelector(".modal-title");
      if (titleElement) {
        titleElement.textContent = this.title;
      }
    }

    if (options.content) {
      this.setContent(options.content);
    }

    if (options.buttons) {
      this.buttons = options.buttons;
      const footerElement = this.element.querySelector(".modal-footer");
      if (footerElement) {
        footerElement.innerHTML = "";
        this.buttons.forEach((button) => {
          const buttonElement = document.createElement("button");
          buttonElement.className = `modal-button ${button.type}-button`;
          buttonElement.id =
            button.id || button.text.toLowerCase().replace(/\s+/g, "-");
          buttonElement.textContent = button.text;

          if (button.handler) {
            buttonElement.addEventListener("click", button.handler);
          }

          footerElement.appendChild(buttonElement);
        });
      }
    }

    if (options.onOpen) {
      this.onOpen = options.onOpen;
    }

    if (options.onClose) {
      this.onClose = options.onClose;
    }
  }

  setContent(content) {
    this.content = content;
    const bodyElement = this.element.querySelector(".modal-body");
    if (bodyElement) {
      bodyElement.innerHTML = "";
      if (typeof content === "string") {
        bodyElement.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        bodyElement.appendChild(content);
      }
    }
  }

  destroy() {
    if (this.overlay) {
      this.overlay.removeEventListener("click", this.handleOverlayClick);
      document.removeEventListener("keydown", this.handleKeyDown);
      document.body.removeChild(this.overlay);
      this.isCreated = false;
    }
  }
}
