const automotiveUrl = "catalog-by-brand-model.json";
const automotiveMarketplaceUrl = "automotive-marketplace-links.json";
const schemeUrl = "autoadesivos-product-scheme.json";
const generatedProductRoot = "images/products/FAJARDOGAMES/";

const sizeOrder = ["minor", "major", "MINOR", "MAJOR"];
const colorClassNames = {
  "PRETO": "color-preto",
  "CINZA ESCURO": "color-cinza-escuro",
  "CINZA CLARO": "color-cinza-claro",
  "VERMELHO": "color-vermelho",
  "BRANCO": "color-branco"
};
const automotiveColorPalette = ["PRETO", "CINZA ESCURO", "CINZA CLARO", "VERMELHO"];
const redactedGeneratedProductIds = new Set(["produto-11"]);
const brandCountries = {
  Chevrolet: { code: "us", name: "United States" },
  Volkswagen: { code: "de", name: "Germany" },
  Fiat: { code: "it", name: "Italy" },
  Ford: { code: "us", name: "United States" },
  Honda: { code: "jp", name: "Japan" },
  Peugeot: { code: "fr", name: "France" },
  Renault: { code: "fr", name: "France" },
  Hyundai: { code: "kr", name: "South Korea" },
  Kia: { code: "kr", name: "South Korea" },
  "Citro\u00ebn": { code: "fr", name: "France" }
};

const els = {
  tabs: Array.from(document.querySelectorAll(".tab")),
  brandPanel: document.getElementById("brand-panel"),
  brandCount: document.getElementById("brand-count"),
  brandList: document.getElementById("brand-list"),
  modelMenu: document.getElementById("model-menu"),
  viewerPanel: document.querySelector(".viewer-panel"),
  catalogKicker: document.getElementById("catalog-kicker"),
  catalogTitle: document.getElementById("catalog-title"),
  productCount: document.getElementById("product-count"),
  grid: document.getElementById("catalog-grid"),
  modal: document.getElementById("product-modal"),
  modalClose: document.getElementById("modal-close"),
  modalImageWrap: document.getElementById("modal-image-wrap"),
  modalImage: document.getElementById("modal-image"),
  modalPrev: document.getElementById("modal-prev"),
  modalNext: document.getElementById("modal-next"),
  modalKicker: document.getElementById("modal-kicker"),
  modalTitle: document.getElementById("modal-title"),
  modalDescription: document.getElementById("modal-description"),
  modalMeta: document.getElementById("modal-meta"),
  modalSizeTrack: document.getElementById("modal-size-track"),
  modalColorTrack: document.getElementById("modal-color-track"),
  modalVariationTrack: document.getElementById("modal-variation-track"),
  modalBuy: document.getElementById("modal-buy")
};

const state = {
  activeTab: "automotive",
  automotiveBrands: [],
  automotiveMarketplaceLinks: {},
  fajardoProducts: [],
  selectedBrandName: "",
  selectedModelName: "",
  activeProduct: null,
  activeImageIndex: 0,
  activeSlideIndex: 0,
  activeColorName: "PRETO",
  modalZoomed: false,
  lastFocusedElement: null,
  schemeAssetVersion: "",
  touchStartX: 0
};

function countLabel(count) {
  return `${count} ${count === 1 ? "produto" : "produtos"}`;
}

function getBrandCountry(brandName) {
  return brandCountries[brandName] || null;
}

function createBrandFlag(brandName) {
  const country = getBrandCountry(brandName);
  if (!country) {
    return null;
  }

  const flag = document.createElement("span");
  flag.className = `flag-icon flag-${country.code}`;
  flag.setAttribute("role", "img");
  flag.setAttribute("aria-label", country.name);
  flag.title = country.name;
  return flag;
}

function createBrandLabel(brandName, className) {
  const label = document.createElement("span");
  label.className = className;

  const flag = createBrandFlag(brandName);
  if (flag) {
    label.appendChild(flag);
  }

  const text = document.createElement("span");
  text.textContent = brandName;
  label.appendChild(text);
  return label;
}

function formatBrandName(brandName) {
  return brandName;
}

