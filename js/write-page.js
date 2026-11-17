/**
 * 호박(Hobak) 중고거래 - 글쓰기 / 수정 페이지 모듈
 * - 상품 상세 페이지 레이아웃(max-width: 680px 중앙 카드)을 기반으로 한 직관적인 입력/미리보기 폼
 * - window.HobakWritePage = { render(container, params) } Export
 */
(function (global) {
  'use strict';

  var MAX_IMAGES = 5;
  var MAX_TITLE_LENGTH = 80;
  var MAX_DESC_LENGTH = 2000;
  var MAX_PRICE_DIGITS = 9;
  var DRAFT_STORAGE_KEY = 'hobak_write_draft_v1';
  var QUICK_CHIPS = ['#새상품급', '#직거래환영', '#택배가능', '#네고가능'];

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function extractDigits(value) {
    return String(value == null ? '' : value).replace(/\D/g, '').slice(0, MAX_PRICE_DIGITS);
  }

  function formatDigitsWithCommas(digits) {
    if (!digits) return '';
    var num = Number(digits);
    if (!Number.isFinite(num)) return '';
    return num.toLocaleString('ko-KR');
  }

  function getMannerEmoji(temp) {
    var num = Number(temp);
    if (!Number.isFinite(num)) return '😊';
    if (num >= 41) return '😄';
    if (num >= 37) return '😊';
    return '🙂';
  }

  function findLocationObj(locationStr, store) {
    var locations = (store && Array.isArray(store.LOCATIONS)) ? store.LOCATIONS : [];
    for (var i = 0; i < locations.length; i += 1) {
      if (locations[i].full === locationStr || locations[i].short === locationStr) {
        return locations[i];
      }
    }
    var fallbackFull = locationStr || '울산 동구 방어동';
    var parts = fallbackFull.trim().split(/\s+/);
    return {
      full: fallbackFull,
      short: parts[parts.length - 1] || '방어동'
    };
  }

  function navigateTo(view, params) {
    if (global.HobakApp && typeof global.HobakApp.navigate === 'function') {
      global.HobakApp.navigate(view, params);
    }
  }

  function loadDraft() {
    try {
      var raw = global.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function saveDraft(draft) {
    try {
      global.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearDraft() {
    try {
      global.localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {
      // ignore
    }
  }

  /**
   * FileReader로 이미지를 DataURL로 변환하며,
   * 대용량 래스터 이미지(>450KB)는 localStorage 용량 초과 방지를 위해 적정 해상도로 경량화한다.
   */
  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = typeof reader.result === 'string' ? reader.result : '';
        if (!result) {
          reject(new Error('이미지 데이터를 읽지 못했습니다.'));
          return;
        }
        var isLargeRaster =
          result.length > 450000 &&
          /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(result);

        if (!isLargeRaster) {
          resolve(result);
          return;
        }

        var img = new Image();
        img.onload = function () {
          try {
            var maxDim = 1000;
            var width = img.naturalWidth || img.width;
            var height = img.naturalHeight || img.height;
            if (!width || !height) {
              resolve(result);
              return;
            }
            var scale = Math.min(1, maxDim / Math.max(width, height));
            var targetW = Math.max(1, Math.round(width * scale));
            var targetH = Math.max(1, Math.round(height * scale));
            var canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            var ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(result);
              return;
            }
            ctx.drawImage(img, 0, 0, targetW, targetH);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
          } catch (err) {
            resolve(result);
          }
        };
        img.onerror = function () {
          resolve(result);
        };
        img.src = result;
      };
      reader.onerror = function () {
        reject(new Error('파일 읽기에 실패했습니다.'));
      };
      reader.readAsDataURL(file);
    });
  }

  function buildInitialState(store, editItem) {
    var defaultLocation =
      store.LOCATIONS && store.LOCATIONS[0] ? store.LOCATIONS[0].full : '울산 동구 방어동';

    if (editItem) {
      var isFree = Boolean(editItem.isFreeShare) || Number(editItem.price) === 0;
      var priceDigits = isFree ? '' : extractDigits(editItem.price);
      return {
        isEditMode: true,
        editId: editItem.id,
        images: Array.isArray(editItem.images) ? editItem.images.slice(0, MAX_IMAGES) : [],
        activeIndex: 0,
        sellerName: (editItem.seller && editItem.seller.name) || '임성훈',
        sellerAvatar: (editItem.seller && editItem.seller.avatar) || store.DEFAULT_AVATAR || '',
        mannerTemp:
          editItem.seller && Number.isFinite(Number(editItem.seller.mannerTemp))
            ? Number(editItem.seller.mannerTemp)
            : 37.3,
        location: editItem.location || defaultLocation,
        title: editItem.title || '',
        category: editItem.category || '',
        status: editItem.status || '판매중',
        isFreeShare: isFree,
        rawPrice: isFree ? '0' : priceDigits,
        lastNonZeroPrice: priceDigits,
        description: editItem.description || ''
      };
    }

    var authUser =
      global.HobakAuth && typeof global.HobakAuth.getUser === 'function'
        ? global.HobakAuth.getUser()
        : null;

    return {
      isEditMode: false,
      editId: null,
      images: [],
      activeIndex: 0,
      sellerName: (authUser && authUser.nickname) || '임성훈',
      sellerAvatar: (authUser && authUser.avatar) || store.DEFAULT_AVATAR || '',
      mannerTemp:
        authUser && Number.isFinite(Number(authUser.mannerTemp))
          ? Number(authUser.mannerTemp)
          : 36.5,
      location: (authUser && authUser.location) || defaultLocation,
      title: '',
      category: '',
      status: '판매중',
      isFreeShare: false,
      rawPrice: '',
      lastNonZeroPrice: '',
      description: ''
    };
  }

  function renderNotFound(container) {
    container.innerHTML =
      '<div class="hobak-write-page">' +
      '  <div class="hobak-write-card">' +
      '    <div class="hobak-write-not-found">' +
      '      <h2 class="hobak-write-not-found-title">수정할 게시글을 찾을 수 없어요</h2>' +
      '      <p class="hobak-write-not-found-desc">삭제되었거나 존재하지 않는 상품입니다.</p>' +
      '      <button type="button" class="hobak-write-submit-btn" data-action="go-list">목록으로 돌아가기</button>' +
      '    </div>' +
      '  </div>' +
      '</div>';

    var btn = container.querySelector('[data-action="go-list"]');
    if (btn) {
      btn.addEventListener('click', function () {
        navigateTo('list');
      });
    }
  }

  function render(container, params) {
    if (!container) return;

    var store = global.HobakStore;
    if (!store) {
      container.innerHTML =
        '<div class="hobak-write-page"><div class="hobak-write-card"><div class="hobak-write-not-found">' +
        '<p class="hobak-write-not-found-title">데이터 스토어를 불러올 수 없습니다.</p>' +
        '</div></div></div>';
      return;
    }

    var editId = params && params.editId ? String(params.editId) : null;
    var editItem = editId ? store.getItemById(editId) : null;
    if (editId && !editItem) {
      renderNotFound(container);
      return;
    }

    if (!editId) {
      clearDraft();
    }

    var state = buildInitialState(store, editItem);
    var categories = (Array.isArray(store.CATEGORIES) ? store.CATEGORIES : []).filter(function (c) {
      return c !== '전체';
    });
    var locations = Array.isArray(store.LOCATIONS) ? store.LOCATIONS : [];
    var sampleImages = Array.isArray(store.SAMPLE_IMAGES) ? store.SAMPLE_IMAGES : [];
    var statusOptions = state.isEditMode ? ['판매중', '예약중', '거래완료'] : ['판매중', '예약중'];

    // location 목록에 없는 기존 동네 방어
    var hasCurrentLoc = locations.some(function (loc) {
      return loc.full === state.location;
    });
    var locationOptionsHtml = locations
      .map(function (loc) {
        var selected = loc.full === state.location ? ' selected' : '';
        return '<option value="' + escapeHtml(loc.full) + '"' + selected + '>' + escapeHtml(loc.full) + '</option>';
      })
      .join('');
    if (!hasCurrentLoc && state.location) {
      locationOptionsHtml =
        '<option value="' + escapeHtml(state.location) + '" selected>' + escapeHtml(state.location) + '</option>' +
        locationOptionsHtml;
    }

    var categoryOptionsHtml =
      '<option value="">카테고리 선택</option>' +
      categories
        .map(function (cat) {
          var selected = cat === state.category ? ' selected' : '';
          return '<option value="' + escapeHtml(cat) + '"' + selected + '>' + escapeHtml(cat) + '</option>';
        })
        .join('');

    var statusButtonsHtml = statusOptions
      .map(function (st) {
        var activeCls = st === state.status ? ' is-active' : '';
        return (
          '<button type="button" class="hobak-write-status-btn' + activeCls + '" ' +
          'data-status="' + escapeHtml(st) + '" aria-pressed="' + (st === state.status ? 'true' : 'false') + '">' +
          escapeHtml(st) +
          '</button>'
        );
      })
      .join('');

    var sampleButtonsHtml = sampleImages
      .map(function (sample, idx) {
        return (
          '<button type="button" class="hobak-write-sample-btn" data-sample-index="' + idx + '">' +
          '  <img class="hobak-write-sample-thumb" src="' + escapeHtml(sample.url) + '" alt="">' +
          '  <span>' + escapeHtml(sample.label) + '</span>' +
          '</button>'
        );
      })
      .join('');

    var chipsHtml = QUICK_CHIPS.map(function (chip) {
      return (
        '<button type="button" class="hobak-write-chip-btn" data-chip="' + escapeHtml(chip) + '">' +
        escapeHtml(chip) +
        '</button>'
      );
    }).join('');

    var topBtnText = state.isEditMode ? '수정완료' : '등록하기';
    var bottomBtnText = state.isEditMode ? '수정 저장' : '작성 완료';
    var modeBadgeText = state.isEditMode ? '내 게시글 수정하기' : '중고거래 글쓰기';
    var hasSavedDraft = !state.isEditMode && Boolean(loadDraft());

    var leftActionHtml = state.isEditMode
      ? '<button type="button" class="hobak-write-secondary-btn" data-action="reset">원래대로</button>'
      : '<button type="button" class="hobak-write-secondary-btn" data-action="reset">초기화</button>' +
        '<button type="button" class="hobak-write-secondary-btn" data-action="save-draft">임시저장</button>' +
        '<button type="button" class="hobak-write-secondary-btn" data-action="load-draft">임시저장 불러오기' +
        (hasSavedDraft ? '<span class="hobak-write-draft-dot" aria-hidden="true"></span>' : '') +
        '</button>';

    container.innerHTML =
      '<div class="hobak-write-page">' +
      '  <div class="hobak-write-card">' +
      '    <!-- 상단 이미지 업로드 & 프리뷰 영역 -->' +
      '    <section class="hobak-write-hero" aria-label="상품 이미지 등록">' +
      '      <div class="hobak-write-hero-topbar">' +
      '        <button type="button" class="hobak-write-close-btn" data-action="close" aria-label="글쓰기 닫기">✕</button>' +
      '        <button type="button" class="hobak-write-top-submit-btn" data-action="submit">' + topBtnText + '</button>' +
      '      </div>' +
      '      <div class="hobak-write-preview-stage"></div>' +
      '      <div class="hobak-write-photo-strip">' +
      '        <input type="file" accept="image/*" multiple class="hobak-write-file-input" aria-label="상품 사진 파일 선택">' +
      '        <div class="hobak-write-thumb-list" hidden></div>' +
      '        <div class="hobak-write-strip-controls">' +
      '          <button type="button" class="hobak-write-add-file-btn" data-action="pick-file">+ 파일 선택 (0/' + MAX_IMAGES + ')</button>' +
      '          <span class="hobak-write-sample-label">샘플 추가:</span>' +
      '          <div class="hobak-write-sample-list">' + sampleButtonsHtml + '</div>' +
      '        </div>' +
      '      </div>' +
      '    </section>' +
      '' +
      '    <!-- 판매자 프로필 바 -->' +
      '    <section class="hobak-write-seller-bar" aria-label="판매자 정보">' +
      '      <div class="hobak-write-seller-left">' +
      '        <img class="hobak-write-avatar" src="' + escapeHtml(state.sellerAvatar) + '" alt="판매자 아바타">' +
      '        <div class="hobak-write-seller-meta">' +
      '          <div class="hobak-write-seller-name-row">' +
      '            <input type="text" class="hobak-write-seller-name-input" maxlength="20" aria-label="판매자 닉네임 (실명 입력 금지)" placeholder="판매자 닉네임 (실명 입력 금지)">' +
      '            <span class="hobak-write-edit-hint" aria-hidden="true">' +
      '              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
      '                <path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>' +
      '              </svg>' +
      '            </span>' +
      '          </div>' +
      '          <div class="hobak-write-location-row">' +
      '            <select class="hobak-write-location-select" aria-label="거래 희망 동네">' + locationOptionsHtml + '</select>' +
      '          </div>' +
      '        </div>' +
      '      </div>' +
      '      <div class="hobak-write-seller-right">' +
      '        <div class="hobak-write-temp-row">' +
      '          <span class="hobak-write-temp-value">' + Number(state.mannerTemp).toFixed(1) + '°C</span>' +
      '          <span class="hobak-write-temp-emoji">' + getMannerEmoji(state.mannerTemp) + '</span>' +
      '        </div>' +
      '        <span class="hobak-write-temp-label">매너온도</span>' +
      '      </div>' +
      '    </section>' +
      '' +
      '    <!-- 상품 정보 입력 본문 -->' +
      '    <form class="hobak-write-body" novalidate>' +
      '      <div class="hobak-write-mode-badge-row">' +
      '        <span class="hobak-write-mode-badge">' + modeBadgeText + '</span>' +
      '        <span class="hobak-write-draft-status" aria-live="polite"></span>' +
      '      </div>' +
      '' +
      '      <div class="hobak-write-field-group">' +
      '        <input type="text" class="hobak-write-title-input" maxlength="' + MAX_TITLE_LENGTH + '" ' +
      '          placeholder="글 제목 (예: 8세컨즈 후드 숏패딩 민트 XL)" aria-label="글 제목">' +
      '        <div class="hobak-write-error-msg" data-error-for="title"></div>' +
      '      </div>' +
      '' +
      '      <div class="hobak-write-field-group">' +
      '        <div class="hobak-write-meta-row">' +
      '          <select class="hobak-write-category-select" aria-label="카테고리 선택">' + categoryOptionsHtml + '</select>' +
      '          <span class="hobak-write-meta-dot" aria-hidden="true">·</span>' +
      '          <div class="hobak-write-status-group" role="group" aria-label="거래 상태">' + statusButtonsHtml + '</div>' +
      '        </div>' +
      '        <div class="hobak-write-error-msg" data-error-for="category"></div>' +
      '      </div>' +
      '' +
      '      <div class="hobak-write-field-group">' +
      '        <div class="hobak-write-price-row">' +
      '          <div class="hobak-write-price-input-wrap">' +
      '            <input type="text" inputmode="numeric" class="hobak-write-price-input" ' +
      '              placeholder="₩ 가격을 입력해주세요" aria-label="가격">' +
      '            <span class="hobak-write-price-unit">원</span>' +
      '          </div>' +
      '          <span class="hobak-write-free-badge" hidden>나눔 🧡</span>' +
      '          <label class="hobak-write-free-label">' +
      '            <input type="checkbox" class="hobak-write-free-checkbox">' +
      '            <span>🧡 나눔하기</span>' +
      '          </label>' +
      '        </div>' +
      '        <div class="hobak-write-error-msg" data-error-for="price"></div>' +
      '      </div>' +
      '' +
      '      <div class="hobak-write-field-group">' +
      '        <textarea class="hobak-write-desc-textarea" maxlength="' + MAX_DESC_LENGTH + '" aria-label="자세한 설명"></textarea>' +
      '        <div class="hobak-write-desc-footer">' +
      '          <div class="hobak-write-chips" aria-label="자주 쓰는 문구">' + chipsHtml + '</div>' +
      '          <span class="hobak-write-char-count">0 / 2,000자</span>' +
      '        </div>' +
      '        <div class="hobak-write-error-msg" data-error-for="description"></div>' +
      '      </div>' +
      '    </form>' +
      '' +
      '    <!-- 하단 액션 바 -->' +
      '    <footer class="hobak-write-action-bar">' +
      '      <div class="hobak-write-action-left">' + leftActionHtml + '</div>' +
      '      <div class="hobak-write-action-right">' +
      '        <button type="button" class="hobak-write-submit-btn" data-action="submit">' + bottomBtnText + '</button>' +
      '      </div>' +
      '    </footer>' +
      '  </div>' +
      '  <div class="hobak-write-toast" role="status" aria-live="polite"></div>' +
      '</div>';

    // DOM 참조
    var rootEl = container.querySelector('.hobak-write-page');
    var formEl = container.querySelector('.hobak-write-body');
    var previewStage = container.querySelector('.hobak-write-preview-stage');
    var fileInput = container.querySelector('.hobak-write-file-input');
    var thumbList = container.querySelector('.hobak-write-thumb-list');
    var pickFileBtn = container.querySelector('[data-action="pick-file"]');
    var sampleBtns = container.querySelectorAll('.hobak-write-sample-btn');
    var sellerNameInput = container.querySelector('.hobak-write-seller-name-input');
    var locationSelect = container.querySelector('.hobak-write-location-select');
    var titleInput = container.querySelector('.hobak-write-title-input');
    var categorySelect = container.querySelector('.hobak-write-category-select');
    var statusBtns = container.querySelectorAll('.hobak-write-status-btn');
    var priceWrap = container.querySelector('.hobak-write-price-input-wrap');
    var priceInput = container.querySelector('.hobak-write-price-input');
    var freeBadge = container.querySelector('.hobak-write-free-badge');
    var freeLabel = container.querySelector('.hobak-write-free-label');
    var freeCheckbox = container.querySelector('.hobak-write-free-checkbox');
    var descTextarea = container.querySelector('.hobak-write-desc-textarea');
    var charCountEl = container.querySelector('.hobak-write-char-count');
    var chipBtns = container.querySelectorAll('.hobak-write-chip-btn');
    var draftStatusEl = container.querySelector('.hobak-write-draft-status');
    var toastEl = container.querySelector('.hobak-write-toast');

    var errorEls = {
      title: container.querySelector('[data-error-for="title"]'),
      category: container.querySelector('[data-error-for="category"]'),
      price: container.querySelector('[data-error-for="price"]'),
      description: container.querySelector('[data-error-for="description"]')
    };

    var toastTimer = null;
    var draftTimer = null;

    function showToast(message) {
      if (!toastEl || !rootEl.isConnected) return;
      toastEl.textContent = message;
      toastEl.classList.add('is-show');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(function () {
        if (toastEl && rootEl.isConnected) {
          toastEl.classList.remove('is-show');
        }
      }, 2400);
    }

    function setFieldError(fieldName, message) {
      var errEl = errorEls[fieldName];
      var targetEl =
        fieldName === 'title'
          ? titleInput
          : fieldName === 'category'
          ? categorySelect
          : fieldName === 'price'
          ? priceWrap
          : descTextarea;

      if (errEl) {
        if (message) {
          errEl.textContent = '• ' + message;
          errEl.classList.add('is-visible');
        } else {
          errEl.textContent = '';
          errEl.classList.remove('is-visible');
        }
      }
      if (targetEl) {
        if (message) {
          targetEl.classList.add('is-invalid');
        } else {
          targetEl.classList.remove('is-invalid');
        }
      }
    }

    function clearAllErrors() {
      setFieldError('title', '');
      setFieldError('category', '');
      setFieldError('price', '');
      setFieldError('description', '');
    }

    function updateDescriptionPlaceholder() {
      if (!descTextarea) return;
      descTextarea.placeholder =
        state.location +
        '에 올릴 게시글 내용을 작성해주세요. (판매 금지 물품은 게시가 제한될 수 있어요.)';
    }

    function updateCharCount() {
      if (!charCountEl) return;
      var len = state.description.length;
      charCountEl.textContent = len.toLocaleString('ko-KR') + ' / ' + MAX_DESC_LENGTH.toLocaleString('ko-KR') + '자';
    }

    function syncFormInputsFromState() {
      sellerNameInput.value = state.sellerName;
      locationSelect.value = state.location;
      titleInput.value = state.title;

      categorySelect.value = state.category;
      if (state.category) {
        categorySelect.classList.remove('is-placeholder');
      } else {
        categorySelect.classList.add('is-placeholder');
      }

      statusBtns.forEach(function (btn) {
        var isMatch = btn.getAttribute('data-status') === state.status;
        btn.classList.toggle('is-active', isMatch);
        btn.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
      });

      freeCheckbox.checked = Boolean(state.isFreeShare);
      freeLabel.classList.toggle('is-checked', Boolean(state.isFreeShare));
      priceWrap.classList.toggle('is-disabled', Boolean(state.isFreeShare));
      priceInput.disabled = Boolean(state.isFreeShare);
      freeBadge.hidden = !state.isFreeShare;

      if (state.isFreeShare) {
        priceInput.value = '0';
      } else {
        priceInput.value = state.rawPrice ? formatDigitsWithCommas(state.rawPrice) : '';
      }

      descTextarea.value = state.description;
      updateDescriptionPlaceholder();
      updateCharCount();
    }

    function renderGallery() {
      var count = state.images.length;
      if (state.activeIndex >= count) {
        state.activeIndex = Math.max(0, count - 1);
      }

      // 1) 메인 프리뷰 스테이지
      if (count === 0) {
        previewStage.innerHTML =
          '<button type="button" class="hobak-write-empty-upload" data-action="empty-pick">' +
          '  <span class="hobak-write-camera-circle" aria-hidden="true">' +
          '    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
          '      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>' +
          '      <circle cx="12" cy="13" r="4"></circle>' +
          '    </svg>' +
          '  </span>' +
          '  <p class="hobak-write-empty-title">상품 사진을 올려주세요 (최대 ' + MAX_IMAGES + '장)</p>' +
          '  <p class="hobak-write-empty-desc">클릭하여 파일 선택 또는 아래 샘플 사진을 눌러보세요</p>' +
          '</button>';

        var emptyBtn = previewStage.querySelector('[data-action="empty-pick"]');
        if (emptyBtn) {
          emptyBtn.addEventListener('click', function () {
            fileInput.click();
          });
        }
      } else {
        var activeUrl = state.images[state.activeIndex];
        var navHtml = '';
        var dotsHtml = '';

        if (count > 1) {
          navHtml =
            '<button type="button" class="hobak-write-carousel-btn is-prev" data-action="prev-img" aria-label="이전 사진">‹</button>' +
            '<button type="button" class="hobak-write-carousel-btn is-next" data-action="next-img" aria-label="다음 사진">›</button>';

          var dotsItems = [];
          for (var d = 0; d < count; d += 1) {
            dotsItems.push(
              '<button type="button" class="hobak-write-dot' +
                (d === state.activeIndex ? ' is-active' : '') +
                '" data-dot-index="' + d + '" aria-label="' + (d + 1) + '번 사진 보기"></button>'
            );
          }
          dotsHtml = '<div class="hobak-write-dots">' + dotsItems.join('') + '</div>';
        }

        previewStage.innerHTML =
          '<img class="hobak-write-preview-img" src="' + escapeHtml(activeUrl) + '" alt="상품 미리보기 이미지 ' + (state.activeIndex + 1) + '">' +
          '<span class="hobak-write-img-counter">' + (state.activeIndex + 1) + ' / ' + count + '</span>' +
          '<button type="button" class="hobak-write-preview-delete-btn" data-action="delete-active-img" aria-label="현재 사진 삭제">✕ 삭제</button>' +
          navHtml +
          dotsHtml;

        var prevBtn = previewStage.querySelector('[data-action="prev-img"]');
        var nextBtn = previewStage.querySelector('[data-action="next-img"]');
        var delActiveBtn = previewStage.querySelector('[data-action="delete-active-img"]');

        if (prevBtn) {
          prevBtn.addEventListener('click', function () {
            state.activeIndex = (state.activeIndex - 1 + state.images.length) % state.images.length;
            renderGallery();
          });
        }
        if (nextBtn) {
          nextBtn.addEventListener('click', function () {
            state.activeIndex = (state.activeIndex + 1) % state.images.length;
            renderGallery();
          });
        }
        if (delActiveBtn) {
          delActiveBtn.addEventListener('click', function () {
            removeImageAt(state.activeIndex);
          });
        }
        previewStage.querySelectorAll('[data-dot-index]').forEach(function (dot) {
          dot.addEventListener('click', function () {
            var idx = Number(dot.getAttribute('data-dot-index'));
            if (Number.isInteger(idx)) {
              state.activeIndex = idx;
              renderGallery();
            }
          });
        });
      }

      // 2) 썸네일 리스트
      if (count === 0) {
        thumbList.hidden = true;
        thumbList.innerHTML = '';
      } else {
        thumbList.hidden = false;
        thumbList.innerHTML = state.images
          .map(function (url, idx) {
            var activeCls = idx === state.activeIndex ? ' is-active' : '';
            var badge = idx === 0 ? '<span class="hobak-write-thumb-badge">대표</span>' : '';
            return (
              '<div class="hobak-write-thumb-item' + activeCls + '" data-thumb-index="' + idx + '">' +
              '  <img class="hobak-write-thumb-img" src="' + escapeHtml(url) + '" alt="업로드 사진 ' + (idx + 1) + '">' +
              badge +
              '  <button type="button" class="hobak-write-thumb-del" data-del-index="' + idx + '" aria-label="' + (idx + 1) + '번 사진 삭제">✕</button>' +
              '</div>'
            );
          })
          .join('');

        thumbList.querySelectorAll('.hobak-write-thumb-item').forEach(function (itemEl) {
          itemEl.addEventListener('click', function (e) {
            if (e.target && e.target.closest('[data-del-index]')) return;
            var idx = Number(itemEl.getAttribute('data-thumb-index'));
            if (Number.isInteger(idx)) {
              state.activeIndex = idx;
              renderGallery();
            }
          });
        });

        thumbList.querySelectorAll('[data-del-index]').forEach(function (delBtn) {
          delBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            var idx = Number(delBtn.getAttribute('data-del-index'));
            if (Number.isInteger(idx)) {
              removeImageAt(idx);
            }
          });
        });
      }

      // 3) 파일 추가 버튼 및 샘플 프리셋 상태 동기화
      pickFileBtn.textContent = '+ 파일 선택 (' + count + '/' + MAX_IMAGES + ')';
      pickFileBtn.disabled = count >= MAX_IMAGES;

      sampleBtns.forEach(function (btn) {
        var idx = Number(btn.getAttribute('data-sample-index'));
        var sample = sampleImages[idx];
        var added = sample ? state.images.indexOf(sample.url) !== -1 : false;
        btn.classList.toggle('is-added', added);
      });
    }

    function removeImageAt(index) {
      if (index < 0 || index >= state.images.length) return;
      state.images.splice(index, 1);
      if (state.images.length === 0) {
        state.activeIndex = 0;
      } else if (index < state.activeIndex) {
        state.activeIndex -= 1;
      } else if (state.activeIndex >= state.images.length) {
        state.activeIndex = state.images.length - 1;
      }
      renderGallery();
      scheduleDraftSave();
    }

    function handleFiles(fileList) {
      if (!fileList || fileList.length === 0) return;
      var remaining = MAX_IMAGES - state.images.length;
      if (remaining <= 0) {
        showToast('사진은 최대 ' + MAX_IMAGES + '장까지 등록할 수 있어요.');
        return;
      }

      var validFiles = [];
      var hasNonImage = false;
      for (var i = 0; i < fileList.length; i += 1) {
        var f = fileList[i];
        if (f && f.type && f.type.indexOf('image/') === 0) {
          validFiles.push(f);
        } else {
          hasNonImage = true;
        }
      }

      if (hasNonImage) {
        showToast('이미지 파일만 업로드할 수 있어요.');
      }
      if (validFiles.length === 0) return;

      if (validFiles.length > remaining) {
        showToast('최대 ' + MAX_IMAGES + '장까지만 추가되었어요.');
        validFiles = validFiles.slice(0, remaining);
      }

      var firstNewIndex = state.images.length;
      Promise.all(validFiles.map(readFileAsDataUrl))
        .then(function (dataUrls) {
          if (!rootEl.isConnected) return;
          var slotsLeft = MAX_IMAGES - state.images.length;
          var accepted = dataUrls.slice(0, slotsLeft);
          if (accepted.length > 0) {
            state.images = state.images.concat(accepted);
            state.activeIndex = Math.min(firstNewIndex, state.images.length - 1);
            renderGallery();
            scheduleDraftSave();
          }
        })
        .catch(function () {
          showToast('사진을 불러오는 중 문제가 발생했어요.');
        });
    }

    function hasDraftableContent() {
      return Boolean(
        state.title.trim() ||
          state.category ||
          (state.rawPrice && state.rawPrice !== '0') ||
          state.isFreeShare ||
          state.description.trim() ||
          state.images.length > 0
      );
    }

    function buildDraftSnapshot() {
      return {
        title: state.title,
        category: state.category,
        status: state.status,
        isFreeShare: state.isFreeShare,
        rawPrice: state.rawPrice,
        lastNonZeroPrice: state.lastNonZeroPrice,
        location: state.location,
        sellerName: state.sellerName,
        description: state.description,
        images: state.images.slice(0, MAX_IMAGES),
        savedAt: Date.now()
      };
    }

    function refreshDraftIndicator(justSaved) {
      if (state.isEditMode || !draftStatusEl) return;
      if (justSaved) {
        draftStatusEl.textContent = '임시저장됨';
      }
      var loadBtn = container.querySelector('[data-action="load-draft"]');
      if (loadBtn) {
        var exists = Boolean(loadDraft());
        var dot = loadBtn.querySelector('.hobak-write-draft-dot');
        if (exists && !dot) {
          var span = document.createElement('span');
          span.className = 'hobak-write-draft-dot';
          span.setAttribute('aria-hidden', 'true');
          loadBtn.appendChild(span);
        } else if (!exists && dot) {
          dot.remove();
        }
      }
    }

    function scheduleDraftSave() {
      if (state.isEditMode) return;
      if (draftTimer) clearTimeout(draftTimer);
      draftTimer = setTimeout(function () {
        if (!rootEl.isConnected || !hasDraftableContent()) return;
        if (saveDraft(buildDraftSnapshot())) {
          refreshDraftIndicator(true);
        }
      }, 350);
    }

    function validateForm() {
      var firstInvalid = null;

      if (!state.title.trim()) {
        setFieldError('title', '제목을 입력해주세요.');
        firstInvalid = firstInvalid || titleInput;
      } else {
        setFieldError('title', '');
      }

      if (!state.category) {
        setFieldError('category', '카테고리를 선택해주세요.');
        firstInvalid = firstInvalid || categorySelect;
      } else {
        setFieldError('category', '');
      }

      if (!state.isFreeShare && state.rawPrice === '') {
        setFieldError('price', "가격을 입력해주세요. (무료 나눔은 '나눔하기'를 선택해주세요)");
        firstInvalid = firstInvalid || priceInput;
      } else {
        setFieldError('price', '');
      }

      if (!state.description.trim()) {
        setFieldError('description', '자세한 설명을 입력해주세요.');
        firstInvalid = firstInvalid || descTextarea;
      } else {
        setFieldError('description', '');
      }

      if (firstInvalid) {
        if (typeof firstInvalid.scrollIntoView === 'function') {
          firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        firstInvalid.focus();
        return false;
      }
      return true;
    }

    function handleSubmit() {
      if (!validateForm()) return;

      var locObj = findLocationObj(state.location, store);
      var isFree = Boolean(state.isFreeShare) || Number(state.rawPrice) === 0;
      var numericPrice = isFree ? 0 : Math.max(0, Number(state.rawPrice) || 0);
      var finalImages =
        state.images.length > 0
          ? state.images.slice()
          : sampleImages[0]
          ? [sampleImages[0].url]
          : [];

      var payload = {
        title: state.title.trim(),
        category: state.category,
        price: numericPrice,
        isFreeShare: isFree,
        status: state.status || '판매중',
        location: locObj.full,
        shortLocation: locObj.short,
        seller: {
          name: state.sellerName.trim() || '임성훈',
          avatar: state.sellerAvatar,
          mannerTemp: state.mannerTemp
        },
        images: finalImages,
        description: state.description.trim()
      };

      if (state.isEditMode && state.editId) {
        store.updateItem(state.editId, payload);
        navigateTo('detail', { id: state.editId });
      } else {
        if (draftTimer) clearTimeout(draftTimer);
        clearDraft();
        var created = store.addItem(payload);
        if (created && created.id) {
          navigateTo('detail', { id: created.id });
        } else {
          navigateTo('list');
        }
      }
    }

    // =========================================================
    // 이벤트 바인딩
    // =========================================================
    container.querySelectorAll('[data-action="close"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        navigateTo('list');
      });
    });

    container.querySelectorAll('[data-action="submit"]').forEach(function (btn) {
      btn.addEventListener('click', handleSubmit);
    });

    formEl.addEventListener('submit', function (e) {
      e.preventDefault();
      handleSubmit();
    });

    pickFileBtn.addEventListener('click', function () {
      fileInput.click();
    });

    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files.length > 0) {
        handleFiles(fileInput.files);
      }
      fileInput.value = '';
    });

    // 드래그 앤 드롭 업로드 지원
    previewStage.addEventListener('dragover', function (e) {
      e.preventDefault();
      var emptyBtn = previewStage.querySelector('.hobak-write-empty-upload');
      if (emptyBtn) emptyBtn.classList.add('is-dragover');
    });

    previewStage.addEventListener('dragleave', function () {
      var emptyBtn = previewStage.querySelector('.hobak-write-empty-upload');
      if (emptyBtn) emptyBtn.classList.remove('is-dragover');
    });

    previewStage.addEventListener('drop', function (e) {
      e.preventDefault();
      var emptyBtn = previewStage.querySelector('.hobak-write-empty-upload');
      if (emptyBtn) emptyBtn.classList.remove('is-dragover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    });

    // 샘플 이미지 프리셋 추가
    sampleBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = Number(btn.getAttribute('data-sample-index'));
        var sample = sampleImages[idx];
        if (!sample) return;

        var existingIdx = state.images.indexOf(sample.url);
        if (existingIdx !== -1) {
          state.activeIndex = existingIdx;
          renderGallery();
          showToast('이미 추가된 샘플 사진으로 이동했어요.');
          return;
        }
        if (state.images.length >= MAX_IMAGES) {
          showToast('사진은 최대 ' + MAX_IMAGES + '장까지 등록할 수 있어요.');
          return;
        }
        state.images.push(sample.url);
        state.activeIndex = state.images.length - 1;
        renderGallery();
        scheduleDraftSave();
      });
    });

    // 판매자 이름 & 거래 동네
    sellerNameInput.addEventListener('input', function () {
      state.sellerName = sellerNameInput.value;
      scheduleDraftSave();
    });

    locationSelect.addEventListener('change', function () {
      state.location = locationSelect.value;
      updateDescriptionPlaceholder();
      scheduleDraftSave();
    });

    // 제목
    titleInput.addEventListener('input', function () {
      state.title = titleInput.value;
      if (state.title.trim()) {
        setFieldError('title', '');
      }
      scheduleDraftSave();
    });

    // 카테고리
    categorySelect.addEventListener('change', function () {
      state.category = categorySelect.value;
      if (state.category) {
        categorySelect.classList.remove('is-placeholder');
        setFieldError('category', '');
      } else {
        categorySelect.classList.add('is-placeholder');
      }
      scheduleDraftSave();
    });

    // 거래 상태 버튼
    statusBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var nextStatus = btn.getAttribute('data-status');
        if (!nextStatus) return;
        state.status = nextStatus;
        statusBtns.forEach(function (b) {
          var active = b.getAttribute('data-status') === nextStatus;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        scheduleDraftSave();
      });
    });

    // 가격 입력 (천단위 콤마 & 커서 위치 유지)
    priceInput.addEventListener('input', function () {
      if (state.isFreeShare) return;
      var rawValue = priceInput.value;
      var cursorPos = priceInput.selectionStart || 0;
      var digitsBeforeCursor = rawValue.slice(0, cursorPos).replace(/\D/g, '').length;

      var digits = extractDigits(rawValue);
      state.rawPrice = digits;
      if (digits && digits !== '0') {
        state.lastNonZeroPrice = digits;
      }

      var formatted = digits ? formatDigitsWithCommas(digits) : '';
      priceInput.value = formatted;

      if (digits !== '') {
        setFieldError('price', '');
      }

      // 커서 위치 복원
      if (typeof priceInput.setSelectionRange === 'function') {
        var nextCursor = formatted.length;
        if (digitsBeforeCursor === 0) {
          nextCursor = 0;
        } else {
          var seen = 0;
          for (var i = 0; i < formatted.length; i += 1) {
            if (/\d/.test(formatted[i])) {
              seen += 1;
              if (seen === digitsBeforeCursor) {
                nextCursor = i + 1;
                break;
              }
            }
          }
        }
        priceInput.setSelectionRange(nextCursor, nextCursor);
      }

      scheduleDraftSave();
    });

    // 나눔 토글 체크박스
    freeCheckbox.addEventListener('change', function () {
      state.isFreeShare = freeCheckbox.checked;
      if (state.isFreeShare) {
        if (state.rawPrice && state.rawPrice !== '0') {
          state.lastNonZeroPrice = state.rawPrice;
        }
        state.rawPrice = '0';
        setFieldError('price', '');
      } else {
        state.rawPrice = state.lastNonZeroPrice || '';
      }
      syncFormInputsFromState();
      if (!state.isFreeShare) {
        priceInput.focus();
      }
      scheduleDraftSave();
    });

    // 본문 설명 & 글자수
    descTextarea.addEventListener('input', function () {
      state.description = descTextarea.value;
      updateCharCount();
      if (state.description.trim()) {
        setFieldError('description', '');
      }
      scheduleDraftSave();
    });

    // 자주 쓰는 문구 칩 삽입
    chipBtns.forEach(function (chipBtn) {
      chipBtn.addEventListener('click', function () {
        var chipText = chipBtn.getAttribute('data-chip') || '';
        if (!chipText) return;

        var current = descTextarea.value;
        var start = typeof descTextarea.selectionStart === 'number' ? descTextarea.selectionStart : current.length;
        var end = typeof descTextarea.selectionEnd === 'number' ? descTextarea.selectionEnd : current.length;
        var before = current.slice(0, start);
        var after = current.slice(end);

        var prefix = before.length > 0 && !/\s$/.test(before) ? ' ' : '';
        var suffix = after.length > 0 && !/^\s/.test(after) ? ' ' : '';
        var insertion = prefix + chipText + suffix;

        if (before.length + insertion.length + after.length > MAX_DESC_LENGTH) {
          showToast('설명은 최대 ' + MAX_DESC_LENGTH.toLocaleString('ko-KR') + '자까지 입력할 수 있어요.');
          return;
        }

        var nextText = before + insertion + after;
        descTextarea.value = nextText;
        state.description = nextText;
        updateCharCount();
        setFieldError('description', '');

        descTextarea.focus();
        var nextCaret = before.length + insertion.length;
        if (typeof descTextarea.setSelectionRange === 'function') {
          descTextarea.setSelectionRange(nextCaret, nextCaret);
        }
        scheduleDraftSave();
      });
    });

    // 하단 보조 버튼: 초기화 / 임시저장 / 임시저장 불러오기
    var resetBtn = container.querySelector('[data-action="reset"]');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (draftTimer) clearTimeout(draftTimer);
        state = buildInitialState(store, editItem);
        clearAllErrors();
        renderGallery();
        syncFormInputsFromState();
        if (draftStatusEl) draftStatusEl.textContent = '';
        showToast(state.isEditMode ? '원래 게시글 내용으로 되돌렸어요.' : '작성 내용을 초기화했어요.');
      });
    }

    var saveDraftBtn = container.querySelector('[data-action="save-draft"]');
    if (saveDraftBtn) {
      saveDraftBtn.addEventListener('click', function () {
        if (!hasDraftableContent()) {
          showToast('임시저장할 내용을 먼저 입력해주세요.');
          return;
        }
        if (saveDraft(buildDraftSnapshot())) {
          refreshDraftIndicator(true);
          showToast('임시저장이 완료되었어요.');
        } else {
          showToast('브라우저 저장 공간이 부족해 임시저장에 실패했어요.');
        }
      });
    }

    var loadDraftBtn = container.querySelector('[data-action="load-draft"]');
    if (loadDraftBtn) {
      loadDraftBtn.addEventListener('click', function () {
        var draft = loadDraft();
        if (!draft) {
          showToast('저장된 임시글이 없어요.');
          return;
        }
        state.title = typeof draft.title === 'string' ? draft.title : '';
        state.category = typeof draft.category === 'string' ? draft.category : '';
        state.status = draft.status === '예약중' ? '예약중' : '판매중';
        state.isFreeShare = Boolean(draft.isFreeShare);
        state.rawPrice = state.isFreeShare ? '0' : extractDigits(draft.rawPrice);
        state.lastNonZeroPrice = extractDigits(draft.lastNonZeroPrice || (!state.isFreeShare ? state.rawPrice : ''));
        state.location = draft.location || state.location;
        state.sellerName = typeof draft.sellerName === 'string' && draft.sellerName ? draft.sellerName : '임성훈';
        state.description = typeof draft.description === 'string' ? draft.description : '';
        state.images = Array.isArray(draft.images) ? draft.images.slice(0, MAX_IMAGES) : [];
        state.activeIndex = 0;

        clearAllErrors();
        renderGallery();
        syncFormInputsFromState();
        if (draftStatusEl) draftStatusEl.textContent = '임시저장 불러옴';
        showToast('임시저장된 글을 불러왔어요.');
      });
    }

    // 초기 렌더링 동기화
    renderGallery();
    syncFormInputsFromState();

    container._hobakWriteCleanup = function () {
      if (draftTimer) {
        clearTimeout(draftTimer);
        draftTimer = null;
      }
      if (toastTimer) {
        clearTimeout(toastTimer);
        toastTimer = null;
      }
    };
  }

  global.HobakWritePage = {
    render: render
  };
})(window);
