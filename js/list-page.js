/**
 * 호박(Hobak) 중고거래 웹서비스 - 상품 목록 페이지 모듈
 * - window.HobakListPage.render(container, state) 규약 구현
 * - 필터(검색어, 동네, 카테고리, 거래가능만 보기, 정렬), 3열 카드 그리드,
 *   인기 검색어 사이드바, 빈 상태 UI, 페이지네이션 제공
 */
(function (global) {
  'use strict';

  var DEFAULT_PAGE_SIZE = 12;

  var ICON_SLIDERS =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<line x1="4" y1="21" x2="4" y2="14"></line>' +
    '<line x1="4" y1="10" x2="4" y2="3"></line>' +
    '<line x1="12" y1="21" x2="12" y2="12"></line>' +
    '<line x1="12" y1="8" x2="12" y2="3"></line>' +
    '<line x1="20" y1="21" x2="20" y2="16"></line>' +
    '<line x1="20" y1="12" x2="20" y2="3"></line>' +
    '<line x1="1" y1="14" x2="7" y2="14"></line>' +
    '<line x1="9" y1="8" x2="15" y2="8"></line>' +
    '<line x1="17" y1="16" x2="23" y2="16"></line>' +
    '</svg>';

  var ICON_PIN =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>' +
    '<circle cx="12" cy="10" r="3"></circle>' +
    '</svg>';

  var ICON_CHEVRON_DOWN =
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<polyline points="6 9 12 15 18 9"></polyline>' +
    '</svg>';

  var ICON_CHECK_CIRCLE =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>' +
    '<polyline points="22 4 12 14.01 9 11.01"></polyline>' +
    '</svg>';

  var ICON_RESET =
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<polyline points="1 4 1 10 7 10"></polyline>' +
    '<path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>' +
    '</svg>';

  var ICON_SEARCH =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="11" cy="11" r="8"></circle>' +
    '<line x1="21" y1="21" x2="16.65" y2="16.65"></line>' +
    '</svg>';

  var ICON_PREV =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<polyline points="15 18 9 12 15 6"></polyline>' +
    '</svg>';

  var ICON_NEXT =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<polyline points="9 18 15 12 9 6"></polyline>' +
    '</svg>';

  // 모듈 내부 상태 (컨테이너 재렌더링 및 콜백 유지)
  var activeContainer = null;
  var activeState = {
    query: '',
    category: '전체',
    location: '',
    onlyAvailable: false,
    sort: 'latest',
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE
  };
  var activeOnStateChange = null;
  var isFilterPanelOpen = true;

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizeImageUrl(url, fallback) {
    if (typeof url !== 'string' || !url.trim()) {
      return fallback || '';
    }
    var trimmed = url.trim();
    if (
      trimmed.indexOf('data:image/') === 0 ||
      trimmed.indexOf('https://') === 0 ||
      trimmed.indexOf('http://') === 0 ||
      trimmed.indexOf('/') === 0 ||
      trimmed.indexOf('./') === 0
    ) {
      return trimmed;
    }
    return fallback || '';
  }

  function getStore() {
    return global.HobakStore || {
      getItems: function () { return []; },
      formatPrice: function (price, isFreeShare) {
        if (isFreeShare || Number(price) === 0) return '나눔 🧡';
        return Number(price || 0).toLocaleString('ko-KR') + '원';
      },
      POPULAR_KEYWORDS: [],
      CATEGORIES: ['전체'],
      LOCATIONS: [],
      SAMPLE_IMAGES: []
    };
  }

  function normalizeLocation(rawLocation, store) {
    if (!rawLocation) return '';
    var trimmed = String(rawLocation).trim();
    if (!trimmed || trimmed === '전체' || trimmed === '전체 동네') {
      return '';
    }
    var locations = Array.isArray(store.LOCATIONS) ? store.LOCATIONS : [];
    for (var i = 0; i < locations.length; i++) {
      var loc = locations[i];
      if (loc.short === trimmed || loc.full === trimmed) {
        return loc.short;
      }
    }
    // '울산 동구 방어동' 등 공백 포함 지역명 처리
    var parts = trimmed.split(/\s+/);
    return parts[parts.length - 1] || trimmed;
  }

  function normalizeState(inputState, store) {
    var src = inputState && typeof inputState === 'object' ? inputState : {};
    var rawQuery = src.query != null ? src.query : src.keyword;
    var query = typeof rawQuery === 'string' ? rawQuery.trim() : '';
    var category = typeof src.category === 'string' && src.category.trim() ? src.category.trim() : '전체';
    var location = normalizeLocation(src.location, store);
    var onlyAvailable = Boolean(src.onlyAvailable);
    var sort =
      src.sort === 'popular' || src.sort === 'price-asc' || src.sort === 'price-desc'
        ? src.sort
        : 'latest';
    var page = Math.max(1, parseInt(src.page, 10) || 1);
    var pageSize = Math.max(1, parseInt(src.pageSize, 10) || DEFAULT_PAGE_SIZE);

    return {
      query: query,
      category: category,
      location: location,
      onlyAvailable: onlyAvailable,
      sort: sort,
      page: page,
      pageSize: pageSize
    };
  }

  function snapshotState(state) {
    return {
      query: state.query,
      category: state.category,
      location: state.location,
      onlyAvailable: state.onlyAvailable,
      sort: state.sort,
      page: state.page,
      pageSize: state.pageSize
    };
  }

  function countActiveFilters(state) {
    var count = 0;
    if (state.query) count += 1;
    if (state.category && state.category !== '전체') count += 1;
    if (state.location) count += 1;
    if (state.onlyAvailable) count += 1;
    if (state.sort && state.sort !== 'latest') count += 1;
    return count;
  }

  function filterAndSortItems(items, state) {
    var tokens = state.query
      ? state.query.toLowerCase().split(/\s+/).filter(Boolean)
      : [];

    var filtered = items.filter(function (item) {
      if (!item) return false;

      if (state.onlyAvailable && item.status !== '판매중') {
        return false;
      }

      if (state.category && state.category !== '전체') {
        if (item.category !== state.category) {
          return false;
        }
      }

      if (state.location) {
        var shortLoc = item.shortLocation || '';
        var fullLoc = item.location || '';
        var locMatch =
          shortLoc === state.location ||
          fullLoc === state.location ||
          fullLoc.indexOf(state.location) !== -1;
        if (!locMatch) {
          return false;
        }
      }

      if (tokens.length > 0) {
        var sellerName = item.seller && item.seller.name ? item.seller.name : '';
        var isFree = Boolean(item.isFreeShare) || Number(item.price) === 0;
        var searchable = [
          item.title || '',
          item.description || '',
          item.category || '',
          item.location || '',
          item.shortLocation || '',
          sellerName,
          isFree ? '나눔 무료' : ''
        ]
          .join(' ')
          .toLowerCase();

        for (var i = 0; i < tokens.length; i++) {
          if (searchable.indexOf(tokens[i]) === -1) {
            return false;
          }
        }
      }

      return true;
    });

    if (state.sort === 'popular') {
      filtered.sort(function (a, b) {
        var likeDiff = (b.likes || 0) - (a.likes || 0);
        if (likeDiff !== 0) return likeDiff;
        return (b.views || 0) - (a.views || 0);
      });
    } else if (state.sort === 'price-asc') {
      filtered.sort(function (a, b) {
        var priceA = a.isFreeShare ? 0 : Number(a.price) || 0;
        var priceB = b.isFreeShare ? 0 : Number(b.price) || 0;
        return priceA - priceB;
      });
    } else if (state.sort === 'price-desc') {
      filtered.sort(function (a, b) {
        var priceA = a.isFreeShare ? 0 : Number(a.price) || 0;
        var priceB = b.isFreeShare ? 0 : Number(b.price) || 0;
        return priceB - priceA;
      });
    }

    return filtered;
  }

  function buildDynamicTitle(state) {
    var loc = state.location;
    var query = state.query;
    var category = state.category && state.category !== '전체' ? state.category : '';

    if (query && loc) {
      return loc + ' "' + query + '" 검색 결과';
    }
    if (query) {
      return '"' + query + '" 검색 결과';
    }
    if (loc && category) {
      return loc + ' · ' + category + ' 검색 결과';
    }
    if (loc) {
      return loc + ' 중고거래 검색 결과';
    }
    if (category) {
      return category + ' 중고거래 검색 결과';
    }
    return '전체 동네 중고거래 검색 결과';
  }

  function buildPaginationTokens(currentPage, totalPages) {
    if (totalPages <= 7) {
      var simple = [];
      for (var i = 1; i <= totalPages; i++) {
        simple.push(i);
      }
      return simple;
    }

    var tokens = [1];
    var start = Math.max(2, currentPage - 1);
    var end = Math.min(totalPages - 1, currentPage + 1);

    if (currentPage <= 3) {
      start = 2;
      end = 4;
    } else if (currentPage >= totalPages - 2) {
      start = totalPages - 3;
      end = totalPages - 1;
    }

    if (start > 2) {
      tokens.push('...');
    }
    for (var p = start; p <= end; p++) {
      tokens.push(p);
    }
    if (end < totalPages - 1) {
      tokens.push('...');
    }
    tokens.push(totalPages);
    return tokens;
  }

  function renderCardHtml(item, store, fallbackImg) {
    var rawImg = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : '';
    var imgSrc = sanitizeImageUrl(rawImg, fallbackImg);
    var statusText = item.status || '판매중';
    var isReserved = statusText === '예약중';
    var isSold = statusText === '거래완료';
    var statusClass = isReserved ? 'is-reserved' : isSold ? 'is-sold' : 'is-selling';
    var isFree = Boolean(item.isFreeShare) || Number(item.price) === 0;
    var priceText = store.formatPrice(item.price, item.isFreeShare);
    var shortLoc =
      item.shortLocation ||
      (item.location ? String(item.location).trim().split(/\s+/).pop() : '방어동');
    var timeAgo = item.timeAgo || '방금 전';
    var likesCount = Number(item.likes) || 0;
    var sellerName =
      item.seller && item.seller.name ? String(item.seller.name) : '호박이웃';
    var mannerTemp =
      item.seller && item.seller.mannerTemp != null
        ? Number(item.seller.mannerTemp).toFixed(1)
        : '36.5';

    var badgeHtml =
      '<span class="hobak-list-status-badge ' +
      statusClass +
      '">' +
      escapeHtml(statusText) +
      '</span>';

    return (
      '<article class="hobak-list-card' +
      (isSold ? ' is-sold-card' : '') +
      '" data-item-id="' +
      escapeHtml(item.id) +
      '" data-status="' +
      escapeHtml(statusText) +
      '" tabindex="0" role="button" aria-label="' +
      escapeHtml(item.title + ' ' + priceText + ' ' + statusText) +
      '">' +
        '<div class="hobak-list-card-thumb">' +
          badgeHtml +
          '<img class="hobak-list-card-img' +
          (isSold ? ' is-sold-img' : '') +
          '" src="' +
          escapeHtml(imgSrc) +
          '" alt="' +
          escapeHtml(item.title) +
          '" loading="lazy" />' +
        '</div>' +
        '<div class="hobak-list-card-body">' +
          '<h2 class="hobak-list-card-title">' + escapeHtml(item.title) + '</h2>' +
          '<p class="hobak-list-card-price' + (isFree ? ' is-free' : '') + '">' +
            escapeHtml(priceText) +
          '</p>' +
          '<p class="hobak-list-card-meta">' +
            escapeHtml(shortLoc + ' · ' + timeAgo) +
          '</p>' +
          '<div class="hobak-list-card-points">' +
            '<span class="hobak-list-point-badge is-status-tag ' + statusClass + '" title="거래 상태">' +
              escapeHtml(statusText) +
            '</span>' +
            '<span class="hobak-list-point-badge is-seller" title="작성자 닉네임">' +
              '👤 ' + escapeHtml(sellerName) +
            '</span>' +
            '<span class="hobak-list-point-badge' + (item.liked ? ' is-liked' : '') + '" title="관심">' +
              (item.liked ? '♥ ' : '♡ ') + likesCount +
            '</span>' +
            '<span class="hobak-list-point-badge is-temp" title="판매자 매너온도">' +
              '🌡️ ' + escapeHtml(mannerTemp) + '°C' +
            '</span>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function renderEmptyHtml(state) {
    var heading = state.query
      ? '"' + escapeHtml(state.query) + '"에 대한 검색 결과가 없어요'
      : '조건에 맞는 상품이 없어요';

    return (
      '<div class="hobak-list-empty">' +
        '<div class="hobak-list-empty-icon" aria-hidden="true">🎃</div>' +
        '<h3 class="hobak-list-empty-title">' + heading + '</h3>' +
        '<p class="hobak-list-empty-desc">' +
          '검색어나 동네·카테고리 필터를 변경해 보시거나,<br />' +
          '이웃들에게 첫 번째 중고 물품을 등록해 보세요!' +
        '</p>' +
        '<div class="hobak-list-empty-actions">' +
          '<button type="button" class="hobak-list-empty-btn-all" data-action="reset-all">' +
            '전체 상품 보기' +
          '</button>' +
          '<button type="button" class="hobak-list-empty-btn-write" data-action="go-write">' +
            '+ 새 상품 등록하기' +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }

  function renderPaginationHtml(currentPage, totalPages) {
    var tokens = buildPaginationTokens(currentPage, totalPages);
    var html = '<nav class="hobak-list-pagination" aria-label="상품 목록 페이지네이션">';

    html +=
      '<button type="button" class="hobak-list-page-btn is-nav" data-action="page" data-page="' +
      (currentPage - 1) +
      '" aria-label="이전 페이지"' +
      (currentPage <= 1 ? ' disabled' : '') +
      '>' +
      ICON_PREV +
      '</button>';

    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      if (token === '...') {
        html += '<span class="hobak-list-page-ellipsis" aria-hidden="true">···</span>';
      } else {
        var isActive = token === currentPage;
        html +=
          '<button type="button" class="hobak-list-page-btn' +
          (isActive ? ' is-active' : '') +
          '" data-action="page" data-page="' +
          token +
          '"' +
          (isActive ? ' aria-current="page"' : '') +
          '>' +
          token +
          '</button>';
      }
    }

    html +=
      '<button type="button" class="hobak-list-page-btn is-nav" data-action="page" data-page="' +
      (currentPage + 1) +
      '" aria-label="다음 페이지"' +
      (currentPage >= totalPages ? ' disabled' : '') +
      '>' +
      ICON_NEXT +
      '</button>';

    html += '</nav>';
    return html;
  }

  function renderHeaderHtml(state, totalCount, store) {
    var activeFilterCount = countActiveFilters(state);
    var titleText = buildDynamicTitle(state);
    var locations = Array.isArray(store.LOCATIONS) ? store.LOCATIONS : [];
    var categories = Array.isArray(store.CATEGORIES) && store.CATEGORIES.length > 0
      ? store.CATEGORIES
      : ['전체'];

    var locationOptionsHtml = '<option value="">전체 동네</option>';
    for (var i = 0; i < locations.length; i++) {
      var loc = locations[i];
      var selected = state.location === loc.short ? ' selected' : '';
      locationOptionsHtml +=
        '<option value="' + escapeHtml(loc.short) + '"' + selected + '>' +
          escapeHtml(loc.short) +
        '</option>';
    }

    var categoryPillsHtml = '';
    for (var j = 0; j < categories.length; j++) {
      var cat = categories[j];
      var isCatActive = state.category === cat;
      categoryPillsHtml +=
        '<button type="button" class="hobak-list-cat-pill' +
        (isCatActive ? ' is-active' : '') +
        '" data-action="category" data-category="' +
        escapeHtml(cat) +
        '" aria-pressed="' +
        (isCatActive ? 'true' : 'false') +
        '">' +
        escapeHtml(cat) +
        '</button>';
    }

    var queryChipHtml = state.query
      ? '<button type="button" class="hobak-list-query-chip" data-action="clear-query" title="검색어 해제">' +
          '<span>"' + escapeHtml(state.query) + '"</span>' +
          '<span class="hobak-list-query-chip-x" aria-hidden="true">✕</span>' +
        '</button>'
      : '';

    var resetBtnHtml = activeFilterCount > 0
      ? '<button type="button" class="hobak-list-reset-btn" data-action="reset-all">' +
          ICON_RESET +
          '<span>초기화</span>' +
        '</button>'
      : '';

    return (
      '<header class="hobak-list-header">' +
        '<div class="hobak-list-title-row">' +
          '<h1 class="hobak-list-title">' +
            '<span class="hobak-list-title-emoji" aria-hidden="true">🎃</span>' +
            '<span>' + escapeHtml(titleText) + '</span>' +
          '</h1>' +
          '<span class="hobak-list-count">총 <strong>' + totalCount + '</strong>개 상품</span>' +
        '</div>' +

        '<div class="hobak-list-controls">' +
          '<button type="button" class="hobak-list-filter-btn' +
          (isFilterPanelOpen ? ' is-open' : '') +
          '" data-action="toggle-filter-panel" aria-expanded="' +
          (isFilterPanelOpen ? 'true' : 'false') +
          '">' +
            ICON_SLIDERS +
            '<span>필터</span>' +
            (activeFilterCount > 0
              ? '<span class="hobak-list-filter-badge">' + activeFilterCount + '</span>'
              : '') +
          '</button>' +

          '<div class="hobak-list-location-wrap">' +
            '<span class="hobak-list-location-icon">' + ICON_PIN + '</span>' +
            '<select class="hobak-list-location-select' +
            (state.location ? ' is-selected' : '') +
            '" data-action="location-select" aria-label="동네 선택">' +
              locationOptionsHtml +
            '</select>' +
            '<span class="hobak-list-select-chevron">' + ICON_CHEVRON_DOWN + '</span>' +
          '</div>' +

          '<button type="button" class="hobak-list-available-btn' +
          (state.onlyAvailable ? ' is-active' : '') +
          '" data-action="toggle-available" aria-pressed="' +
          (state.onlyAvailable ? 'true' : 'false') +
          '">' +
            '<span class="hobak-list-available-dot">' + ICON_CHECK_CIRCLE + '</span>' +
            '<span>거래가능만 보기</span>' +
          '</button>' +

          queryChipHtml +
          resetBtnHtml +

          '<div class="hobak-list-sort-wrap">' +
            '<select class="hobak-list-sort-select" data-action="sort-select" aria-label="정렬 기준">' +
              '<option value="latest"' + (state.sort === 'latest' ? ' selected' : '') + '>최신순</option>' +
              '<option value="popular"' + (state.sort === 'popular' ? ' selected' : '') + '>인기순</option>' +
              '<option value="price-asc"' + (state.sort === 'price-asc' ? ' selected' : '') + '>낮은 가격순</option>' +
              '<option value="price-desc"' + (state.sort === 'price-desc' ? ' selected' : '') + '>높은 가격순</option>' +
            '</select>' +
            '<span class="hobak-list-select-chevron">' + ICON_CHEVRON_DOWN + '</span>' +
          '</div>' +
        '</div>' +

        '<div class="hobak-list-category-panel' +
        (isFilterPanelOpen ? '' : ' is-collapsed') +
        '">' +
          '<div class="hobak-list-category-row" role="group" aria-label="카테고리 필터">' +
            categoryPillsHtml +
          '</div>' +
        '</div>' +
      '</header>'
    );
  }

  function renderSidebarHtml(state, store) {
    var keywords = Array.isArray(store.POPULAR_KEYWORDS) ? store.POPULAR_KEYWORDS : [];
    var currentQueryLower = state.query.toLowerCase();

    var tagsHtml = '';
    for (var i = 0; i < keywords.length; i++) {
      var kw = keywords[i];
      var isKwActive = currentQueryLower !== '' && currentQueryLower === String(kw).toLowerCase();
      tagsHtml +=
        '<button type="button" class="hobak-list-keyword-tag' +
        (isKwActive ? ' is-active' : '') +
        '" data-action="keyword" data-keyword="' +
        escapeHtml(kw) +
        '" aria-pressed="' +
        (isKwActive ? 'true' : 'false') +
        '">' +
        escapeHtml(kw) +
        '</button>';
    }

    return (
      '<aside class="hobak-list-sidebar" aria-label="인기 검색어 및 판매하기">' +
        '<div class="hobak-list-sidebar-card">' +
          '<h2 class="hobak-list-sidebar-title">' +
            ICON_SEARCH +
            '<span>인기 검색어</span>' +
          '</h2>' +
          '<div class="hobak-list-keyword-list">' +
            tagsHtml +
          '</div>' +
        '</div>' +

        '<div class="hobak-list-sell-card">' +
          '<p class="hobak-list-sell-head">' +
            '<span aria-hidden="true">🎃</span>' +
            '<span>집에 안 쓰는 물건이 있나요?</span>' +
          '</p>' +
          '<p class="hobak-list-sell-desc">' +
            escapeHtml(state.location || '우리 동네') + ' 이웃들과 따뜻한 직거래를 시작해보세요.' +
          '</p>' +
          '<button type="button" class="hobak-list-sell-btn" data-action="go-write">' +
            '+ 호박에 내 물건 팔기' +
          '</button>' +
        '</div>' +
      '</aside>'
    );
  }

  function navigateTo(route, params) {
    if (global.HobakApp && typeof global.HobakApp.navigate === 'function') {
      global.HobakApp.navigate(route, params);
    }
  }

  function notifyStateChange(nextState) {
    if (typeof activeOnStateChange === 'function') {
      activeOnStateChange(snapshotState(nextState));
    }
  }

  function applyStateUpdate(patch, options) {
    var opts = options || {};
    var next = Object.assign({}, activeState, patch);
    activeState = next;
    renderCurrent();
    if (opts.scrollTop && activeContainer) {
      var rect = activeContainer.getBoundingClientRect();
      if (rect.top < 0) {
        global.scrollTo({
          top: Math.max(0, global.scrollY + rect.top - 110),
          behavior: 'smooth'
        });
      }
    }
    notifyStateChange(next);
  }

  function attachEvents(root, fallbackImg) {
    // 이미지 로드 실패 시 안전한 기본 이미지로 대체
    root.addEventListener(
      'error',
      function (event) {
        var target = event.target;
        if (
          target &&
          target.tagName === 'IMG' &&
          fallbackImg &&
          target.dataset.fallbackApplied !== '1'
        ) {
          target.dataset.fallbackApplied = '1';
          target.src = fallbackImg;
        }
      },
      true
    );

    root.addEventListener('change', function (event) {
      var target = event.target;
      if (!target || !target.dataset) return;

      if (target.dataset.action === 'location-select') {
        applyStateUpdate({ location: target.value, page: 1 });
      } else if (target.dataset.action === 'sort-select') {
        applyStateUpdate({ sort: target.value, page: 1 });
      }
    });

    root.addEventListener('click', function (event) {
      var actionEl = event.target.closest('[data-action]');
      if (actionEl && root.contains(actionEl)) {
        var action = actionEl.dataset.action;

        if (action === 'toggle-filter-panel') {
          isFilterPanelOpen = !isFilterPanelOpen;
          renderCurrent();
          return;
        }

        if (action === 'toggle-available') {
          applyStateUpdate({ onlyAvailable: !activeState.onlyAvailable, page: 1 });
          return;
        }

        if (action === 'category') {
          var nextCat = actionEl.dataset.category || '전체';
          applyStateUpdate({ category: nextCat, page: 1 });
          return;
        }

        if (action === 'keyword') {
          var kw = actionEl.dataset.keyword || '';
          var isSame = activeState.query.toLowerCase() === kw.toLowerCase();
          applyStateUpdate({ query: isSame ? '' : kw, page: 1 });
          return;
        }

        if (action === 'clear-query') {
          applyStateUpdate({ query: '', page: 1 });
          return;
        }

        if (action === 'reset-all') {
          applyStateUpdate({
            query: '',
            category: '전체',
            location: '',
            onlyAvailable: false,
            sort: 'latest',
            page: 1
          });
          return;
        }

        if (action === 'page') {
          if (actionEl.disabled) return;
          var targetPage = parseInt(actionEl.dataset.page, 10);
          if (!isNaN(targetPage) && targetPage >= 1 && targetPage !== activeState.page) {
            applyStateUpdate({ page: targetPage }, { scrollTop: true });
          }
          return;
        }

        if (action === 'go-write') {
          navigateTo('write');
          return;
        }
      }

      var cardEl = event.target.closest('.hobak-list-card[data-item-id]');
      if (cardEl && root.contains(cardEl)) {
        navigateTo('detail', { id: cardEl.dataset.itemId });
      }
    });

    root.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      var cardEl = event.target.closest('.hobak-list-card[data-item-id]');
      if (cardEl && root.contains(cardEl)) {
        event.preventDefault();
        navigateTo('detail', { id: cardEl.dataset.itemId });
      }
    });
  }

  function renderCurrent() {
    if (!activeContainer) return;

    var store = getStore();
    var allItems = store.getItems();
    var filteredItems = filterAndSortItems(allItems, activeState);

    var totalCount = filteredItems.length;
    var pageSize = activeState.pageSize || DEFAULT_PAGE_SIZE;
    var totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    var safePage = Math.max(1, Math.min(activeState.page, totalPages));
    if (safePage !== activeState.page) {
      activeState.page = safePage;
    }

    var startIdx = (safePage - 1) * pageSize;
    var pageItems = filteredItems.slice(startIdx, startIdx + pageSize);

    var fallbackImg =
      Array.isArray(store.SAMPLE_IMAGES) && store.SAMPLE_IMAGES.length > 0
        ? store.SAMPLE_IMAGES[0].url
        : '';

    var mainContentHtml = '';
    if (totalCount === 0) {
      mainContentHtml = renderEmptyHtml(activeState);
    } else {
      var cardsHtml = '';
      for (var i = 0; i < pageItems.length; i++) {
        cardsHtml += renderCardHtml(pageItems[i], store, fallbackImg);
      }
      mainContentHtml =
        '<div class="hobak-list-grid">' +
          cardsHtml +
        '</div>' +
        renderPaginationHtml(safePage, totalPages);
    }

    var root = document.createElement('section');
    root.className = 'hobak-list-page';
    root.setAttribute('aria-label', '호박 중고거래 상품 목록');
    root.innerHTML =
      renderHeaderHtml(activeState, totalCount, store) +
      '<div class="hobak-list-layout">' +
        '<div class="hobak-list-main">' +
          mainContentHtml +
        '</div>' +
        renderSidebarHtml(activeState, store) +
      '</div>';

    attachEvents(root, fallbackImg);
    activeContainer.innerHTML = '';
    activeContainer.appendChild(root);
  }

  function render(container, state, onStateChange) {
    var targetContainer =
      typeof container === 'string' ? global.document.querySelector(container) : container;
    if (!targetContainer) {
      return;
    }

    var store = getStore();
    activeContainer = targetContainer;
    activeState = normalizeState(state, store);

    if (state && typeof state.onStateChange === 'function') {
      activeOnStateChange = state.onStateChange;
    } else if (typeof onStateChange === 'function') {
      activeOnStateChange = onStateChange;
    } else if (state && state.onStateChange === null) {
      activeOnStateChange = null;
    }

    renderCurrent();
  }

  global.HobakListPage = {
    render: render
  };
})(window);
