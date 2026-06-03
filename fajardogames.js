const grid = document.getElementById("catalog-grid");

    const modal = document.getElementById("product-modal");
    const modalImage = document.getElementById("modal-image");
    const modalBuy = document.getElementById("modal-buy");
    const modalClose = document.getElementById("modal-close");
    const modalPrev = document.getElementById("modal-prev");
    const modalNext = document.getElementById("modal-next");
    const modalCaption = document.getElementById("modal-caption");
    const modalSizeTrack = document.getElementById("modal-size-track");
    const modalColorTrack = document.getElementById("modal-color-track");

    const schemeUrl = "autoadesivos-product-scheme.json";
    const generatedProductRoot = "images/products/FAJARDOGAMES/";
    const sizeOrder = ["minor", "major", "MINOR", "MAJOR"];
    const sizeLabels = {
      "minor": "Pequeno",
      "major": "Médio",
      "MINOR": "Grande",
      "MAJOR": "Gigante"
    };
    const colorClassNames = {
      "PRETO": "color-preto",
      "CINZA ESCURO": "color-cinza-escuro",
      "CINZA CLARO": "color-cinza-claro",
      "VERMELHO": "color-vermelho",
      "BRANCO": "color-branco"
    };

    let lastFocusedElement = null;
    let products = [];
    let activeProduct = null;
    let activeSlideIndex = 0;
    let activeColorName = "PRETO";
    let schemeAssetVersion = "";
    let touchStartX = 0;

    function shuffle(array) {
      const arr = [...array];

      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }

      return arr;
    }

    function createStatusMessage(text) {
      const message = document.createElement("p");
      message.className = "catalog-status";
      message.textContent = text;
      return message;
    }

    function normalizeAssetPath(path) {
      const normalizedPath = String(path || "")
        .replace(/\\/g, "/")
        .replace(/^\/+/, "")
        .replace(/\/{2,}/g, "/");

      if (normalizedPath.split("/").some(part => part === "..")) {
        return "";
      }

      return normalizedPath;
    }

    function versionAssetPath(path) {
      if (!schemeAssetVersion) {
        return path;
      }

      const separator = path.includes("?") ? "&" : "?";
      return `${path}${separator}v=${encodeURIComponent(schemeAssetVersion)}`;
    }

    function readValue(source, name) {
      if (!source) {
        return "";
      }

      if (typeof source.getAttribute === "function") {
        return source.getAttribute(name) || "";
      }

      return source[name] == null ? "" : String(source[name]);
    }

    function normalizeMarketplaceUrl(url) {
      try {
        const parsedUrl = new URL(String(url || "").trim(), window.location.href);
        return parsedUrl.protocol === "https:" ? parsedUrl.href : "";
      } catch (error) {
        return "";
      }
    }

    function parseRedirects(sizeElement) {
      if (Array.isArray(sizeElement.marketplaceRedirects)) {
        return sizeElement.marketplaceRedirects
          .map(redirect => ({
            slot: readValue(redirect, "slot"),
            marketplace: readValue(redirect, "marketplace"),
            url: readValue(redirect, "url")
          }))
          .map(redirect => ({
            ...redirect,
            url: normalizeMarketplaceUrl(redirect.url)
          }))
          .filter(redirect => redirect.url.length > 0);
      }

      return Array.from(sizeElement.getElementsByTagName("redirect"))
        .map(redirect => ({
          slot: readValue(redirect, "slot"),
          marketplace: readValue(redirect, "marketplace"),
          url: readValue(redirect, "url")
        }))
        .map(redirect => ({
          ...redirect,
          url: normalizeMarketplaceUrl(redirect.url)
        }))
        .filter(redirect => redirect.url.length > 0);
    }

    function parseImage(imageElement) {
      const path = normalizeAssetPath(readValue(imageElement, "path"));
      if (!path || !path.startsWith(generatedProductRoot)) {
        return null;
      }

      return {
        path,
        src: versionAssetPath(encodeURI(path)),
        color: readValue(imageElement, "color"),
        widthCm: readValue(imageElement, "widthCm"),
        heightCm: readValue(imageElement, "heightCm"),
        dimensionMarker: readValue(imageElement, "dimensionMarker").toLowerCase() === "true"
      };
    }

    function chooseSizeImage(images, colorName = activeColorName) {
      const wanted = (colorName || "").toUpperCase();
      return images.find(image => image.color.toUpperCase() === wanted) ||
        images.find(image => image.color.toUpperCase() === "PRETO") ||
        images[0] ||
        null;
    }

    function chooseDimensionImage(slide, colorName = activeColorName) {
      return chooseSizeImage(slide.dimensionImages, colorName);
    }

    function createThumbnailImage(image) {
      if (!image || !image.path) {
        return image;
      }

      const match = image.path.match(/^images\/products\/FAJARDOGAMES\/([^/]+)\/preview\/[^/]+$/);
      if (!match) {
        return image;
      }

      const thumbPath = `${generatedProductRoot}${match[1]}/thumb/${match[1]}_thumb.jpg`;
      return {
        ...image,
        src: versionAssetPath(encodeURI(thumbPath)),
        fallbackSrc: image.src
      };
    }

    function parseSize(sizeElement, productImages = []) {
      const isJsonSize = !sizeElement.children;
      const allImages = isJsonSize
        ? [
            ...((Array.isArray(sizeElement.images) ? sizeElement.images : [])),
            ...((Array.isArray(sizeElement.dimensionImages) ? sizeElement.dimensionImages : []))
          ].map(parseImage).filter(Boolean)
        : Array.from(sizeElement.children)
          .filter(child => child.tagName === "image")
          .map(parseImage)
          .filter(Boolean);
      const images = productImages.length > 0
        ? productImages
        : allImages.filter(image => !image.dimensionMarker);
      const dimensionImages = allImages.filter(image => image.dimensionMarker);
      if (images.length === 0 && dimensionImages.length === 0) {
        return null;
      }

      return {
        name: readValue(sizeElement, "name"),
        label: readValue(sizeElement, "displayName") || sizeLabels[readValue(sizeElement, "name")] || readValue(sizeElement, "name"),
        capCm: readValue(sizeElement, "capCm"),
        images,
        dimensionImages,
        redirects: parseRedirects(sizeElement)
      };
    }

    function sortSizes(sizes) {
      return sizes.sort((a, b) => {
        const capDiff = (Number(a.capCm) || 0) - (Number(b.capCm) || 0);
        if (capDiff !== 0) {
          return capDiff;
        }

        const aIndex = sizeOrder.indexOf(a.name);
        const bIndex = sizeOrder.indexOf(b.name);
        return (aIndex < 0 ? 99 : aIndex) - (bIndex < 0 ? 99 : bIndex);
      });
    }

    function chooseProductThumb(slides, colorName = "PRETO") {
      const slide = slides.find(slide => slide.name === "major") ||
        slides.find(slide => slide.name === "MINOR") ||
        slides[0];
      return createThumbnailImage(chooseSizeImage(slide.images, colorName) || chooseDimensionImage(slide, colorName));
    }

    function parseProduct(productElement, index) {
      const isJsonProduct = !productElement.children;
      const productImages = isJsonProduct && Array.isArray(productElement.images)
        ? productElement.images.map(parseImage).filter(Boolean)
        : [];
      const sizeElements = isJsonProduct
        ? (Array.isArray(productElement.sizes) ? productElement.sizes : [])
        : Array.from(productElement.children).find(child => child.tagName === "sizes")?.children || [];
      if (!sizeElements || sizeElements.length === 0) {
        return null;
      }

      const slides = sortSizes(Array.from(sizeElements)
        .filter(child => isJsonProduct || child.tagName === "size")
        .map(child => parseSize(child, productImages))
        .filter(Boolean));

      if (slides.length === 0) {
        return null;
      }

      const title = isJsonProduct
        ? (productElement.title || `Produto ${index + 1}`)
        : (Array.from(productElement.children).find(item => item.tagName === "title")?.textContent.trim() || `Produto ${index + 1}`);
      const thumb = chooseProductThumb(slides);
      if (!thumb) {
        return null;
      }

      return {
        id: readValue(productElement, "id") || `produto-${index + 1}`,
        label: title,
        defaultColor: readValue(productElement, "defaultColor") || "PRETO",
        thumb: thumb.src,
        thumbFallback: thumb.fallbackSrc || thumb.src,
        slides
      };
    }

    function loadSchemeText() {
      if (typeof fetch === "function") {
        return fetch(`${schemeUrl}?v=${Date.now()}`, { cache: "no-store" }).then(response => {
          if (!response.ok) {
            throw new Error(`Scheme HTTP ${response.status}`);
          }

          return response.text();
        });
      }

      return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("GET", `${schemeUrl}?v=${Date.now()}`);
        request.onload = () => {
          if (request.status >= 200 && request.status < 300) {
            resolve(request.responseText);
            return;
          }

          reject(new Error(`Scheme HTTP ${request.status}`));
        };
        request.onerror = () => reject(new Error("Scheme request failed"));
        request.send();
      });
    }

    async function fetchProducts() {
      const scheme = JSON.parse(await loadSchemeText());
      schemeAssetVersion = scheme.generatedUtc ||
        scheme.version ||
        "";

      return (Array.isArray(scheme.products) ? scheme.products : [])
        .map(parseProduct)
        .filter(Boolean);
    }

    function currentSlide() {
      return activeProduct ? activeProduct.slides[activeSlideIndex] : null;
    }

    function normalizeColorName(colorName) {
      return (colorName || "").trim().toUpperCase();
    }

    function getAvailableColors(slide) {
      const colorImages = slide.images.length > 0 ? slide.images : slide.dimensionImages;
      return colorImages
        .map(image => image.color)
        .filter(Boolean)
        .filter((color, index, colors) => colors.findIndex(item => normalizeColorName(item) === normalizeColorName(color)) === index);
    }

    function chooseProductColor(product, preferredColor = activeColorName) {
      for (const slide of product.slides) {
        const image = chooseSizeImage(slide.images, preferredColor) || chooseDimensionImage(slide, preferredColor);
        if (image) {
          return image.color;
        }
      }

      return preferredColor;
    }

    function chooseModalImage(slide) {
      return chooseDimensionImage(slide, activeColorName) ||
        chooseSizeImage(slide.images, activeColorName) ||
        chooseDimensionImage(slide) ||
        chooseSizeImage(slide.images);
    }

    function formatSlideCaption(product, slide, image) {
      const pieces = [product.label, slide.label || slide.name];
      if (image && image.widthCm && image.heightCm) {
        pieces.push(`${image.widthCm}cm x ${image.heightCm}cm`);
      }

      return pieces.join(" - ");
    }

    function setBuyLink(slide) {
      const redirect = slide.redirects[0];
      if (redirect && redirect.url) {
        modalBuy.href = redirect.url;
        modalBuy.textContent = "COMPRAR";
        modalBuy.classList.remove("is-disabled");
        modalBuy.removeAttribute("aria-disabled");
        return;
      }

      modalBuy.removeAttribute("href");
      modalBuy.textContent = "EM BREVE";
      modalBuy.classList.add("is-disabled");
      modalBuy.setAttribute("aria-disabled", "true");
    }

    function renderSizeChips() {
      if (!activeProduct) {
        modalSizeTrack.replaceChildren();
        return;
      }

      const fragment = document.createDocumentFragment();
      activeProduct.slides.forEach((slide, index) => {
        const chip = document.createElement("button");
        chip.className = "modal-size-chip";
        chip.type = "button";
        chip.textContent = slide.label || slide.name;
        chip.setAttribute("aria-label", `Ver tamanho ${slide.label || slide.name}`);
        if (index === activeSlideIndex) {
          chip.classList.add("is-active");
        }

        chip.addEventListener("click", () => {
          const nextIndex = activeProduct.slides.findIndex(item => item.name === slide.name);
          activeSlideIndex = nextIndex >= 0 ? nextIndex : index;
          const nextSlide = currentSlide();
          if (nextSlide && !chooseSizeImage(nextSlide.images, activeColorName)) {
            const fallback = chooseSizeImage(nextSlide.images);
            if (fallback) {
              activeColorName = fallback.color;
            }
          }

          renderModalSlide();
        });
        fragment.appendChild(chip);
      });

      modalSizeTrack.replaceChildren(fragment);
    }

    function updateColorChipSelection(colorName) {
      const selectedColor = normalizeColorName(colorName);
      modalColorTrack.querySelectorAll(".modal-color-chip").forEach(chip => {
        const isActive = normalizeColorName(chip.dataset.color) === selectedColor;
        chip.classList.toggle("is-active", isActive);
        chip.setAttribute("aria-pressed", String(isActive));
      });
    }

    function renderColorChips(slide) {
      const colors = getAvailableColors(slide);
      if (colors.length === 0) {
        modalColorTrack.replaceChildren();
        return;
      }

      const selected = chooseSizeImage(slide.images, activeColorName) || chooseSizeImage(slide.images);
      if (selected) {
        activeColorName = selected.color;
      }

      const fragment = document.createDocumentFragment();
      colors.forEach(color => {
        const chip = document.createElement("button");
        chip.className = "modal-color-chip";
        chip.type = "button";
        chip.title = color;
        chip.dataset.color = color;
        chip.setAttribute("aria-label", `Ver cor ${color}`);
        chip.classList.add(colorClassNames[normalizeColorName(color)] || "color-preto");
        const isActive = normalizeColorName(color) === normalizeColorName(activeColorName);
        chip.setAttribute("aria-pressed", String(isActive));
        if (isActive) {
          chip.classList.add("is-active");
        }

        chip.addEventListener("click", () => {
          activeColorName = color;
          updateColorChipSelection(color);

          const image = chooseModalImage(slide);
          if (image) {
            modalImage.src = image.src;
            modalImage.alt = `${activeProduct.label} ${slide.label || slide.name}`;
            modalCaption.textContent = formatSlideCaption(activeProduct, slide, image);
          }
        });
        fragment.appendChild(chip);
      });

      modalColorTrack.replaceChildren(fragment);
    }

    function renderModalSlide() {
      if (!activeProduct) {
        return;
      }

      const slide = activeProduct.slides[activeSlideIndex];
      const image = chooseModalImage(slide);
      if (!image) {
        return;
      }

      modalImage.src = image.src;
      modalImage.alt = `${activeProduct.label} ${slide.label || slide.name}`;
      modalCaption.textContent = formatSlideCaption(activeProduct, slide, image);
      modalPrev.disabled = activeProduct.slides.length < 2;
      modalNext.disabled = activeProduct.slides.length < 2;
      setBuyLink(slide);
      renderSizeChips();
      renderColorChips(slide);
    }

    function moveSlide(direction) {
      if (!activeProduct || activeProduct.slides.length < 2) {
        return;
      }

      activeSlideIndex = (activeSlideIndex + direction + activeProduct.slides.length) % activeProduct.slides.length;
      renderModalSlide();
    }

    function openProductModal(product) {
      lastFocusedElement = document.activeElement;
      activeProduct = product;
      activeSlideIndex = 0;
      activeColorName = chooseProductColor(product, product.defaultColor || "PRETO");

      renderModalSlide();

      modal.classList.add("is-open");
      document.body.classList.add("modal-open");

      modalClose.focus();
    }

    function closeProductModal() {
      modal.classList.remove("is-open");
      document.body.classList.remove("modal-open");

      modalImage.src = "";
      modalCaption.textContent = "";
      modalSizeTrack.replaceChildren();
      modalColorTrack.replaceChildren();
      activeProduct = null;
      activeSlideIndex = 0;

      if (lastFocusedElement) {
        lastFocusedElement.focus();
      }
    }

    function createProductTile(product, position) {
      const eagerTileCount = window.matchMedia("(max-width: 480px)").matches ? 2 : 6;
      const highPriorityTileCount = window.matchMedia("(max-width: 480px)").matches ? 1 : 3;
      const button = document.createElement("button");
      button.className = "product-tile";
      button.type = "button";
      button.dataset.productId = product.id;
      button.setAttribute("aria-label", `Ver ${product.label} ampliado`);
      button.addEventListener("click", () => openProductModal(product));

      const img = document.createElement("img");
      img.src = product.thumb;
      img.alt = "";
      img.width = 520;
      img.height = 520;
      img.loading = position < eagerTileCount ? "eager" : "lazy";
      img.decoding = "async";
      img.fetchPriority = position < highPriorityTileCount ? "high" : "low";
      img.referrerPolicy = "no-referrer";
      img.dataset.fallbackSrc = product.thumbFallback || "";
      img.addEventListener("error", () => {
        if (!img.dataset.fallbackSrc || img.src === img.dataset.fallbackSrc) {
          return;
        }

        img.src = img.dataset.fallbackSrc;
        img.dataset.fallbackSrc = "";
      });

      const cue = document.createElement("span");
      cue.className = "tile-cue";
      cue.setAttribute("aria-hidden", "true");
      cue.textContent = "🔍";

      const sr = document.createElement("span");
      sr.className = "sr-only";
      sr.textContent = `Ver ${product.label} ampliado`;

      button.append(img, cue, sr);
      return button;
    }

    async function loadCatalog() {
      grid.classList.remove("loaded");
      grid.replaceChildren(createStatusMessage("Carregando catálogo..."));

      try {
        products = await fetchProducts();
      } catch (error) {
        grid.replaceChildren(createStatusMessage("Nenhum produto processado ainda."));
        grid.classList.add("loaded");
        return;
      }

      const shuffledProducts = shuffle(products);

      if (shuffledProducts.length === 0) {
        grid.replaceChildren(createStatusMessage("Nenhum produto processado ainda."));
        grid.classList.add("loaded");
        return;
      }

      const fragment = document.createDocumentFragment();

      shuffledProducts.forEach((product, position) => {
        fragment.appendChild(createProductTile(product, position));
      });

      grid.replaceChildren(fragment);
      grid.classList.add("loaded");
    }

    modalClose.addEventListener("click", closeProductModal);
    modalPrev.addEventListener("click", () => moveSlide(-1));
    modalNext.addEventListener("click", () => moveSlide(1));

    modal.addEventListener("click", event => {
      if (event.target === modal) {
        closeProductModal();
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && modal.classList.contains("is-open")) {
        closeProductModal();
      }

      if (event.key === "ArrowLeft" && modal.classList.contains("is-open")) {
        moveSlide(-1);
      }

      if (event.key === "ArrowRight" && modal.classList.contains("is-open")) {
        moveSlide(1);
      }
    });

    modalImage.addEventListener("touchstart", event => {
      touchStartX = event.changedTouches[0].clientX;
    }, { passive: true });

    modalImage.addEventListener("touchend", event => {
      const deltaX = event.changedTouches[0].clientX - touchStartX;
      if (Math.abs(deltaX) < 36) {
        return;
      }

      moveSlide(deltaX > 0 ? -1 : 1);
    }, { passive: true });

    loadCatalog();