function setCatalogBrandTitle(brandName, modelName) {
  els.catalogTitle.textContent = `${brandName} ${modelName}`;
}

function setStatus(text) {
  const message = document.createElement("p");
  message.className = "status-message";
  message.textContent = text;
  els.grid.replaceChildren(message);
  els.productCount.textContent = countLabel(0);
}

async function fetchJson(url) {
  const response = await fetch(`${url}?v=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${url} HTTP ${response.status}`);
  }

  return response.json();
}

function normalizeExternalImageUrl(url) {
  try {
    const parsedUrl = new URL(String(url || "").trim(), window.location.href);
    return parsedUrl.protocol === "https:" ? parsedUrl.href : "";
  } catch (error) {
    return "";
  }
}

function createShopeeSearchUrl(product) {
  const query = product.Name || product.Sku || "";
  return `https://shopee.com.br/search?keyword=${encodeURIComponent(query)}`;
}

function normalizeMarketplaceUrl(url) {
  try {
    const parsedUrl = new URL(String(url || "").trim());
    const allowedHosts = new Set(["shopee.com.br", "www.shopee.com.br"]);
    if (parsedUrl.protocol !== "https:" || !allowedHosts.has(parsedUrl.hostname)) {
      return "";
    }

    return parsedUrl.href;
  } catch (error) {
    return "";
  }
}

function canonicalColorName(colorName) {
  const normalized = normalizeColorName(colorName)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (!normalized) {
    return "";
  }

  if (normalized.includes("CINZA") && normalized.includes("ESCURO")) {
    return "CINZA ESCURO";
  }

  if (normalized.includes("CINZA") && normalized.includes("CLARO")) {
    return "CINZA CLARO";
  }

  if (normalized.includes("VERMELH")) {
    return "VERMELHO";
  }

  if (normalized.includes("BRANC")) {
    return "BRANCO";
  }

  if (normalized.includes("PRET")) {
    return "PRETO";
  }

  return "";
}

function formatColorName(colorName) {
  const labels = {
    "PRETO": "Preto",
    "CINZA ESCURO": "Cinza escuro",
    "CINZA CLARO": "Cinza claro",
    "VERMELHO": "Vermelho",
    "BRANCO": "Branco"
  };

  return labels[normalizeColorName(colorName)] || String(colorName || "");
}

function createAutomotiveColorOption(colorName, imageUrl = "") {
  const name = canonicalColorName(colorName);
  if (!name) {
    return null;
  }

  return {
    name,
    label: formatColorName(name),
    imageSrc: normalizeExternalImageUrl(imageUrl)
  };
}

function uniqueColorOptions(options) {
  const colors = new Map();
  options.filter(Boolean).forEach(option => {
    const key = normalizeColorName(option.name);
    const existing = colors.get(key);
    if (!existing || (!existing.imageSrc && option.imageSrc)) {
      colors.set(key, option);
    }
  });

  return Array.from(colors.values());
}

