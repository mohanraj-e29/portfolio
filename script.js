class TerminalResume {
  constructor() {
    this.output = document.getElementById("output");
    this.input = document.getElementById("command-input");
    this.terminal = document.querySelector(".terminal");
    this.terminalContainer = document.querySelector(".terminal-container");
    this.contextMenu = document.querySelector(".context-menu");
    this.terminals = [{ input: this.input, history: [], historyIndex: -1 }];
    this.activeTerminal = 0;
    this.activeTerminalContent = null;
    this.resizing = null;

    // Properties for themes
    this.currentTheme = localStorage.getItem("theme") || "default";
    this.projects = [];
    this.skills = {};
    this.fileSystem = {};

    // Initialize modals
    this.themeModal = document.getElementById("theme-modal");
    this.projectsModal = document.getElementById("projects-modal");
    this.skillsModal = document.getElementById("skills-modal");

    // Initialize theme selector
    this.themeToggle = document.getElementById("theme-toggle");

    this.setupEventListeners();
    this.loadProjects();
    this.loadSkills();
    this.setupFileSystem();
    this.init();
  }

  init() {
    // Apply saved theme
    this.handleThemeChange(this.currentTheme);

    // Set up modal close buttons
    document.querySelectorAll(".close-button").forEach((button) => {
      button.addEventListener("click", () => {
        this.closeModal(button.closest(".modal"));
      });
    });

    // Theme toggle
    this.themeToggle.addEventListener("click", () => {
      this.showModal(this.themeModal);
    });

    // Hide language toggle since we're removing that feature
    const languageToggle = document.getElementById("language-toggle");
    if (languageToggle && languageToggle.parentElement) {
      languageToggle.parentElement.style.display = "none";
    }

    // Theme selection
    document.querySelectorAll(".theme-option").forEach((option) => {
      option.addEventListener("click", () => {
        this.handleThemeChange(option.dataset.theme);
      });
    });

    this.printWelcomeMessage();
    this.input.focus();
    this.setupContextMenu();
  }

  setupContextMenu() {
    // Handle right-click on terminal content
    this.terminalContainer.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const terminalContent = e.target.closest(".terminal-content");
      if (terminalContent) {
        this.activeTerminalContent = terminalContent;
        this.showContextMenu(e.clientX, e.clientY);
      }
    });

    // Hide context menu on click outside
    document.addEventListener("click", () => {
      this.contextMenu.classList.remove("active");
    });

    // Handle menu item clicks
    this.contextMenu.addEventListener("click", (e) => {
      const action = e.target.dataset.action;
      if (action) {
        this.handleContextMenuAction(action);
      }
    });
  }

  showContextMenu(x, y) {
    this.contextMenu.style.left = `${x}px`;
    this.contextMenu.style.top = `${y}px`;
    this.contextMenu.classList.add("active");

    // Show/hide close option based on whether this terminal can be closed
    const closeOption = this.contextMenu.querySelector(
      '[data-action="close-split"]'
    );
    const isMainTerminal =
      this.activeTerminalContent === this.terminalContainer.firstElementChild;
    closeOption.style.display = isMainTerminal ? "none" : "block";
  }

  handleContextMenuAction(action) {
    if (!this.activeTerminalContent) return;

    switch (action) {
      case "split-h":
        this.splitTerminal("horizontal", this.activeTerminalContent);
        break;
      case "split-v":
        this.splitTerminal("vertical", this.activeTerminalContent);
        break;
      case "close-split":
        this.closeSplit(this.activeTerminalContent);
        break;
    }
    this.contextMenu.classList.remove("active");
  }

  setupEventListeners() {
    // Global click handler for terminal focus
    this.terminalContainer.addEventListener("click", (e) => {
      const terminalContent = e.target.closest(".terminal-content");
      if (terminalContent) {
        const input = terminalContent.querySelector("input");
        if (input) {
          input.focus();
          this.activeTerminal = this.terminals.findIndex(
            (t) => t.input === input
          );
        }
      }
    });

    // Global keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      // Ctrl + Shift + H for horizontal split
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        const activeContent =
          this.terminals[this.activeTerminal].input.closest(
            ".terminal-content"
          );
        if (activeContent) {
          this.splitTerminal("horizontal", activeContent);
        }
      }
      // Ctrl + Shift + V for vertical split
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        const activeContent =
          this.terminals[this.activeTerminal].input.closest(
            ".terminal-content"
          );
        if (activeContent) {
          this.splitTerminal("vertical", activeContent);
        }
      }
    });

    // Setup initial input handlers
    this.setupInputHandlers(this.input);
  }

  setupInputHandlers(inputElement) {
    inputElement.addEventListener("keydown", (e) => {
      const terminal = this.terminals.find((t) => t.input === inputElement);
      if (!terminal) return;

      if (e.key === "Enter") {
        this.handleCommand(inputElement);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this.navigateHistory("up", terminal);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        this.navigateHistory("down", terminal);
      } else if (e.key === "l" && e.ctrlKey) {
        // Handle Ctrl+L (clear screen)
        e.preventDefault();
        const outputElement = inputElement
          .closest(".terminal-content")
          .querySelector("[id^='output']");
        outputElement.innerHTML = "";
        this.printWelcomeMessage(outputElement);
      } else if (e.key === "Tab") {
        // Handle Tab completion
        e.preventDefault();
        this.handleTabCompletion(inputElement);
      }
    });
  }

  handleTabCompletion(inputElement) {
    const currentInput = inputElement.value.toLowerCase().trim();
    const commands = [
      "help",
      "about",
      "skills",
      "experience",
      "education",
      "contact",
      "clear",
      "projects",
      "skills-visual",
      "pdf",
    ];

    // Find matching commands
    const matches = commands.filter((cmd) => cmd.startsWith(currentInput));

    if (matches.length === 1) {
      // Single match - complete the command
      inputElement.value = matches[0];
    } else if (matches.length > 1 && currentInput) {
      // Multiple matches - show possibilities
      const outputElement = inputElement
        .closest(".terminal-content")
        .querySelector("[id^='output']");

      const matchesText = `\nPossible commands:\n${matches.join("  ")}`;
      this.printToOutput(outputElement, matchesText, "info");
    }
  }

  navigateHistory(direction, terminal) {
    if (
      direction === "up" &&
      terminal.historyIndex < terminal.history.length - 1
    ) {
      terminal.historyIndex++;
    } else if (direction === "down" && terminal.historyIndex > -1) {
      terminal.historyIndex--;
    }

    if (
      terminal.historyIndex >= 0 &&
      terminal.historyIndex < terminal.history.length
    ) {
      terminal.input.value =
        terminal.history[terminal.history.length - 1 - terminal.historyIndex];
    } else {
      terminal.input.value = "";
    }
  }

  splitTerminal(direction, sourceTerminal) {
    const parentContainer = sourceTerminal.parentElement;
    const isAlreadySplit = parentContainer.children.length > 1;
    const splitClass = direction === "horizontal" ? "split-h" : "split-v";

    // If parent is not split or split in different direction, create new container
    if (!isAlreadySplit || !parentContainer.classList.contains(splitClass)) {
      const newContainer = document.createElement("div");
      newContainer.className = `terminal-container ${splitClass}`;

      // Move source terminal to new container
      sourceTerminal.parentElement.insertBefore(newContainer, sourceTerminal);
      newContainer.appendChild(sourceTerminal);

      // Create new terminal in the container
      this.createNewTerminalContent(newContainer);
    } else {
      // Add new terminal to existing split container
      this.createNewTerminalContent(parentContainer);
    }
  }

  createNewTerminalContent(container) {
    const newContent = document.createElement("div");
    newContent.className = "terminal-content";
    const timestamp = Date.now();
    newContent.innerHTML = `
      <div id="output-${timestamp}" class="terminal-output"></div>
      <div class="input-line">
        <span class="prompt">➜</span>
        <input type="text" id="command-input-${timestamp}" class="command-input" />
      </div>
    `;

    // Add resize handle if not the last element
    if (container.children.length > 0) {
      const handle = document.createElement("div");
      handle.className = `resize-handle ${
        container.classList.contains("split-h") ? "horizontal" : "vertical"
      }`;
      container.lastElementChild.appendChild(handle);
      this.setupResizeHandle(handle);
    }

    container.appendChild(newContent);

    // Setup new input
    const newInput = newContent.querySelector(".command-input");
    this.setupInputHandlers(newInput);

    // Add to terminals array
    this.terminals.push({
      input: newInput,
      history: [],
      historyIndex: -1,
    });

    // Print welcome message in new terminal
    const newOutput = newContent.querySelector(`#output-${timestamp}`);
    this.printWelcomeMessage(newOutput);

    // Focus new terminal
    newInput.focus();
    this.activeTerminal = this.terminals.length - 1;
  }

  setupResizeHandle(handle) {
    const isHorizontal = handle.classList.contains("horizontal");

    const startResize = (e) => {
      e.preventDefault();
      this.resizing = {
        handle,
        startX: e.clientX,
        startY: e.clientY,
        parentContainer: handle.closest(".terminal-container"),
        element: handle.parentElement,
        initialSize: isHorizontal
          ? handle.parentElement.offsetWidth
          : handle.parentElement.offsetHeight,
      };

      document.addEventListener("mousemove", resize);
      document.addEventListener("mouseup", stopResize);
    };

    const resize = (e) => {
      if (!this.resizing) return;

      const { parentContainer, element, startX, startY, initialSize } =
        this.resizing;
      const containerRect = parentContainer.getBoundingClientRect();

      if (isHorizontal) {
        const deltaX = e.clientX - startX;
        const newWidth = initialSize + deltaX;
        const maxWidth = containerRect.width - 150; // Leave space for other splits

        if (newWidth >= 150 && newWidth <= maxWidth) {
          const percentage = (newWidth / containerRect.width) * 100;
          element.style.flex = "none";
          element.style.width = `${percentage}%`;
        }
      } else {
        const deltaY = e.clientY - startY;
        const newHeight = initialSize + deltaY;
        const maxHeight = containerRect.height - 100;

        if (newHeight >= 100 && newHeight <= maxHeight) {
          const percentage = (newHeight / containerRect.height) * 100;
          element.style.flex = "none";
          element.style.height = `${percentage}%`;
        }
      }
    };

    const stopResize = () => {
      this.resizing = null;
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stopResize);
    };

    handle.addEventListener("mousedown", startResize);
  }

  printToOutput(outputElement, text, className = "", useTypewriter = false) {
    if (!text) {
      outputElement.innerHTML = "";
      return Promise.resolve();
    }

    const line = document.createElement("div");
    line.className = className;

    // Ensure consistent text formatting
    line.style.whiteSpace = "pre-wrap";
    line.style.marginBottom = "0.5rem";

    outputElement.appendChild(line);

    // Force scroll to bottom
    this.scrollToBottom(outputElement.closest(".terminal-content"));

    if (useTypewriter && !text.includes("<")) {
      // For plain text, use typewriter effect
      return this.typeText(line, text, 20);
    } else if (useTypewriter && text.includes("<")) {
      // For HTML content, use HTML typewriter
      return this.typeHTML(line, text, 20);
    } else {
      // No typewriter effect
      line.textContent = text;
      return Promise.resolve();
    }
  }

  scrollToBottom(terminalContent) {
    if (!terminalContent) return;

    // Only scroll if content is actually overflowing
    if (terminalContent.scrollHeight > terminalContent.clientHeight) {
      const currentScrollTop = terminalContent.scrollTop;
      const maxScroll =
        terminalContent.scrollHeight - terminalContent.clientHeight;

      // If we're not already at the bottom, scroll
      if (currentScrollTop < maxScroll) {
        terminalContent.scrollTop = maxScroll;

        // Use requestAnimationFrame to ensure scroll happens after render
        requestAnimationFrame(() => {
          terminalContent.scrollTop = maxScroll;
        });
      }
    }
  }

  handleCommand(inputElement) {
    const terminal = this.terminals.find((t) => t.input === inputElement);
    if (!terminal) return;

    const command = inputElement.value.trim().toLowerCase();
    const outputElement = inputElement
      .closest(".terminal-content")
      .querySelector("[id^='output']");

    this.printToOutput(outputElement, `➜ ${command}`, "command");
    terminal.history.push(command);
    terminal.historyIndex = -1;
    inputElement.value = "";

    // Parse command and arguments
    const [cmd, ...args] = command.split(" ");

    // Execute command
    switch (cmd) {
      case "help":
        this.showHelp(outputElement);
        break;
      case "about":
        this.showAbout(outputElement);
        break;
      case "experience":
        this.showExperience(outputElement);
        break;
      case "education":
        this.showEducation(outputElement);
        break;
      case "skills":
        this.showSkills(outputElement);
        break;
      case "contact":
        this.showContact(outputElement);
        break;
      case "clear":
        outputElement.innerHTML = "";
        this.printWelcomeMessage(outputElement);
        break;
      case "projects":
        this.showProjects();
        break;
      case "skills-visual":
        this.showSkillsVisualization();
        break;
      case "pdf":
        this.generatePDF();
        break;
      case "":
        break;
      default:
        this.printToOutput(
          outputElement,
          `Command not found: ${command}. Type 'help' for available commands.`,
          "error"
        );
    }

    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  // ============================================
  // FIXED: printWelcomeMessage with correct ASCII
  // ============================================
  printWelcomeMessage(outputElement = this.output) {
    const asciiArt = `███╗   ███╗ ██████╗ ██╗  ██╗ █████╗ ███╗   ██╗██████╗  █████╗      ██╗   ███████╗
████╗ ████║██╔═══██╗██║  ██║██╔══██╗████╗  ██║██╔══██╗██╔══██╗     ██║   ██╔════╝
██╔████╔██║██║   ██║███████║███████║██╔██╗ ██║██████╔╝███████║     ██║   █████╗  
██║╚██╔╝██║██║   ██║██╔══██║██╔══██║██║╚██╗██║██╔══██╗██╔══██║██   ██║   ██╔══╝  
██║ ╚═╝ ██║╚██████╔╝██║  ██║██║  ██║██║ ╚████║██║  ██║██║  ██║╚█████╔╝██╗███████╗
╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚════╝ ╚═╝╚══════╝`;

    const divider = "──────────────────────────────────────────────────────────────────────────";

    const welcome =
      this.wrapWithColor(asciiArt + "\n", "#d4843e") +
      this.wrapWithColor(divider + "\n", "#555555") +
      this.wrapWithColor(
        "                       Interactive Terminal Resume\n",
        "#888888"
      ) +
      this.wrapWithColor(
        "              Software Engineer • C++ / Qt Developer • Full-Stack\n",
        "#666666"
      ) +
      this.wrapWithColor(divider + "\n\n", "#555555") +
      this.wrapWithColor("Type ", "#666666") +
      this.wrapWithColor("'help'", "#87af87") +
      this.wrapWithColor(" to see available commands\n", "#666666") +
      this.wrapWithColor("Press ", "#666666") +
      this.wrapWithColor("'tab'", "#87af87") +
      this.wrapWithColor(" to auto-complete commands", "#666666");

    const helpDiv = document.createElement("div");
    helpDiv.innerHTML = welcome;
    outputElement.appendChild(helpDiv);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  // ============================================
  // FIXED: PDF Generation with actual download
  // ============================================
  generatePDF() {
    const outputElement = this.terminals[this.activeTerminal].input
      .closest(".terminal-content")
      .querySelector("[id^='output']");
    
    this.printToOutput(outputElement, "📄 Generating PDF resume...", "info");
    
    try {
      // The PDF file name - make sure this matches your actual PDF file
      const pdfUrl = 'Mohanraj_Resume.pdf';
      
      // Create a hidden anchor element to trigger download
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = 'Mohanraj_Resume.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      this.printToOutput(outputElement, "✅ PDF downloaded successfully!", "success");
      this.printToOutput(outputElement, "📁 File: Mohanraj_Resume.pdf", "info");
      
    } catch (error) {
      this.printToOutput(
        outputElement,
        `❌ Error downloading PDF: ${error.message}`,
        "error"
      );
    }
  }

  // ============================================
  // ALL OTHER METHODS (unchanged)
  // ============================================
  
  wrapWithColor(text, color) {
    return `<span style="color: ${color}">${text}</span>`;
  }

  typeText(element, text, speed = 30) {
    if (!element || !text) return Promise.resolve();

    return new Promise((resolve) => {
      let index = 0;
      element.textContent = "";
      element.style.display = "inline-block";

      const interval = setInterval(() => {
        if (index < text.length) {
          element.textContent += text.charAt(index);
          index++;
        } else {
          clearInterval(interval);
          resolve();
        }
      }, speed);
    });
  }

  async typeHTML(element, html, speed = 30) {
    if (!element || !html) return Promise.resolve();

    const temp = document.createElement("div");
    temp.innerHTML = html;

    const walker = document.createTreeWalker(
      temp,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      null,
      false
    );

    const nodes = [];
    let currentNode;
    while ((currentNode = walker.nextNode())) {
      nodes.push(currentNode);
    }

    element.innerHTML = "";

    for (const node of nodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        const span = document.createElement("span");
        element.appendChild(span);
        await this.typeText(span, node.textContent, speed);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const clone = node.cloneNode(false);
        element.appendChild(clone);
        if (node.tagName === "STYLE" || !node.hasChildNodes()) {
          clone.innerHTML = node.innerHTML;
        }
      }
    }

    return Promise.resolve();
  }

  showHelp(outputElement = this.output) {
    const title = this.wrapWithColor("🚀 Available Commands\n\n", "#ffff00");

    const mainCommands =
      this.wrapWithColor("Main Commands:\n", "#00ffff") +
      this.wrapWithColor("• help", "#98fb98") +
      "       " +
      this.wrapWithColor("Show this help message\n", "#ffffff") +
      this.wrapWithColor("• about", "#98fb98") +
      "      " +
      this.wrapWithColor("Display my professional summary\n", "#ffffff") +
      this.wrapWithColor("• skills", "#98fb98") +
      "     " +
      this.wrapWithColor("View my technical expertise\n", "#ffffff") +
      this.wrapWithColor("• experience", "#98fb98") +
      " " +
      this.wrapWithColor("Show my work history\n", "#ffffff") +
      this.wrapWithColor("• education", "#98fb98") +
      "  " +
      this.wrapWithColor("View my educational background\n", "#ffffff") +
      this.wrapWithColor("• contact", "#98fb98") +
      "    " +
      this.wrapWithColor("Get my contact information\n", "#ffffff") +
      this.wrapWithColor("• clear", "#98fb98") +
      "      " +
      this.wrapWithColor("Clear the terminal screen\n", "#ffffff");

    const utilityCommands =
      "\n" +
      this.wrapWithColor("Utility Commands:\n", "#00ffff") +
      this.wrapWithColor("• projects", "#98fb98") +
      "   " +
      this.wrapWithColor("View my project showcase\n", "#ffffff") +
      this.wrapWithColor("• skills-visual", "#98fb98") +
      " " +
      this.wrapWithColor("Show skills visualization\n", "#ffffff") +
      this.wrapWithColor("• pdf", "#98fb98") +
      "       " +
      this.wrapWithColor("Download resume as PDF\n", "#ffffff");

    const shortcuts =
      "\n" +
      this.wrapWithColor("Shortcuts:\n", "#666666") +
      this.wrapWithColor("• ", "#666666") +
      this.wrapWithColor("↑/↓", "#666666") +
      "         " +
      this.wrapWithColor("Navigate command history\n", "#444444") +
      this.wrapWithColor("• ", "#666666") +
      this.wrapWithColor("Tab", "#666666") +
      "         " +
      this.wrapWithColor("Auto-complete commands\n", "#444444") +
      this.wrapWithColor("• ", "#666666") +
      this.wrapWithColor("Ctrl+L", "#666666") +
      "      " +
      this.wrapWithColor("Clear the screen\n", "#444444") +
      this.wrapWithColor("• ", "#666666") +
      this.wrapWithColor("Ctrl+Shift+H", "#666666") +
      " " +
      this.wrapWithColor("Split horizontally\n", "#444444") +
      this.wrapWithColor("• ", "#666666") +
      this.wrapWithColor("Ctrl+Shift+V", "#666666") +
      " " +
      this.wrapWithColor("Split vertically", "#444444");

    const help = title + mainCommands + utilityCommands + shortcuts;

    const helpDiv = document.createElement("div");
    helpDiv.innerHTML = help;
    outputElement.appendChild(helpDiv);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  showAbout(outputElement = this.output) {
    const about = `<span style="color: #ff8c00; font-weight: bold;">✨ About Me</span>

${this.wrapWithColor(
  "┌─────────────────────────────────────────────────────────┐",
  "#ff8c00"
)}
${this.wrapWithColor("│", "#ff8c00")} ${this.wrapWithColor(
      "Software Engineer with 2+ years of experience building",
      "#ffffff"
    )}
${this.wrapWithColor("│", "#ff8c00")} ${this.wrapWithColor(
      "high-concurrency Qt/C++ desktop applications and OCR pipelines.",
      "#ffffff"
    )}
${this.wrapWithColor(
  "└─────────────────────────────────────────────────────────┘",
  "#ff8c00"
)}

${this.wrapWithColor("⚡ Experience", "#ff8c00")}
${this.wrapWithColor(
  "   Building robust desktop applications and data pipelines using",
  "#ffffff"
)}
${this.wrapWithColor("   C++17, Qt / QML, SQLite, and Python", "#ff8c00")}

${this.wrapWithColor("⚡ Passion", "#ff8c00")}
${this.wrapWithColor(
  "   Optimizing system performance and applying MVVM design patterns",
  "#ffffff"
)}
${this.wrapWithColor(
  "   to deliver maintainable, production-grade applications",
  "#ffffff"
)}

${this.wrapWithColor("⚡ Strengths", "#ff8c00")}
${this.wrapWithColor(
  "   Applying SOLID principles, multi-threading logic, and automated",
  "#ffffff"
)}
${this.wrapWithColor("   CI/CD pipelines to prevent conflicts and ensure quality", "#ffffff")}

${this.wrapWithColor(
  "╭───────────────────────────────────────────────────────╮",
  "#ff8c00"
)}
${this.wrapWithColor("│", "#ff8c00")} ${this.wrapWithColor(
      "Ready to bring your software requirements to life!  ",
      "#ffffff"
    )} ${this.wrapWithColor("│", "#ff8c00")}
${this.wrapWithColor(
  "╰───────────────────────────────────────────────────────╯",
  "#ff8c00"
)}`;

    const aboutDiv = document.createElement("div");
    aboutDiv.innerHTML = about;
    outputElement.appendChild(aboutDiv);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  showExperience(outputElement = this.output) {
    const experience = `<span style="color: #ffff00; font-weight: bold;">💼 Professional Experience</span>

<span style="color: #00ffff;">QUANTIX TECHNOLOGY & CONSULTING SERVICES | Front-End Developer</span>
${this.wrapWithColor(
  "Feb 2024 - Mar 2024 | Tamil Nadu, India (Remote)",
  "#ffffff"
)}

• ${this.wrapWithColor("Developed Construction Site Website", "#ffa07a")} - ${this.wrapWithColor(
      "Responsive, mobile-first website utilizing React and Vite.",
      "#ffffff"
    )}
• ${this.wrapWithColor("Scalable Components", "#ffa07a")} - ${this.wrapWithColor(
      "Implemented component-based architecture for maintainable UI.",
      "#ffffff"
    )}
• ${this.wrapWithColor("Tailwind CSS", "#ffa07a")} - ${this.wrapWithColor(
      "Ensured fast rendering and minimal CSS overhead with mobile-first design.",
      "#ffffff"
    )}

${this.wrapWithColor("Technologies used:", "#00ffff")} ${this.wrapWithColor(
      "React, Vite, Tailwind CSS, HTML5, CSS3, JavaScript",
      "#87cefa"
    )}

<span style="color: #00ffff;">WIPRO | Project Engineer</span>
${this.wrapWithColor(
  "Oct 2022 - Apr 2024 | Kochi, Kerala, India",
  "#ffffff"
)}

• ${this.wrapWithColor("FoIP Protocol Emulator", "#ffa07a")} - ${this.wrapWithColor(
      "Designed and developed a FoIP emulator using C++ and Qt/QML, with T.30 simulation, capability negotiation, and custom state machines. Integrated Ghostscript for PDF/TIFF processing and Qt sockets for TCP/IP.",
      "#ffffff"
    )}
• ${this.wrapWithColor("Intelligent OCR Suite", "#ffa07a")} - ${this.wrapWithColor(
      "Developed high-performance OCR suite integrating Tesseract engine into Qt/C++ with hybrid direct PDF parsing and scanned document OCR fallback.",
      "#ffffff"
    )}
• ${this.wrapWithColor("Printer Management System", "#ffa07a")} - ${this.wrapWithColor(
      "Engineered printer scheduling application using Qt 5.5 and C++17 serving 50+ concurrent client nodes with SQLite transaction conflict resolution.",
      "#ffffff"
    )}

${this.wrapWithColor("Technologies used:", "#00ffff")} ${this.wrapWithColor(
      "C++17, Qt 5.5, QML, SQLite, Tesseract OCR, Ghostscript, TCP/IP Sockets, Boost, MVVM, Git",
      "#87cefa"
    )}`;

    const experienceDiv = document.createElement("div");
    experienceDiv.innerHTML = experience;
    outputElement.appendChild(experienceDiv);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  showEducation(outputElement = this.output) {
    const education = `<span style="color: #ff8c00; font-weight: bold;">🎓 Education</span>

${this.wrapWithColor(
  "┌──────────────────────────────────────────────────┐",
  "#ff8c00"
)}
${this.wrapWithColor("│", "#ff8c00")}${this.wrapWithColor(
      " Bachelor of Engineering in CSE               ",
      "#ffffff"
    )}${this.wrapWithColor("│", "#ff8c00")}
${this.wrapWithColor(
  "└──────────────────────────────────────────────────┘",
  "#ff8c00"
)}

${this.wrapWithColor("🏛️ Institution:", "#ff8c00")} ${this.wrapWithColor(
      "Mailam Engineering College (Anna University)",
      "#ffffff"
    )}
${this.wrapWithColor("🎓 CGPA:", "#ff8c00")}        ${this.wrapWithColor(
      "7.64",
      "#ffffff"
    )}
${this.wrapWithColor("📅 Duration:", "#ff8c00")}    ${this.wrapWithColor(
      "Sep 2018 - July 2022",
      "#ffffff"
    )}
${this.wrapWithColor("📍 Location:", "#ff8c00")}    ${this.wrapWithColor(
      "Villupuram, Tamil Nadu, India",
      "#ffffff"
    )}`;

    const educationDiv = document.createElement("div");
    educationDiv.innerHTML = education;
    outputElement.appendChild(educationDiv);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  showSkills(outputElement = this.output) {
    const skills = `<span style="color: #ffff00; font-weight: bold;">🛠️ TECHNICAL SKILLS</span>

• ${this.wrapWithColor("C++17 & C#", "#ffffff")}
• ${this.wrapWithColor("Python & JavaScript", "#ffffff")}
• ${this.wrapWithColor("Qt 5.5, QML & Qt Creator", "#ffffff")}
• ${this.wrapWithColor("React & Angular", "#ffffff")}
• ${this.wrapWithColor("Tailwind CSS & Vite", "#ffffff")}
• ${this.wrapWithColor("Node.js & Express.js", "#ffffff")}
• ${this.wrapWithColor("SQLite, MySQL & MongoDB", "#ffffff")}
• ${this.wrapWithColor("Git & GitLab CI/CD", "#ffffff")}
• ${this.wrapWithColor("Tesseract OCR & Ghostscript", "#ffffff")}
• ${this.wrapWithColor("Multi-threading & Design Patterns", "#ffffff")}
• ${this.wrapWithColor("REST APIs & TCP/IP Sockets", "#ffffff")}`;

    const skillsDiv = document.createElement("div");
    skillsDiv.innerHTML = skills;
    outputElement.appendChild(skillsDiv);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  showContact(outputElement = this.output) {
    const contact = `<span style="color: #ff8c00; font-weight: bold;">📫 Contact Information</span>

${this.wrapWithColor("┌────────────────────────────────────────┐", "#ff8c00")}
${this.wrapWithColor("│", "#ff8c00")} ${this.wrapWithColor(
      "Let's connect and create something great!",
      "#ffffff"
    )} ${this.wrapWithColor("│", "#ff8c00")}
${this.wrapWithColor("└────────────────────────────────────────┘", "#ff8c00")}

${this.wrapWithColor("✉", "#ff8c00")}  ${this.wrapWithColor(
      "Email:",
      "#ff8c00"
    )} ${this.wrapWithColor(
      '<a href="mailto:mmohanraj29@gmail.com" style="color: #ffffff; text-decoration: none;">mmohanraj29@gmail.com</a>',
      "#ffffff"
    )}

${this.wrapWithColor("🌐", "#ff8c00")}  ${this.wrapWithColor(
      "Website:",
      "#ff8c00"
    )} ${this.wrapWithColor(
      '<a href="https://mohanraj-e29.github.io" target="_blank" style="color: #ffffff; text-decoration: none;">mohanraj-e29.github.io</a>',
      "#ffffff"
    )}

${this.wrapWithColor("⚡", "#ff8c00")}  ${this.wrapWithColor(
      "Github:",
      "#ff8c00"
    )} ${this.wrapWithColor(
      '<a href="https://github.com/mohanraj-e29" target="_blank" style="color: #ffffff; text-decoration: none;">github.com/mohanraj-e29</a>',
      "#ffffff"
    )}

${this.wrapWithColor("💼", "#ff8c00")}  ${this.wrapWithColor(
      "LinkedIn:",
      "#ff8c00"
    )} ${this.wrapWithColor(
      '<a href="https://linkedin.com/in/mohanraj29" target="_blank" style="color: #ffffff; text-decoration: none;">linkedin.com/in/mohanraj29</a>',
      "#ffffff"
    )}

${this.wrapWithColor("╭────────────────────────────────────────╮", "#ff8c00")}
${this.wrapWithColor("│", "#ff8c00")} ${this.wrapWithColor(
      "Feel free to reach out for opportunities!",
      "#ffffff"
    )} ${this.wrapWithColor("│", "#ff8c00")}
${this.wrapWithColor("╰────────────────────────────────────────╯", "#ff8c00")}`;

    const contactDiv = document.createElement("div");
    contactDiv.innerHTML = contact;
    outputElement.appendChild(contactDiv);
    this.scrollToBottom(outputElement.closest(".terminal-content"));
  }

  closeSplit(terminalContent) {
    const container = terminalContent.parentElement;
    const input = terminalContent.querySelector("input");

    const terminalIndex = this.terminals.findIndex((t) => t.input === input);
    if (terminalIndex > -1) {
      this.terminals.splice(terminalIndex, 1);
    }

    terminalContent.remove();

    if (
      container.children.length <= 1 &&
      container !== this.terminalContainer
    ) {
      if (container.children.length === 1) {
        const remainingContent = container.firstElementChild;
        container.parentElement.insertBefore(remainingContent, container);
      }
      container.remove();
    }

    if (this.terminals.length > 0) {
      const newActiveIndex = Math.min(terminalIndex, this.terminals.length - 1);
      this.terminals[newActiveIndex].input.focus();
      this.activeTerminal = newActiveIndex;
    }
  }

  loadProjects() {
    this.projects = [
      {
        title: "FoIP Emulator",
        description: "C++ & Qt/QML emulator for real-time Fax over IP (T.30) simulation with capability negotiation, custom state machines, and Ghostscript media pipelines.",
        image: "image/social-cover.png",
        technologies: ["C++", "Qt/QML", "Ghostscript", "TCP/IP Sockets"],
        demo: "https://mohanraj-e29.github.io",
        repo: "https://github.com/mohanraj-e29",
      },
      {
        title: "Intelligent OCR Document Processing Suite",
        description: "High-performance document processing suite integrating Tesseract OCR engine in Qt/C++ with hybrid direct PDF/scanned parsing.",
        image: "image/social-cover.png",
        technologies: ["C++", "Qt", "Tesseract OCR", "PDF Parsing"],
        demo: "https://mohanraj-e29.github.io",
        repo: "https://github.com/mohanraj-e29",
      },
      {
        title: "Printer Management System",
        description: "End-to-end multi-threaded printer scheduling application serving 50+ concurrent client nodes with SQLite transaction conflict resolution.",
        image: "image/social-cover.png",
        technologies: ["C++17", "Qt 5.5", "SQLite", "TCP/IP Sockets"],
        demo: "https://mohanraj-e29.github.io",
        repo: "https://github.com/mohanraj-e29",
      },
      {
        title: "Construction Site Website",
        description: "Responsive, mobile-first website utilizing React and Vite with component-based architecture and styled with Tailwind CSS.",
        image: "image/social-cover.png",
        technologies: ["React", "Vite", "Tailwind CSS"],
        demo: "https://mohanraj-e29.github.io",
        repo: "https://github.com/mohanraj-e29",
      }
    ];
  }

  loadSkills() {
    this.skills = {
      languages: {
        "C++17": 90,
        Python: 85,
        JavaScript: 80,
        "C#": 70,
      },
      desktop: {
        "Qt 5.5 / QML": 90,
        "Qt Creator": 90,
        MVVM: 85,
        "Multi-threading": 85,
      },
      web_backend: {
        "React.js": 75,
        "Node.js": 70,
        "Express.js": 70,
        "Tailwind CSS": 80,
      },
      databases_tools: {
        SQLite: 85,
        MongoDB: 75,
        Git: 85,
        "GitLab CI/CD": 70,
      },
    };
  }

  setupFileSystem() {
    this.fileSystem = {
      resume: {
        type: "directory",
        contents: {
          "about.txt": { type: "file", content: "Software Engineer based in Gingee, Tamil Nadu, India. Specializes in C++ & Qt desktop applications." },
          "skills.md": { type: "file", content: "# Tech Skills\n- C++17, Qt, QML\n- Python, JavaScript\n- SQLite, MongoDB\n- React, HTML, CSS" },
          projects: {
            type: "directory",
            contents: {
              "foip-emulator.md": { type: "file", content: "FoIP Emulator: C++ / Qt T.30 fax protocol simulation." },
              "ocr-suite.md": { type: "file", content: "Intelligent OCR Document processing integrating Tesseract." },
              "printer-management.md": { type: "file", content: "Printer Management: Multi-threaded printer scheduling with SQLite." },
              "construction-website.md": { type: "file", content: "Construction Website: React & Tailwind CSS responsive site." },
            },
          },
        },
      },
    };
  }

  handleThemeChange(theme) {
    this.terminal.className = `terminal theme-${theme}`;
    localStorage.setItem("theme", theme);
    this.currentTheme = theme;
    this.closeModal(this.themeModal);
  }

  showModal(modal) {
    modal.classList.add("active");
  }

  closeModal(modal) {
    modal.classList.remove("active");
  }

  showProjects() {
    const container = this.projectsModal.querySelector(".projects-container");
    container.innerHTML = this.projects
      .map(
        (project) => `
      <div class="project-card">
        <img src="${project.image}" alt="${
          project.title
        }" class="project-image">
        <div class="project-details">
          <h3 class="project-title">${project.title}</h3>
          <p class="project-description">${project.description}</p>
          <div class="project-tech">
            ${project.technologies
              .map(
                (tech) => `
              <span class="tech-tag">${tech}</span>
            `
              )
              .join("")}
          </div>
          <div class="project-links">
            <a href="${project.demo}" class="project-link" target="_blank">
              <i class="fas fa-external-link-alt"></i> Demo
            </a>
            <a href="${project.repo}" class="project-link" target="_blank">
              <i class="fab fa-github"></i> Repository
            </a>
          </div>
        </div>
      </div>
    `
      )
      .join("");
    this.showModal(this.projectsModal);
  }

  showSkillsVisualization() {
    const container = this.skillsModal.querySelector(".skills-container");
    container.innerHTML = Object.entries(this.skills)
      .map(
        ([category, skills]) => `
      <div class="skill-category">
        <h3 class="skill-category-title">${category}</h3>
        <div class="skill-bars">
          ${Object.entries(skills)
            .map(
              ([skill, level]) => `
            <div class="skill-item">
              <div class="skill-info">
                <span class="skill-name">${skill}</span>
                <span class="skill-level">${level}%</span>
              </div>
              <div class="skill-progress">
                <div class="skill-progress-bar" style="width: ${level}%"></div>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `
      )
      .join("");
    this.showModal(this.skillsModal);
  }

  navigateFileSystem(path) {
    const parts = path.split("/").filter(Boolean);
    let current = this.fileSystem;
    for (const part of parts) {
      if (current.type !== "directory" || !current.contents[part]) {
        return null;
      }
      current = current.contents[part];
    }
    return current;
  }
}

// Initialize the terminal
new TerminalResume();