function parseAutomotiveColors(product) {
  const options = [];
  (Array.isArray(product.Variations) ? product.Variations : []).forEach(variation => {
    options.push(createAutomotiveColorOption(variation.Name, variation.ImageUrl));
  });

  (Array.isArray(product.VariationOptions) ? product.VariationOptions : []).forEach(option => {
    options.push(createAutomotiveColorOption(option));
  });

  const colorsByName = new Map(uniqueColorOptions(options).map(option => [normalizeColorName(option.name), option]));
  return automotiveColorPalette.map(color => {
    return colorsByName.get(color) || {
      name: color,
      label: formatColorName(color),
      imageSrc: ""
    };
  });
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
  if (!state.schemeAssetVersion) {
    return path;
  }

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${encodeURIComponent(state.schemeAssetVersion)}`;
}

function readValue(source, name) {
  if (!source) {
    return "";
  }

  return source[name] == null ? "" : String(source[name]);
}

function uniqueImages(images) {
  const seen = new Set();
  return images.filter(image => {
    if (!image.src || seen.has(image.src)) {
      return false;
    }

    seen.add(image.src);
    return true;
  });
}

function parseAutomotiveProduct(product, brandName, modelName, index, marketplaceLinks) {
  if (product.Active === false) {
    return null;
  }

  const coverImage = normalizeExternalImageUrl(product.CoverImageUrl);
  const images = uniqueImages([{ src: coverImage, label: "Principal" }]);

  if (images.length === 0) {
    return null;
  }

  const sku = product.Sku || "";
  const variationName = product.VariationName || "";
  const availableColors = parseAutomotiveColors(product);

  return {
    type: "automotive",
    id: `automotive-${brandName}-${modelName}-${product.Id || sku || index}`,
    brandName,
    modelName,
    title: product.Name || sku || `Produto ${index + 1}`,
    subtitle: `${formatBrandName(brandName)} ${modelName}`,
    description: product.Description || product.Name || "",
    thumb: images[0].src,
    images,
    marketplaceUrl: normalizeMarketplaceUrl(marketplaceLinks[String(product.Id)]) || createShopeeSearchUrl(product),
    defaultColor: availableColors[0] ? availableColors[0].name : "PRETO",
    availableColors,
    meta: [
      formatBrandName(brandName),
      modelName,
      sku ? `SKU ${sku}` : "",
      variationName
    ].filter(Boolean)
  };
}

function parseAutomotiveCatalog(catalog, marketplaceLinks) {
  return (Array.isArray(catalog) ? catalog : [])
    .map(brand => {
      const brandName = brand.Name || "";
      const models = (Array.isArray(brand.Models) ? brand.Models : [])
        .map(model => {
          const modelName = model.Name || "";
          const products = (Array.isArray(model.Products) ? model.Products : [])
            .map((product, index) => parseAutomotiveProduct(product, brandName, modelName, index, marketplaceLinks))
            .filter(Boolean);

          return {
            name: modelName,
            products
          };
        });

      return {
        name: brandName,
        models,
        productCount: models.reduce((total, model) => total + model.products.length, 0)
      };
    })
    .filter(brand => brand.name);
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

function parseSize(sizeElement, productImages) {
  const allImages = [
    ...(Array.isArray(sizeElement.images) ? sizeElement.images : []),
    ...(Array.isArray(sizeElement.dimensionImages) ? sizeElement.dimensionImages : [])
  ].map(parseImage).filter(Boolean);
  const images = productImages.length > 0
    ? productImages
    : allImages.filter(image => !image.dimensionMarker);
  const dimensionImages = allImages.filter(image => image.dimensionMarker);

  if (images.length === 0 && dimensionImages.length === 0) {
    return null;
  }

  return {
    name: readValue(sizeElement, "name"),
    label: readValue(sizeElement, "displayName") || readValue(sizeElement, "name"),
    capCm: readValue(sizeElement, "capCm"),
    images,
    dimensionImages
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

function normalizeColorName(colorName) {
  return String(colorName || "").trim().toUpperCase();
}

function chooseSizeImage(images, colorName = state.activeColorName) {
  const wanted = normalizeColorName(colorName);
  return images.find(image => normalizeColorName(image.color) === wanted) ||
    images.find(image => normalizeColorName(image.color) === "PRETO") ||
    images[0] ||
    null;
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

function chooseProductThumb(slides) {
  const slide = slides.find(item => item.name === "major") ||
    slides.find(item => item.name === "MINOR") ||
    slides[0];
  return createThumbnailImage(chooseSizeImage(slide.images, "PRETO") || chooseSizeImage(slide.dimensionImages, "PRETO"));
}

function parseFajardoProduct(product, index) {
  const productImages = Array.isArray(product.images)
    ? product.images.map(parseImage).filter(Boolean)
    : [];
  const sizeElements = Array.isArray(product.sizes) ? product.sizes : [];
  const slides = sortSizes(sizeElements
    .map(size => parseSize(size, productImages))
    .filter(Boolean));

  if (slides.length === 0) {
    return null;
  }

  const thumb = chooseProductThumb(slides);
  if (!thumb) {
    return null;
  }

  return {
    type: "fajardogames",
    id: readValue(product, "id") || `fajardogames-${index + 1}`,
    title: product.title || `FAJARDOGAMES ${index + 1}`,
    subtitle: "FAJARDOGAMES",
    description: product.salesDescription || product.visualDescription || "",
    defaultColor: readValue(product, "defaultColor") || "PRETO",
    thumb: thumb.src,
    thumbFallback: thumb.fallbackSrc || thumb.src,
    slides,
    meta: [readValue(product, "id")].filter(Boolean)
  };
}

function parseFajardoCatalog(scheme) {
  state.schemeAssetVersion = scheme.generatedUtc || scheme.version || "";
  return (Array.isArray(scheme.products) ? scheme.products : [])
    .filter(product => !redactedGeneratedProductIds.has(readValue(product, "id")))
    .map(parseFajardoProduct)
    .filter(Boolean);
}

function findFirstPopulatedModel() {
  for (const brand of state.automotiveBrands) {
    for (const model of brand.models) {
      if (model.products.length > 0) {
        return { brand, model };
      }
    }
  }

  return null;
}

function findSelectedModel() {
  const brand = state.automotiveBrands.find(item => item.name === state.selectedBrandName);
  const model = brand?.models.find(item => item.name === state.selectedModelName);
  return brand && model ? { brand, model } : null;
}

function renderTabs() {
  els.tabs.forEach(tab => {
    const isActive = tab.dataset.tab === state.activeTab;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function renderBrandList() {
  els.brandCount.textContent = String(state.automotiveBrands.length);

  const fragment = document.createDocumentFragment();
  state.automotiveBrands.forEach(brand => {
    const button = document.createElement("button");
    button.className = "brand-button";
    button.type = "button";
    button.dataset.brand = brand.name;
    button.disabled = brand.models.length === 0;
    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-expanded", "false");
    button.classList.toggle("is-active", brand.name === state.selectedBrandName);
    button.addEventListener("click", () => openModelMenu(brand, button));

    const name = createBrandLabel(brand.name, "brand-name");

    const meta = document.createElement("span");
    meta.className = "brand-meta";
    meta.textContent = `${brand.models.length}/${brand.productCount}`;

    button.append(name, meta);
    fragment.appendChild(button);
  });

  els.brandList.replaceChildren(fragment);
}

function positionModelMenu(anchor) {
  const rect = anchor.getBoundingClientRect();
  const gap = 8;
  const pad = 14;
  const menuWidth = els.modelMenu.offsetWidth || Math.min(280, window.innerWidth - pad * 2);
  const menuHeight = els.modelMenu.offsetHeight || Math.min(420, window.innerHeight - pad * 2);
  const maxLeft = Math.max(pad, window.innerWidth - menuWidth - pad);
  const maxTop = Math.max(pad, window.innerHeight - menuHeight - pad);
  const isCompact = window.innerWidth <= 860;
  let left;
  let top;

  if (isCompact) {
    left = clampNumber(rect.left, pad, maxLeft);
    top = rect.bottom + gap;
    if (top > maxTop && rect.top - menuHeight - gap >= pad) {
      top = rect.top - menuHeight - gap;
    }
  } else {
    left = rect.right + gap;
    if (left > maxLeft && rect.left - menuWidth - gap >= pad) {
      left = rect.left - menuWidth - gap;
    }

    top = clampNumber(rect.top, pad, maxTop);
  }

  els.modelMenu.style.left = `${clampNumber(left, pad, maxLeft)}px`;
  els.modelMenu.style.top = `${clampNumber(top, pad, maxTop)}px`;
}

function closeModelMenu() {
  els.modelMenu.classList.remove("is-open");
  els.modelMenu.setAttribute("aria-hidden", "true");
  els.brandList.querySelectorAll(".brand-button").forEach(button => {
    button.setAttribute("aria-expanded", "false");
  });
}

function openModelMenu(brand, anchor) {
  if (!brand.models.length) {
    closeModelMenu();
    return;
  }

  const fragment = document.createDocumentFragment();
  brand.models.forEach(model => {
    const option = document.createElement("button");
    option.className = "model-option";
    option.type = "button";
    option.role = "menuitem";
    option.classList.toggle("is-active", brand.name === state.selectedBrandName && model.name === state.selectedModelName);
    option.addEventListener("click", () => {
      selectAutomotiveModel(brand.name, model.name);
      closeModelMenu();
    });

    const name = document.createElement("strong");
    name.textContent = model.name;

    const count = document.createElement("span");
    count.textContent = countLabel(model.products.length);

    option.append(name, count);
    fragment.appendChild(option);
  });

  els.modelMenu.replaceChildren(fragment);
  els.modelMenu.classList.add("is-open");
  els.modelMenu.setAttribute("aria-hidden", "false");
  els.brandList.querySelectorAll(".brand-button").forEach(button => {
    button.setAttribute("aria-expanded", String(button === anchor));
  });
  positionModelMenu(anchor);
}

function selectAutomotiveModel(brandName, modelName) {
  state.selectedBrandName = brandName;
  state.selectedModelName = modelName;
  renderBrandList();
  renderAutomotiveSelection();
}

function openMarketplace(product) {
  const marketplaceUrl = normalizeMarketplaceUrl(product && product.marketplaceUrl);
  if (!marketplaceUrl) {
    return;
  }

  const link = document.createElement("a");
  link.href = marketplaceUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function createProductCard(product, position) {
  const button = document.createElement("button");
  button.className = "product-card";
  if (product.type === "fajardogames") {
    button.classList.add("is-thumb-only");
  }
  button.type = "button";
  button.setAttribute("aria-label", `Ver ${product.title}`);
  button.addEventListener("click", () => openProductModal(product));

  const imageWrap = document.createElement("span");
  imageWrap.className = "product-image";

  const img = document.createElement("img");
  img.src = product.thumb;
  img.alt = product.title;
  img.loading = position < 6 ? "eager" : "lazy";
  img.decoding = "async";
  img.referrerPolicy = "no-referrer";
  img.dataset.fallbackSrc = product.thumbFallback || "";
  img.addEventListener("error", () => {
    if (!img.dataset.fallbackSrc || img.src === img.dataset.fallbackSrc) {
      if (product.type === "fajardogames") {
        button.remove();
        updateRenderedProductCount();
      }
      return;
    }

    img.src = img.dataset.fallbackSrc;
    img.dataset.fallbackSrc = "";
  });

  imageWrap.appendChild(img);
  button.appendChild(imageWrap);

  if (product.type !== "fajardogames") {
    const info = document.createElement("span");
    info.className = "product-info";

    const title = document.createElement("strong");
    title.textContent = product.title;

    const subtitle = document.createElement("span");
    subtitle.textContent = product.subtitle;

    info.append(title, subtitle);
    button.appendChild(info);
  }

  return button;
}

function updateRenderedProductCount() {
  els.productCount.textContent = countLabel(els.grid.querySelectorAll(".product-card").length);
}

function renderProducts(products) {
  els.productCount.textContent = countLabel(products.length);

  if (products.length === 0) {
    setStatus("Nenhum produto encontrado para este catálogo.");
    return;
  }

  const fragment = document.createDocumentFragment();
  products.forEach((product, index) => {
    fragment.appendChild(createProductCard(product, index));
  });

  els.grid.replaceChildren(fragment);
}

function renderAutomotiveSelection() {
  const selected = findSelectedModel() || findFirstPopulatedModel();
  if (!selected) {
    els.catalogKicker.textContent = "AUTOMOTIVOS";
    els.catalogTitle.textContent = "Sem modelos disponíveis";
    setStatus("Nenhum modelo automotivo disponível.");
    return;
  }

  state.selectedBrandName = selected.brand.name;
  state.selectedModelName = selected.model.name;
  els.catalogKicker.textContent = "AUTOMOTIVOS";
  setCatalogBrandTitle(selected.brand.name, selected.model.name);
  renderProducts(selected.model.products);
}

async function ensureAutomotiveCatalog() {
  if (state.automotiveBrands.length > 0) {
    return;
  }

  setStatus("Carregando automotivos...");
  const [catalog, marketplaceLinks] = await Promise.all([
    fetchJson(automotiveUrl),
    fetchJson(automotiveMarketplaceUrl).catch(() => ({ products: {} }))
  ]);
  state.automotiveMarketplaceLinks = marketplaceLinks.products || {};
  state.automotiveBrands = parseAutomotiveCatalog(catalog, state.automotiveMarketplaceLinks);
  const first = findFirstPopulatedModel();
  if (first) {
    state.selectedBrandName = first.brand.name;
    state.selectedModelName = first.model.name;
  }
}

async function ensureFajardoCatalog() {
  if (state.fajardoProducts.length > 0) {
    return;
  }

  setStatus("Carregando FajardoGames...");
  const scheme = await fetchJson(schemeUrl);
  state.fajardoProducts = parseFajardoCatalog(scheme);
}

async function activateTab(tabName) {
  state.activeTab = tabName;
  closeModelMenu();
  renderTabs();

  try {
    if (tabName === "automotive") {
      els.brandPanel.classList.remove("is-hidden");
      els.viewerPanel.classList.remove("is-wide");
      await ensureAutomotiveCatalog();
      renderBrandList();
      renderAutomotiveSelection();
      return;
    }

    els.brandPanel.classList.add("is-hidden");
    els.viewerPanel.classList.add("is-wide");
    els.catalogKicker.textContent = "Youtube";
    els.catalogTitle.textContent = "FAJARDOGAMES";
    await ensureFajardoCatalog();
    renderProducts(state.fajardoProducts);
  } catch (error) {
    els.catalogTitle.textContent = "Catálogo indisponível";
    setStatus("Não foi possível carregar os dados do catálogo.");
  }
}

function clearModalTracks() {
  els.modalMeta.replaceChildren();
  els.modalSizeTrack.replaceChildren();
  els.modalColorTrack.replaceChildren();
  els.modalVariationTrack.replaceChildren();
  els.modalBuy.hidden = true;
  resetModalZoom();
}

function resetModalZoom() {
  state.modalZoomed = false;
  els.modalImageWrap.classList.remove("is-zoomed");
  els.modalImage.style.transformOrigin = "center center";
}

function setModalZoomOrigin(event) {
  const rect = els.modalImageWrap.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return;
  }

  const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
  const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
  els.modalImage.style.transformOrigin = `${x}% ${y}%`;
}

function toggleModalZoom(event) {
  if (!state.activeProduct) {
    return;
  }

  state.modalZoomed = !state.modalZoomed;
  els.modalImageWrap.classList.toggle("is-zoomed", state.modalZoomed);
  if (state.modalZoomed && event) {
    setModalZoomOrigin(event);
  } else {
    els.modalImage.style.transformOrigin = "center center";
  }
}

function renderModalBuyButton(product) {
  const canBuy = product && product.type === "automotive" && normalizeMarketplaceUrl(product.marketplaceUrl);
  els.modalBuy.hidden = !canBuy;
}

function renderMetaChips(values) {
  const fragment = document.createDocumentFragment();
  values.filter(Boolean).forEach(value => {
    const chip = document.createElement("span");
    chip.className = "meta-chip";
    chip.textContent = value;
    fragment.appendChild(chip);
  });

  els.modalMeta.replaceChildren(fragment);
}

function setModalImage(src, alt) {
  resetModalZoom();
  els.modalImage.src = src;
  els.modalImage.alt = alt;
}

function findAutomotiveColor(product, colorName) {
  const wanted = normalizeColorName(colorName);
  return product.availableColors.find(color => normalizeColorName(color.name) === wanted) ||
    product.availableColors[0] ||
    null;
}

function chooseAutomotiveModalImage(product) {
  const color = findAutomotiveColor(product, state.activeColorName);
  const primary = product.images[0];
  return {
    src: color && color.imageSrc ? color.imageSrc : primary.src,
    label: color ? color.label : primary.label,
    color
  };
}

function renderAutomotiveColorChips(product) {
  const fragment = document.createDocumentFragment();
  product.availableColors.forEach(color => {
    const chip = document.createElement("button");
    chip.className = "color-chip";
    chip.type = "button";
    chip.title = `${color.label} disponivel`;
    chip.setAttribute("aria-label", `${color.label} disponivel`);
    chip.classList.add(colorClassNames[normalizeColorName(color.name)] || "color-preto");
    chip.classList.toggle("is-active", normalizeColorName(color.name) === normalizeColorName(state.activeColorName));
    chip.addEventListener("click", () => {
      state.activeColorName = color.name;
      renderAutomotiveModal();
    });
    fragment.appendChild(chip);
  });

  els.modalColorTrack.replaceChildren(fragment);
}

function renderAutomotiveModal() {
  const product = state.activeProduct;
  const image = chooseAutomotiveModalImage(product);

  els.modalKicker.textContent = "Disponivel nas cores";
  els.modalTitle.textContent = "";
  els.modalDescription.textContent = "";
  els.modalMeta.replaceChildren();
  setModalImage(image.src, `${product.title} - ${image.label}`);
  els.modalPrev.disabled = product.images.length < 2;
  els.modalNext.disabled = product.images.length < 2;

  els.modalSizeTrack.replaceChildren();
  els.modalVariationTrack.replaceChildren();
  renderAutomotiveColorChips(product);
  renderModalBuyButton(product);
}

function currentSlide() {
  return state.activeProduct ? state.activeProduct.slides[state.activeSlideIndex] : null;
}

function getAvailableColors(slide) {
  const colorImages = slide.images.length > 0 ? slide.images : slide.dimensionImages;
  return colorImages
    .map(image => image.color)
    .filter(Boolean)
    .filter((color, index, colors) => colors.findIndex(item => normalizeColorName(item) === normalizeColorName(color)) === index);
}

function chooseProductColor(product, preferredColor) {
  for (const slide of product.slides) {
    const image = chooseSizeImage(slide.images, preferredColor) || chooseSizeImage(slide.dimensionImages, preferredColor);
    if (image) {
      return image.color;
    }
  }

  return preferredColor;
}

function chooseModalImage(slide) {
  return chooseSizeImage(slide.dimensionImages, state.activeColorName) ||
    chooseSizeImage(slide.images, state.activeColorName) ||
    chooseSizeImage(slide.dimensionImages) ||
    chooseSizeImage(slide.images);
}

function formatSlideDescription(product, slide, image) {
  const pieces = [slide.label || slide.name, state.activeColorName];
  if (image && image.widthCm && image.heightCm) {
    pieces.push(`${image.widthCm}cm x ${image.heightCm}cm`);
  }

  if (product.description) {
    pieces.push(product.description);
  }

  return pieces.filter(Boolean).join(" - ");
}

function renderSizeChips() {
  const product = state.activeProduct;
  const fragment = document.createDocumentFragment();
  product.slides.forEach((slide, index) => {
    const chip = document.createElement("button");
    chip.className = "size-chip";
    chip.type = "button";
    chip.textContent = slide.label || slide.name;
    chip.classList.toggle("is-active", index === state.activeSlideIndex);
    chip.addEventListener("click", () => {
      state.activeSlideIndex = index;
      state.activeColorName = chooseProductColor(product, state.activeColorName);
      renderFajardoModal();
    });
    fragment.appendChild(chip);
  });

  els.modalSizeTrack.replaceChildren(fragment);
}

function renderColorChips(slide) {
  const colors = getAvailableColors(slide);
  const fragment = document.createDocumentFragment();
  colors.forEach(color => {
    const chip = document.createElement("button");
    chip.className = "color-chip";
    chip.type = "button";
    chip.title = color;
    chip.setAttribute("aria-label", `Ver cor ${color}`);
    chip.classList.add(colorClassNames[normalizeColorName(color)] || "color-preto");
    chip.classList.toggle("is-active", normalizeColorName(color) === normalizeColorName(state.activeColorName));
    chip.addEventListener("click", () => {
      state.activeColorName = color;
      renderFajardoModal();
    });
    fragment.appendChild(chip);
  });

  els.modalColorTrack.replaceChildren(fragment);
}

function renderFajardoModal() {
  const product = state.activeProduct;
  const slide = currentSlide();
  const image = chooseModalImage(slide);
  if (!image) {
    return;
  }

  state.activeColorName = image.color || state.activeColorName;
  els.modalKicker.textContent = product.subtitle;
  els.modalTitle.textContent = product.title;
  els.modalDescription.textContent = formatSlideDescription(product, slide, image);
  renderMetaChips(product.meta);
  setModalImage(image.src, `${product.title} ${slide.label || slide.name}`);
  els.modalPrev.disabled = product.slides.length < 2;
  els.modalNext.disabled = product.slides.length < 2;
  els.modalVariationTrack.replaceChildren();
  renderSizeChips();
  renderColorChips(slide);
  renderModalBuyButton(product);
}

function openProductModal(product) {
  state.lastFocusedElement = document.activeElement;
  state.activeProduct = product;
  state.activeImageIndex = 0;
  state.activeSlideIndex = 0;
  state.activeColorName = product.defaultColor || "PRETO";
  els.modal.classList.toggle("is-automotive", product.type === "automotive");
  clearModalTracks();

  if (product.type === "automotive") {
    renderAutomotiveModal();
  } else {
    state.activeColorName = chooseProductColor(product, product.defaultColor || "PRETO");
    renderFajardoModal();
  }

  els.modal.classList.add("is-open");
  document.body.classList.add("modal-open");
  els.modalClose.focus();
}

function closeProductModal() {
  els.modal.classList.remove("is-open");
  els.modal.classList.remove("is-automotive");
  document.body.classList.remove("modal-open");
  els.modalImage.src = "";
  els.modalTitle.textContent = "";
  els.modalDescription.textContent = "";
  clearModalTracks();
  state.activeProduct = null;

  if (state.lastFocusedElement) {
    state.lastFocusedElement.focus();
  }
}

function moveModal(direction) {
  const product = state.activeProduct;
  if (!product) {
    return;
  }

  if (product.type === "automotive") {
    if (product.images.length < 2) {
      return;
    }

    state.activeImageIndex = (state.activeImageIndex + direction + product.images.length) % product.images.length;
    renderAutomotiveModal();
    return;
  }

  if (product.slides.length < 2) {
    return;
  }

  state.activeSlideIndex = (state.activeSlideIndex + direction + product.slides.length) % product.slides.length;
  renderFajardoModal();
}

els.tabs.forEach(tab => {
  tab.addEventListener("click", () => activateTab(tab.dataset.tab));
});

els.modalClose.addEventListener("click", closeProductModal);
els.modalPrev.addEventListener("click", () => moveModal(-1));
els.modalNext.addEventListener("click", () => moveModal(1));
els.modalBuy.addEventListener("click", () => openMarketplace(state.activeProduct));

els.modalImageWrap.addEventListener("click", event => {
  if (event.target.closest(".modal-nav")) {
    return;
  }

  toggleModalZoom(event);
});

els.modalImageWrap.addEventListener("pointermove", event => {
  if (state.modalZoomed) {
    setModalZoomOrigin(event);
  }
});

els.modalImageWrap.addEventListener("keydown", event => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  toggleModalZoom();
});

els.modal.addEventListener("click", event => {
  if (event.target === els.modal) {
    closeProductModal();
  }
});

document.addEventListener("click", event => {
  if (!els.modelMenu.classList.contains("is-open")) {
    return;
  }

  if (els.modelMenu.contains(event.target) || event.target.closest(".brand-button")) {
    return;
  }

  closeModelMenu();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (els.modal.classList.contains("is-open")) {
      closeProductModal();
      return;
    }

    closeModelMenu();
  }

  if (event.key === "ArrowLeft" && els.modal.classList.contains("is-open")) {
    moveModal(-1);
  }

  if (event.key === "ArrowRight" && els.modal.classList.contains("is-open")) {
    moveModal(1);
  }
});

els.modalImageWrap.addEventListener("touchstart", event => {
  state.touchStartX = event.changedTouches[0].clientX;
}, { passive: true });

els.modalImageWrap.addEventListener("touchend", event => {
  if (state.modalZoomed) {
    return;
  }

  const deltaX = event.changedTouches[0].clientX - state.touchStartX;
  if (Math.abs(deltaX) >= 36) {
    moveModal(deltaX > 0 ? -1 : 1);
  }
}, { passive: true });

window.addEventListener("resize", closeModelMenu);
window.addEventListener("scroll", closeModelMenu, true);

activateTab("automotive");
