/**
 * 호박(Hobak) 상품 상세 페이지 모듈
 * - window.HobakDetailPage = { render(container, params) }
 * - window.HobakStore 및 window.HobakApp과 연동
 */
(function (global) {
  'use strict';

  // 아이템별 호박채팅 대화 내역 메모리 캐시 (모달을 닫았다 다시 열어도 유지)
  const chatHistoryStore = {};

  function escapeHtml(str) {
    return String(str == null ? '' : str)
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
    const trimmed = url.trim();
    if (
      trimmed.indexOf('data:image/') === 0 ||
      trimmed.indexOf('https://') === 0 ||
      trimmed.indexOf('http://') === 0 ||
      trimmed.indexOf('blob:') === 0 ||
      trimmed.indexOf('/') === 0 ||
      trimmed.indexOf('./') === 0
    ) {
      return trimmed;
    }
    return fallback || '';
  }

  function getStore() {
    return global.HobakStore || null;
  }

  function navigateTo(page, params) {
    if (global.HobakApp && typeof global.HobakApp.navigate === 'function') {
      global.HobakApp.navigate(page, params);
    }
  }

  function formatItemPrice(item) {
    const store = getStore();
    if (store && typeof store.formatPrice === 'function') {
      return store.formatPrice(item.price, item.isFreeShare);
    }
    if (item.isFreeShare || Number(item.price) === 0) {
      return '나눔 🧡';
    }
    return Number(item.price || 0).toLocaleString('ko-KR') + '원';
  }

  function getMannerInfo(temp) {
    const num = typeof temp === 'number' && !Number.isNaN(temp) ? temp : 36.5;
    let emoji = '😊';
    if (num >= 45) {
      emoji = '🥰';
    } else if (num >= 40) {
      emoji = '😄';
    } else if (num >= 36.5) {
      emoji = '😊';
    } else if (num >= 34.5) {
      emoji = '🙂';
    } else {
      emoji = '😐';
    }
    return {
      formatted: num.toFixed(1) + '°C',
      value: num,
      emoji: emoji
    };
  }

  function getStatusKey(status) {
    if (status === '예약중') return 'reserved';
    if (status === '거래완료') return 'sold';
    return 'selling';
  }

  function getActionSubText(item) {
    if (item.status === '거래완료') return '거래가 완료되었어요';
    if (item.status === '예약중') return '현재 예약중인 상품이에요';
    if (item.isFreeShare || Number(item.price) === 0) return '따뜻한 무료 나눔';
    return (item.shortLocation || '동네') + ' 직거래';
  }

  function formatCurrentTime() {
    const now = new Date();
    const h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, '0');
    const period = h < 12 ? '오전' : '오후';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return period + ' ' + hour12 + ':' + m;
  }

  function getSellerAutoReply(userText, item) {
    const text = (userText || '').trim();
    const shortLoc = item.shortLocation || '방어동';
    const sellerName = (item.seller && item.seller.name) || '판매자';

    if (item.status === '거래완료') {
      return '앗, 죄송하지만 해당 상품은 이미 거래가 완료되었어요! 다음에 좋은 거래로 또 뵈어요 :)';
    }
    if (/네고|깎|할인|가격|얼마/.test(text)) {
      if (item.isFreeShare || Number(item.price) === 0) {
        return '무료 나눔 상품이라 편하게 받아가시면 됩니다! 😊';
      }
      return '이미 상태 대비 저렴하게 올린 편이라 큰 네고는 어렵고, 쿨거래하시면 조금 맞춰드릴 수 있어요!';
    }
    if (/어디|위치|장소|직거래|동네/.test(text)) {
      return shortLoc + ' 주민센터나 가까운 편의점 앞에서 직거래 가능합니다! 편하신 곳 있으신가요?';
    }
    if (/시간|오늘|내일|언제|저녁|주말/.test(text)) {
      return '오늘 저녁 7시 이후나 주말에는 대부분 시간 괜찮아요! 원하시는 시간 말씀해 주세요 😊';
    }
    if (/상태|하자|사진|사이즈|정품/.test(text)) {
      return '올려둔 사진 그대로 컨디션 깨끗하게 보관중이에요! 직거래 시 직접 확인하고 결정하셔도 됩니다.';
    }
    if (item.status === '예약중') {
      return '안녕하세요! 현재 다른 분과 예약 조율 중인데, 혹시 불발되면 ' + sellerName + '이 바로 연락드릴게요!';
    }
    return '안녕하세요! 네, 아직 거래 가능합니다 😊 ' + shortLoc + ' 직거래 원하시면 편하신 시간 알려주세요!';
  }

  function getRelatedItems(currentItem) {
    const store = getStore();
    if (!store || typeof store.getItems !== 'function') return [];

    const all = store.getItems().filter((entry) => entry && entry.id !== currentItem.id);
    return all
      .map((entry) => {
        let score = 0;
        if (entry.shortLocation && entry.shortLocation === currentItem.shortLocation) score += 3;
        else if (entry.location && entry.location === currentItem.location) score += 2;
        if (entry.category && entry.category === currentItem.category) score += 1;
        if (entry.status !== '거래완료') score += 1;
        return { entry: entry, score: score };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (b.entry.createdAt || 0) - (a.entry.createdAt || 0);
      })
      .slice(0, 3)
      .map((row) => row.entry);
  }

  function createSvgIcon(name) {
    switch (name) {
      case 'close':
        return (
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<line x1="18" y1="6" x2="6" y2="18"></line>' +
          '<line x1="6" y1="6" x2="18" y2="18"></line>' +
          '</svg>'
        );
      case 'chevron-left':
        return (
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<polyline points="15 18 9 12 15 6"></polyline>' +
          '</svg>'
        );
      case 'chevron-right':
        return (
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<polyline points="9 18 15 12 9 6"></polyline>' +
          '</svg>'
        );
      case 'chevron-down':
        return (
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<polyline points="6 9 12 15 18 9"></polyline>' +
          '</svg>'
        );
      case 'heart-outline':
        return (
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>' +
          '</svg>'
        );
      case 'heart-filled':
        return (
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" ' +
          'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>' +
          '</svg>'
        );
      case 'edit':
        return (
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M12 20h9"></path>' +
          '<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>' +
          '</svg>'
        );
      case 'trash':
        return (
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<polyline points="3 6 5 6 21 6"></polyline>' +
          '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>' +
          '</svg>'
        );
      case 'empty':
        return (
          '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<circle cx="11" cy="11" r="8"></circle>' +
          '<line x1="21" y1="21" x2="16.65" y2="16.65"></line>' +
          '<line x1="8" y1="11" x2="14" y2="11"></line>' +
          '</svg>'
        );
      case 'qr':
        return (
          '<svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true">' +
          '<rect width="120" height="120" fill="#ffffff"/>' +
          '<rect x="8" y="8" width="32" height="32" rx="4" fill="none" stroke="#212124" stroke-width="6"/>' +
          '<rect x="18" y="18" width="12" height="12" rx="2" fill="#ff6f0f"/>' +
          '<rect x="80" y="8" width="32" height="32" rx="4" fill="none" stroke="#212124" stroke-width="6"/>' +
          '<rect x="90" y="18" width="12" height="12" rx="2" fill="#212124"/>' +
          '<rect x="8" y="80" width="32" height="32" rx="4" fill="none" stroke="#212124" stroke-width="6"/>' +
          '<rect x="18" y="90" width="12" height="12" rx="2" fill="#212124"/>' +
          '<g fill="#212124">' +
          '<rect x="50" y="10" width="8" height="8"/><rect x="64" y="10" width="8" height="8"/>' +
          '<rect x="50" y="24" width="14" height="8"/><rect x="50" y="48" width="20" height="20" rx="4" fill="#ff6f0f"/>' +
          '<rect x="10" y="50" width="10" height="10"/><rect x="26" y="54" width="14" height="8"/>' +
          '<rect x="80" y="50" width="10" height="12"/><rect x="96" y="52" width="14" height="8"/>' +
          '<rect x="52" y="80" width="10" height="12"/><rect x="68" y="76" width="12" height="10"/>' +
          '<rect x="86" y="80" width="24" height="10"/><rect x="52" y="100" width="22" height="10"/>' +
          '<rect x="84" y="98" width="12" height="12"/><rect x="102" y="98" width="8" height="12"/>' +
          '</g>' +
          '</svg>'
        );
      default:
        return '';
    }
  }

  function renderNotFound(container) {
    const pageEl = document.createElement('div');
    pageEl.className = 'hobak-detail-page';
    pageEl.innerHTML =
      '<div class="hobak-detail-not-found">' +
      '  <div class="hobak-detail-not-found-icon">' +
      createSvgIcon('empty') +
      '  </div>' +
      '  <h2 class="hobak-detail-not-found-title">상품을 찾을 수 없습니다</h2>' +
      '  <p class="hobak-detail-not-found-desc">' +
      '    삭제되었거나 존재하지 않는 게시글이에요.<br/>동네의 다른 따뜻한 물품들을 둘러보세요!' +
      '  </p>' +
      '  <button type="button" class="hobak-detail-primary-btn" data-action="back-list">' +
      '    목록으로 돌아가기' +
      '  </button>' +
      '</div>';

    const backBtn = pageEl.querySelector('[data-action="back-list"]');
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        navigateTo('list');
      });
    }

    container.innerHTML = '';
    container.appendChild(pageEl);
  }

  function render(containerArg, params) {
    const container =
      typeof containerArg === 'string'
        ? global.document.querySelector(containerArg)
        : containerArg;
    if (!container) return;

    // 이전 인스턴스 리스너 및 타이머 정리
    if (typeof container._hobakDetailCleanup === 'function') {
      container._hobakDetailCleanup();
      container._hobakDetailCleanup = null;
    }

    const store = getStore();
    const itemId = params && params.id ? String(params.id) : '';
    let item = store && itemId ? store.getItemById(itemId) : null;

    if (!item) {
      renderNotFound(container);
      return;
    }

    // 상세 진입 시 조회수 1회 증가 (렌더 내부 상태 변경으로는 재호출되지 않음)
    if (store && typeof store.incrementView === 'function' && !(params && params.skipViewIncrement)) {
      const incremented = store.incrementView(item.id);
      if (incremented) {
        item = incremented;
      }
    }

    const fallbackProductImg =
      (store &&
        store.SAMPLE_IMAGES &&
        store.SAMPLE_IMAGES[0] &&
        store.SAMPLE_IMAGES[0].url) ||
      '';
    const rawImages =
      Array.isArray(item.images) && item.images.length > 0
        ? item.images
        : [fallbackProductImg];
    const images = rawImages
      .map(function (src) {
        return sanitizeImageUrl(src, fallbackProductImg);
      })
      .filter(Boolean);
    if (images.length === 0 && fallbackProductImg) {
      images.push(fallbackProductImg);
    }

    function isCurrentUserAuthor(targetItem) {
      const authUser =
        global.HobakAuth && typeof global.HobakAuth.getUser === 'function'
          ? global.HobakAuth.getUser()
          : null;
      if (!authUser || !targetItem) return false;
      if (targetItem.anonSellerId && authUser.id && targetItem.anonSellerId === authUser.id) {
        return true;
      }
      const itemSellerName =
        targetItem.seller && targetItem.seller.name ? String(targetItem.seller.name).trim() : '';
      const userNick = authUser.nickname ? String(authUser.nickname).trim() : '';
      return Boolean(itemSellerName && userNick && itemSellerName === userNick);
    }

    const sellerName = (item.seller && item.seller.name) || '호박이웃';
    const defaultAvatar = (store && store.DEFAULT_AVATAR) || '';
    const sellerAvatar = sanitizeImageUrl(item.seller && item.seller.avatar, defaultAvatar);
    const mannerInfo = getMannerInfo(item.seller && item.seller.mannerTemp);
    const priceText = formatItemPrice(item);
    const isFree = Boolean(item.isFreeShare) || Number(item.price) === 0;
    const statusKey = getStatusKey(item.status);
    const isAuthor = isCurrentUserAuthor(item);
    const relatedItems = getRelatedItems(item);

    // 페이지 내부 상태 (carousel / modal / timers)
    let currentSlide = 0;
    let activeModalEl = null;
    let toastEl = null;
    let toastTimer = null;
    let chatReplyTimer = null;
    let likePopTimer = null;

    const pageEl = document.createElement('div');
    pageEl.className = 'hobak-detail-page';

    // 캐러셀 HTML 구성
    const slidesHtml = images
      .map(function (src, index) {
        return (
          '<div class="hobak-detail-carousel-slide" data-slide-index="' +
          index +
          '">' +
          '<img class="hobak-detail-carousel-img" src="' +
          escapeHtml(src) +
          '" alt="' +
          escapeHtml(item.title) +
          ' 이미지 ' +
          (index + 1) +
          '"/>' +
          '</div>'
        );
      })
      .join('');

    const navArrowsHtml =
      images.length > 1
        ? '<button type="button" class="hobak-detail-nav-btn hobak-detail-nav-btn--prev" aria-label="이전 이미지">' +
          createSvgIcon('chevron-left') +
          '</button>' +
          '<button type="button" class="hobak-detail-nav-btn hobak-detail-nav-btn--next" aria-label="다음 이미지">' +
          createSvgIcon('chevron-right') +
          '</button>'
        : '';

    const dotsHtml =
      images.length > 1
        ? '<div class="hobak-detail-dots" role="tablist" aria-label="상품 이미지 슬라이드">' +
          images
            .map(function (_, index) {
              return (
                '<button type="button" class="hobak-detail-dot' +
                (index === 0 ? ' hobak-detail-dot--active' : '') +
                '" data-dot-index="' +
                index +
                '" aria-label="' +
                (index + 1) +
                '번 이미지 보기" aria-selected="' +
                (index === 0 ? 'true' : 'false') +
                '"></button>'
              );
            })
            .join('') +
          '</div>'
        : '';

    const statusButtonsHtml = ['판매중', '예약중', '거래완료']
      .map(function (st) {
        const key = getStatusKey(st);
        const activeCls = item.status === st ? ' is-active' : '';
        return (
          '<button type="button" class="hobak-detail-status-btn hobak-detail-status-btn--' +
          key +
          activeCls +
          '" data-status="' +
          st +
          '" aria-pressed="' +
          (item.status === st ? 'true' : 'false') +
          '">' +
          st +
          '</button>'
        );
      })
      .join('');

    const recCardsHtml = relatedItems
      .map(function (rec) {
        const recThumb = sanitizeImageUrl(
          Array.isArray(rec.images) ? rec.images[0] : '',
          fallbackProductImg
        );
        const recPrice = formatItemPrice(rec);
        const recFree = Boolean(rec.isFreeShare) || Number(rec.price) === 0;
        const recBadge =
          rec.status && rec.status !== '판매중'
            ? '<span class="hobak-detail-rec-badge' +
              (rec.status === '예약중' ? ' hobak-detail-rec-badge--reserved' : '') +
              '">' +
              escapeHtml(rec.status) +
              '</span>'
            : '';
        return (
          '<button type="button" class="hobak-detail-rec-card" data-rec-id="' +
          escapeHtml(rec.id) +
          '">' +
          '  <div class="hobak-detail-rec-thumb-wrap">' +
          '    <img class="hobak-detail-rec-thumb" src="' +
          escapeHtml(recThumb) +
          '" alt="' +
          escapeHtml(rec.title) +
          '"/>' +
          recBadge +
          '  </div>' +
          '  <p class="hobak-detail-rec-name">' +
          escapeHtml(rec.title) +
          '</p>' +
          '  <p class="hobak-detail-rec-price' +
          (recFree ? ' hobak-detail-rec-price--free' : '') +
          '">' +
          escapeHtml(recPrice) +
          '</p>' +
          '  <p class="hobak-detail-rec-loc">' +
          escapeHtml(rec.shortLocation || rec.location || '') +
          '</p>' +
          '</button>'
        );
      })
      .join('');

    pageEl.innerHTML =
      '<article class="hobak-detail-card' +
      (item.status === '거래완료' ? ' hobak-detail-card--sold' : '') +
      '">' +
      '  <div class="hobak-detail-carousel" aria-label="상품 사진 갤러리">' +
      '    <div class="hobak-detail-carousel-track">' +
      slidesHtml +
      '    </div>' +
      '    <button type="button" class="hobak-detail-close-btn" aria-label="목록으로 닫기">' +
      createSvgIcon('close') +
      '    </button>' +
      '    <button type="button" class="hobak-detail-app-btn">앱에서 보기</button>' +
      navArrowsHtml +
      dotsHtml +
      '    <span class="hobak-detail-image-status-overlay"' +
      (item.status === '판매중' ? ' hidden' : '') +
      '>' +
      escapeHtml(item.status) +
      '</span>' +
      '  </div>' +
      '  <section class="hobak-detail-seller" aria-label="판매자 정보">' +
      '    <div class="hobak-detail-seller-left">' +
      '      <img class="hobak-detail-seller-avatar" src="' +
      escapeHtml(sellerAvatar) +
      '" alt="' +
      escapeHtml(sellerName) +
      ' 프로필"/>' +
      '      <div class="hobak-detail-seller-info">' +
      '        <p class="hobak-detail-seller-name">' +
      escapeHtml(sellerName) +
      '</p>' +
      '        <p class="hobak-detail-seller-location">' +
      escapeHtml(item.location || '') +
      '</p>' +
      '      </div>' +
      '    </div>' +
      '    <div class="hobak-detail-seller-right">' +
      '      <div class="hobak-detail-manner-row">' +
      '        <span class="hobak-detail-manner-temp">' +
      escapeHtml(mannerInfo.formatted) +
      '</span>' +
      '        <span class="hobak-detail-manner-emoji" aria-hidden="true">' +
      mannerInfo.emoji +
      '</span>' +
      '      </div>' +
      '      <button type="button" class="hobak-detail-manner-link">매너온도</button>' +
      '    </div>' +
      '  </section>' +
      '  <section class="hobak-detail-body">' +
      '    <div class="hobak-detail-status-bar">' +
      '      <span class="hobak-detail-status-readonly hobak-detail-status-readonly--' +
      statusKey +
      '"' +
      (isAuthor ? ' hidden' : '') +
      '>' +
      '        <span class="hobak-detail-status-dot hobak-detail-status-dot--' +
      statusKey +
      '"></span>' +
      '        <span class="hobak-detail-status-readonly-text">' +
      escapeHtml(item.status || '판매중') +
      '</span>' +
      '      </span>' +
      '      <div class="hobak-detail-status-btns" role="group" aria-label="거래 상태 변경"' +
      (isAuthor ? '' : ' hidden') +
      '>' +
      statusButtonsHtml +
      '      </div>' +
      '      <span class="hobak-detail-status-hint"' +
      (isAuthor ? '' : ' hidden') +
      '>내 게시글 상태 변경</span>' +
      '    </div>' +
      '    <h1 class="hobak-detail-title">' +
      escapeHtml(item.title) +
      '</h1>' +
      '    <div class="hobak-detail-meta">' +
      '      <button type="button" class="hobak-detail-category-link">' +
      escapeHtml(item.category || '기타 중고물품') +
      '</button>' +
      '      <span aria-hidden="true">·</span>' +
      '      <span>' +
      escapeHtml(item.timeAgo || '방금 전') +
      '</span>' +
      '    </div>' +
      '    <p class="hobak-detail-price' +
      (isFree ? ' hobak-detail-price--free' : '') +
      '">' +
      escapeHtml(priceText) +
      '</p>' +
      '    <p class="hobak-detail-description"></p>' +
      '    <p class="hobak-detail-stats"></p>' +
      '    <div class="hobak-detail-author-actions"' +
      (isAuthor ? '' : ' hidden') +
      '>' +
      '      <button type="button" class="hobak-detail-action-chip" data-action="edit">' +
      createSvgIcon('edit') +
      '        <span>수정하기</span>' +
      '      </button>' +
      '      <button type="button" class="hobak-detail-action-chip hobak-detail-action-chip--danger" data-action="delete">' +
      createSvgIcon('trash') +
      '        <span>삭제하기</span>' +
      '      </button>' +
      '    </div>' +
      '  </section>' +
      '  <footer class="hobak-detail-action-bar">' +
      '    <div class="hobak-detail-action-left">' +
      '      <button type="button" class="hobak-detail-like-btn' +
      (item.liked ? ' hobak-detail-like-btn--active' : '') +
      '" aria-label="관심 상품 등록" aria-pressed="' +
      (item.liked ? 'true' : 'false') +
      '">' +
      createSvgIcon(item.liked ? 'heart-filled' : 'heart-outline') +
      '      </button>' +
      '      <span class="hobak-detail-action-divider" aria-hidden="true"></span>' +
      '      <div class="hobak-detail-action-price-wrap">' +
      '        <div class="hobak-detail-action-price' +
      (isFree ? ' hobak-detail-action-price--free' : '') +
      '">' +
      escapeHtml(priceText) +
      '</div>' +
      '        <div class="hobak-detail-action-sub">' +
      escapeHtml(getActionSubText(item)) +
      '</div>' +
      '      </div>' +
      '    </div>' +
      '    <button type="button" class="hobak-detail-chat-btn">호박채팅</button>' +
      '  </footer>' +
      '</article>' +
      (relatedItems.length > 0
        ? '<section class="hobak-detail-rec-section" aria-label="이 동네 다른 상품">' +
          '  <div class="hobak-detail-rec-header">' +
          '    <h2 class="hobak-detail-rec-title">이 동네 다른 상품</h2>' +
          '    <button type="button" class="hobak-detail-rec-more">더 보기 ›</button>' +
          '  </div>' +
          '  <div class="hobak-detail-rec-grid">' +
          recCardsHtml +
          '  </div>' +
          '</section>'
        : '');

    // 줄바꿈(\n) 유지 및 안전한 텍스트 바인딩
    const descEl = pageEl.querySelector('.hobak-detail-description');
    if (descEl) {
      descEl.textContent = item.description || '';
    }

    const statsEl = pageEl.querySelector('.hobak-detail-stats');
    function refreshStatsDisplay() {
      if (!statsEl) return;
      const likes = Number(item.likes) || 0;
      const chats = Number(item.chats) || 0;
      const views = Number(item.views) || 0;
      statsEl.textContent = '관심 ' + likes + ' · 채팅 ' + chats + ' · 조회 ' + views;
    }
    refreshStatsDisplay();

    // DOM 참조 캐시
    const cardEl = pageEl.querySelector('.hobak-detail-card');
    const carouselEl = pageEl.querySelector('.hobak-detail-carousel');
    const trackEl = pageEl.querySelector('.hobak-detail-carousel-track');
    const dotEls = Array.from(pageEl.querySelectorAll('.hobak-detail-dot'));
    const prevBtn = pageEl.querySelector('.hobak-detail-nav-btn--prev');
    const nextBtn = pageEl.querySelector('.hobak-detail-nav-btn--next');
    const closeBtn = pageEl.querySelector('.hobak-detail-close-btn');
    const appBtn = pageEl.querySelector('.hobak-detail-app-btn');
    const mannerBtn = pageEl.querySelector('.hobak-detail-manner-link');
    const statusReadonlyEl = pageEl.querySelector('.hobak-detail-status-readonly');
    const statusReadonlyTextEl = pageEl.querySelector('.hobak-detail-status-readonly-text');
    const statusDotEl = pageEl.querySelector('.hobak-detail-status-dot');
    const statusBtnsWrapEl = pageEl.querySelector('.hobak-detail-status-btns');
    const statusBtnEls = Array.from(pageEl.querySelectorAll('.hobak-detail-status-btn'));
    const statusHintEl = pageEl.querySelector('.hobak-detail-status-hint');
    const authorActionsEl = pageEl.querySelector('.hobak-detail-author-actions');
    const imageStatusOverlayEl = pageEl.querySelector('.hobak-detail-image-status-overlay');
    const categoryLinkEl = pageEl.querySelector('.hobak-detail-category-link');
    const editBtn = pageEl.querySelector('[data-action="edit"]');
    const deleteBtn = pageEl.querySelector('[data-action="delete"]');
    const likeBtn = pageEl.querySelector('.hobak-detail-like-btn');
    const actionSubEl = pageEl.querySelector('.hobak-detail-action-sub');
    const chatBtn = pageEl.querySelector('.hobak-detail-chat-btn');
    const recMoreBtn = pageEl.querySelector('.hobak-detail-rec-more');
    const recCardEls = Array.from(pageEl.querySelectorAll('.hobak-detail-rec-card'));

    // 토스트 표시 헬퍼
    function showToast(message) {
      if (toastEl && toastEl.parentNode) {
        toastEl.parentNode.removeChild(toastEl);
      }
      if (toastTimer) {
        clearTimeout(toastTimer);
        toastTimer = null;
      }
      toastEl = document.createElement('div');
      toastEl.className = 'hobak-detail-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.textContent = message;
      pageEl.appendChild(toastEl);

      toastTimer = setTimeout(function () {
        if (toastEl && toastEl.parentNode) {
          toastEl.parentNode.removeChild(toastEl);
        }
        toastEl = null;
      }, 2200);
    }

    // 모달 열기/닫기 헬퍼
    function closeModal() {
      if (chatReplyTimer) {
        clearTimeout(chatReplyTimer);
        chatReplyTimer = null;
      }
      if (activeModalEl && activeModalEl.parentNode) {
        activeModalEl.parentNode.removeChild(activeModalEl);
      }
      activeModalEl = null;
    }

    function openModal(modalInnerEl, extraModalClass) {
      closeModal();
      const backdrop = document.createElement('div');
      backdrop.className = 'hobak-detail-modal-backdrop';
      backdrop.setAttribute('role', 'dialog');
      backdrop.setAttribute('aria-modal', 'true');

      if (extraModalClass === 'lightbox') {
        backdrop.appendChild(modalInnerEl);
      } else {
        const dialog = document.createElement('div');
        dialog.className = 'hobak-detail-modal' + (extraModalClass ? ' ' + extraModalClass : '');
        dialog.appendChild(modalInnerEl);
        backdrop.appendChild(dialog);
      }

      backdrop.addEventListener('click', function (e) {
        if (e.target === backdrop) {
          closeModal();
        }
      });

      pageEl.appendChild(backdrop);
      activeModalEl = backdrop;
      return backdrop;
    }

    // 캐러셀 슬라이드 전환
    function goToSlide(nextIndex) {
      if (images.length <= 1 || !trackEl) return;
      currentSlide = ((nextIndex % images.length) + images.length) % images.length;
      trackEl.style.transform = 'translateX(-' + currentSlide * 100 + '%)';

      dotEls.forEach(function (dot, idx) {
        const active = idx === currentSlide;
        dot.classList.toggle('hobak-detail-dot--active', active);
        dot.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        goToSlide(currentSlide - 1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        goToSlide(currentSlide + 1);
      });
    }

    dotEls.forEach(function (dot) {
      dot.addEventListener('click', function (e) {
        e.stopPropagation();
        const idx = Number(dot.getAttribute('data-dot-index'));
        if (!Number.isNaN(idx)) {
          goToSlide(idx);
        }
      });
    });

    // 모바일 스와이프 지원
    let touchStartX = null;
    if (carouselEl && images.length > 1) {
      carouselEl.addEventListener(
        'touchstart',
        function (e) {
          if (e.touches && e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
          }
        },
        { passive: true }
      );

      carouselEl.addEventListener(
        'touchend',
        function (e) {
          if (touchStartX === null || !e.changedTouches || !e.changedTouches.length) return;
          const deltaX = e.changedTouches[0].clientX - touchStartX;
          touchStartX = null;
          if (Math.abs(deltaX) > 40) {
            goToSlide(deltaX < 0 ? currentSlide + 1 : currentSlide - 1);
          }
        },
        { passive: true }
      );
    }

    // 이미지 클릭 시 라이트박스 확대 보기
    Array.from(pageEl.querySelectorAll('.hobak-detail-carousel-slide')).forEach(function (slide) {
      slide.addEventListener('click', function () {
        const idx = Number(slide.getAttribute('data-slide-index')) || 0;
        const wrap = document.createDocumentFragment();
        const img = document.createElement('img');
        img.className = 'hobak-detail-lightbox-img';
        img.src = images[idx] || images[0];
        img.alt = item.title;

        const lbClose = document.createElement('button');
        lbClose.type = 'button';
        lbClose.className = 'hobak-detail-lightbox-close';
        lbClose.setAttribute('aria-label', '이미지 확대 닫기');
        lbClose.innerHTML = createSvgIcon('close');
        lbClose.addEventListener('click', closeModal);

        wrap.appendChild(img);
        wrap.appendChild(lbClose);
        openModal(wrap, 'lightbox');
      });
    });

    // 닫기 버튼 -> 목록 이동
    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        navigateTo('list');
      });
    }

    // 앱에서 보기 버튼 -> 호박 앱 QR/링크 모달
    if (appBtn) {
      appBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const wrap = document.createDocumentFragment();

        const header = document.createElement('div');
        header.className = 'hobak-detail-modal-header';
        header.innerHTML =
          '<div class="hobak-detail-modal-title-wrap">' +
          '  <h3 class="hobak-detail-modal-title">호박(Hobak) 앱에서 보기</h3>' +
          '</div>' +
          '<button type="button" class="hobak-detail-modal-close" aria-label="모달 닫기">' +
          createSvgIcon('close') +
          '</button>';
        header.querySelector('.hobak-detail-modal-close').addEventListener('click', closeModal);

        const body = document.createElement('div');
        body.className = 'hobak-detail-modal-body hobak-detail-app-modal-content';
        body.innerHTML =
          '<div class="hobak-detail-app-qr-box">' +
          createSvgIcon('qr') +
          '</div>' +
          '<p class="hobak-detail-app-subtitle">QR코드를 스캔해 호박 앱을 실행하세요</p>' +
          '<p class="hobak-detail-app-desc">' +
          '호박 앱에서는 실시간 채팅 푸시 알림, 동네 인증 배지,<br/>원하는 키워드 알림을 바로 받아볼 수 있어요.' +
          '</p>';

        const footer = document.createElement('div');
        footer.className = 'hobak-detail-modal-footer';
        footer.innerHTML =
          '<button type="button" class="hobak-detail-secondary-btn" data-app-copy>링크 복사</button>' +
          '<button type="button" class="hobak-detail-primary-btn" data-app-ok>확인</button>';

        footer.querySelector('[data-app-copy]').addEventListener('click', function () {
          const shareUrl = global.location ? global.location.href : 'https://hobak.market/' + item.id;
          if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) {
            global.navigator.clipboard.writeText(shareUrl).catch(function () {});
          }
          closeModal();
          showToast('상품 링크를 복사했어요!');
        });
        footer.querySelector('[data-app-ok]').addEventListener('click', closeModal);

        wrap.appendChild(header);
        wrap.appendChild(body);
        wrap.appendChild(footer);
        openModal(wrap);
      });
    }

    // 매너온도 설명 모달
    if (mannerBtn) {
      mannerBtn.addEventListener('click', function () {
        const wrap = document.createDocumentFragment();
        const gaugePercent = Math.min(100, Math.max(8, ((mannerInfo.value - 20) / 45) * 100));

        const header = document.createElement('div');
        header.className = 'hobak-detail-modal-header';
        header.innerHTML =
          '<div class="hobak-detail-modal-title-wrap">' +
          '  <h3 class="hobak-detail-modal-title">매너온도란?</h3>' +
          '</div>' +
          '<button type="button" class="hobak-detail-modal-close" aria-label="모달 닫기">' +
          createSvgIcon('close') +
          '</button>';
        header.querySelector('.hobak-detail-modal-close').addEventListener('click', closeModal);

        const body = document.createElement('div');
        body.className = 'hobak-detail-modal-body';
        body.innerHTML =
          '<div class="hobak-detail-manner-card">' +
          '  <div class="hobak-detail-manner-card-top">' +
          '    <strong>' +
          escapeHtml(sellerName) +
          '님의 매너온도</strong>' +
          '    <span class="hobak-detail-manner-card-score">' +
          escapeHtml(mannerInfo.formatted) +
          ' ' +
          mannerInfo.emoji +
          '</span>' +
          '  </div>' +
          '  <div class="hobak-detail-manner-gauge-wrap">' +
          '    <div class="hobak-detail-manner-gauge-labels">' +
          '      <span>첫 온도 36.5°C</span>' +
          '      <span>따뜻한 이웃</span>' +
          '    </div>' +
          '    <div class="hobak-detail-manner-gauge-bar">' +
          '      <div class="hobak-detail-manner-gauge-fill" style="width: ' +
          gaugePercent.toFixed(1) +
          '%"></div>' +
          '    </div>' +
          '  </div>' +
          '</div>' +
          '<p class="hobak-detail-manner-desc">' +
          '매너온도는 호박 사용자들로부터 받은 거래 후기, 매너 평가, 비매너 지표 등을 종합해서 만든 따뜻한 신뢰 지표예요. 36.5°C에서 시작해 좋은 거래가 쌓일수록 온도가 올라갑니다.' +
          '</p>' +
          '<div class="hobak-detail-manner-badges">' +
          '  <span class="hobak-detail-manner-badge">😊 친절하고 매너가 좋아요</span>' +
          '  <span class="hobak-detail-manner-badge">⏰ 시간 약속을 잘 지켜요</span>' +
          '  <span class="hobak-detail-manner-badge">💬 응답이 빨라요</span>' +
          '</div>';

        const footer = document.createElement('div');
        footer.className = 'hobak-detail-modal-footer';
        footer.innerHTML = '<button type="button" class="hobak-detail-primary-btn">닫기</button>';
        footer.querySelector('button').addEventListener('click', closeModal);

        wrap.appendChild(header);
        wrap.appendChild(body);
        wrap.appendChild(footer);
        openModal(wrap);
      });
    }

    function syncAuthorVisibility() {
      const authorNow = isCurrentUserAuthor(item);
      if (statusReadonlyEl) statusReadonlyEl.hidden = authorNow;
      if (statusBtnsWrapEl) statusBtnsWrapEl.hidden = !authorNow;
      if (statusHintEl) statusHintEl.hidden = !authorNow;
      if (authorActionsEl) authorActionsEl.hidden = !authorNow;
    }

    // 거래 상태 변경 (판매중 / 예약중 / 거래완료) -> Supabase 즉시 업데이트
    statusBtnEls.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!isCurrentUserAuthor(item)) return;
        const nextStatus = btn.getAttribute('data-status');
        if (!nextStatus || item.status === nextStatus) return;

        if (store && typeof store.updateItem === 'function') {
          const updated = store.updateItem(item.id, { status: nextStatus });
          if (updated) {
            item = updated;
          } else {
            item.status = nextStatus;
          }
        } else {
          item.status = nextStatus;
        }

        const nextKey = getStatusKey(item.status);
        statusBtnEls.forEach(function (b) {
          const isMatch = b.getAttribute('data-status') === item.status;
          b.classList.toggle('is-active', isMatch);
          b.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
        });

        if (statusReadonlyEl) {
          statusReadonlyEl.className =
            'hobak-detail-status-readonly hobak-detail-status-readonly--' + nextKey;
        }
        if (statusReadonlyTextEl) {
          statusReadonlyTextEl.textContent = item.status;
        }
        if (statusDotEl) {
          statusDotEl.className = 'hobak-detail-status-dot hobak-detail-status-dot--' + nextKey;
        }
        if (cardEl) {
          cardEl.classList.toggle('hobak-detail-card--sold', item.status === '거래완료');
        }
        if (imageStatusOverlayEl) {
          imageStatusOverlayEl.textContent = item.status;
          imageStatusOverlayEl.hidden = item.status === '판매중';
        }
        if (actionSubEl) {
          actionSubEl.textContent = getActionSubText(item);
        }
        showToast("거래 상태를 '" + item.status + "'(으)로 변경했어요");
      });
    });

    // 카테고리 링크 -> 해당 카테고리 목록으로 이동
    if (categoryLinkEl) {
      categoryLinkEl.addEventListener('click', function () {
        navigateTo('list', { category: item.category });
      });
    }

    // 수정하기 -> 글쓰기 페이지 (editId 전달)
    if (editBtn) {
      editBtn.addEventListener('click', function () {
        navigateTo('write', { editId: item.id });
      });
    }

    // 삭제하기 -> 확인 모달 후 deleteItem & 목록 이동
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function () {
        const wrap = document.createDocumentFragment();

        const header = document.createElement('div');
        header.className = 'hobak-detail-modal-header';
        header.innerHTML =
          '<div class="hobak-detail-modal-title-wrap">' +
          '  <h3 class="hobak-detail-modal-title">게시글 삭제</h3>' +
          '</div>' +
          '<button type="button" class="hobak-detail-modal-close" aria-label="모달 닫기">' +
          createSvgIcon('close') +
          '</button>';
        header.querySelector('.hobak-detail-modal-close').addEventListener('click', closeModal);

        const body = document.createElement('div');
        body.className = 'hobak-detail-modal-body';
        body.innerHTML =
          '<p style="margin:0; font-size:15px; color:#212124; line-height:1.6;">' +
          '<strong>' +
          escapeHtml(item.title) +
          '</strong> 게시글을 정말 삭제할까요?<br/>' +
          '<span style="font-size:13.5px; color:#5e626b;">삭제된 게시글은 다시 복구할 수 없어요.</span>' +
          '</p>';

        const footer = document.createElement('div');
        footer.className = 'hobak-detail-modal-footer';
        footer.innerHTML =
          '<button type="button" class="hobak-detail-secondary-btn" data-delete-cancel>취소</button>' +
          '<button type="button" class="hobak-detail-danger-btn" data-delete-confirm>삭제하기</button>';

        footer.querySelector('[data-delete-cancel]').addEventListener('click', closeModal);
        footer.querySelector('[data-delete-confirm]').addEventListener('click', function () {
          if (store && typeof store.deleteItem === 'function') {
            store.deleteItem(item.id);
          }
          closeModal();
          navigateTo('list');
        });

        wrap.appendChild(header);
        wrap.appendChild(body);
        wrap.appendChild(footer);
        openModal(wrap);
      });
    }

    // 관심(하트) 토글
    if (likeBtn) {
      likeBtn.addEventListener('click', function () {
        if (store && typeof store.toggleLike === 'function') {
          const updated = store.toggleLike(item.id);
          if (updated) {
            item = updated;
          }
        } else {
          item.liked = !item.liked;
          item.likes = Math.max(0, (item.likes || 0) + (item.liked ? 1 : -1));
        }

        likeBtn.classList.toggle('hobak-detail-like-btn--active', Boolean(item.liked));
        likeBtn.setAttribute('aria-pressed', item.liked ? 'true' : 'false');
        likeBtn.innerHTML = createSvgIcon(item.liked ? 'heart-filled' : 'heart-outline');

        likeBtn.classList.add('hobak-detail-like-btn--pop');
        if (likePopTimer) clearTimeout(likePopTimer);
        likePopTimer = setTimeout(function () {
          likeBtn.classList.remove('hobak-detail-like-btn--pop');
        }, 180);

        refreshStatsDisplay();
        showToast(item.liked ? '관심 목록에 추가했어요 🧡' : '관심 목록에서 해제했어요');
      });
    }

    // 호박채팅 모달 열기
    function openChatModal() {
      if (!chatHistoryStore[item.id]) {
        chatHistoryStore[item.id] = [];
      }
      const messages = chatHistoryStore[item.id];
      const wrap = document.createDocumentFragment();

      const header = document.createElement('div');
      header.className = 'hobak-detail-modal-header';
      header.innerHTML =
        '<div class="hobak-detail-modal-title-wrap">' +
        '  <img class="hobak-detail-chat-seller-avatar" src="' +
        escapeHtml(sellerAvatar) +
        '" alt="' +
        escapeHtml(sellerName) +
        '"/>' +
        '  <h3 class="hobak-detail-modal-title">' +
        escapeHtml(sellerName) +
        '</h3>' +
        '  <span class="hobak-detail-chat-temp-pill">' +
        escapeHtml(mannerInfo.formatted) +
        '</span>' +
        '</div>' +
        '<button type="button" class="hobak-detail-modal-close" aria-label="채팅 닫기">' +
        createSvgIcon('close') +
        '</button>';
      header.querySelector('.hobak-detail-modal-close').addEventListener('click', closeModal);

      const strip = document.createElement('div');
      strip.className = 'hobak-detail-chat-item-strip';
      strip.innerHTML =
        '<img class="hobak-detail-chat-item-thumb" src="' +
        escapeHtml(images[0] || '') +
        '" alt=""/>' +
        '<div class="hobak-detail-chat-item-info">' +
        '  <p class="hobak-detail-chat-item-title">' +
        escapeHtml(item.title) +
        '</p>' +
        '  <p class="hobak-detail-chat-item-price">' +
        escapeHtml(formatItemPrice(item)) +
        ' · ' +
        escapeHtml(item.status || '판매중') +
        '</p>' +
        '</div>';

      const msgBox = document.createElement('div');
      msgBox.className = 'hobak-detail-chat-messages';

      function appendMessageNode(msg) {
        const row = document.createElement('div');
        row.className =
          'hobak-detail-chat-row hobak-detail-chat-row--' + (msg.sender === 'me' ? 'me' : 'seller');

        if (msg.sender === 'seller') {
          const av = document.createElement('img');
          av.className = 'hobak-detail-chat-msg-avatar';
          av.src = sellerAvatar;
          av.alt = sellerName;
          row.appendChild(av);
        }

        const bubble = document.createElement('div');
        bubble.className =
          'hobak-detail-chat-bubble hobak-detail-chat-bubble--' +
          (msg.sender === 'me' ? 'me' : 'seller');
        bubble.textContent = msg.text;

        const time = document.createElement('span');
        time.className = 'hobak-detail-chat-time';
        time.textContent = msg.time;

        row.appendChild(bubble);
        row.appendChild(time);
        msgBox.appendChild(row);
      }

      const notice = document.createElement('div');
      notice.className = 'hobak-detail-chat-notice';
      notice.textContent = sellerName + '님과의 호박채팅이에요. 따뜻한 거래를 시작해 보세요!';
      msgBox.appendChild(notice);

      messages.forEach(appendMessageNode);

      if (
        messages.length === 0 &&
        store &&
        typeof store.fetchChatMessages === 'function'
      ) {
        store.fetchChatMessages(item.id).then(function (remoteMsgs) {
          if (!msgBox.isConnected || !Array.isArray(remoteMsgs) || remoteMsgs.length === 0) return;
          if (messages.length > 0) return;
          remoteMsgs.forEach(function (rm) {
            messages.push(rm);
            appendMessageNode(rm);
          });
          scrollChatToBottom();
        });
      }

      const chipsBar = document.createElement('div');
      chipsBar.className = 'hobak-detail-chat-chips';
      const quickTexts = [
        '안녕하세요! 아직 거래 가능한가요?',
        (item.shortLocation || '동네') + ' 직거래 어디서 가능할까요?',
        '오늘 저녁에 거래 가능할까요?'
      ];
      quickTexts.forEach(function (qText) {
        const chipBtn = document.createElement('button');
        chipBtn.type = 'button';
        chipBtn.className = 'hobak-detail-chat-chip';
        chipBtn.textContent = qText;
        chipBtn.addEventListener('click', function () {
          sendChatMessage(qText);
        });
        chipsBar.appendChild(chipBtn);
      });

      const form = document.createElement('form');
      form.className = 'hobak-detail-chat-form';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'hobak-detail-chat-input';
      input.placeholder = '메시지를 입력하세요';
      input.maxLength = 200;

      const sendBtn = document.createElement('button');
      sendBtn.type = 'submit';
      sendBtn.className = 'hobak-detail-chat-send';
      sendBtn.textContent = '전송';
      sendBtn.disabled = true;

      input.addEventListener('input', function () {
        sendBtn.disabled = input.value.trim().length === 0;
      });

      function scrollChatToBottom() {
        msgBox.scrollTop = msgBox.scrollHeight;
      }

      function sendChatMessage(rawText) {
        const text = String(rawText || '').trim();
        if (!text) return;

        const myMsg = {
          sender: 'me',
          text: text,
          time: formatCurrentTime()
        };
        messages.push(myMsg);
        appendMessageNode(myMsg);
        input.value = '';
        sendBtn.disabled = true;
        scrollChatToBottom();

        if (store && typeof store.recordChatMessage === 'function') {
          store.recordChatMessage(item.id, 'buyer', text);
        }

        // 채팅 수 1 증가 및 상세 통계 즉시 반영
        const nextChats = (Number(item.chats) || 0) + 1;
        if (store && typeof store.updateItem === 'function') {
          const updated = store.updateItem(item.id, { chats: nextChats });
          if (updated) {
            item = updated;
          } else {
            item.chats = nextChats;
          }
        } else {
          item.chats = nextChats;
        }
        refreshStatsDisplay();

        // 기존 대기 중 응답이 있으면 취소 후 새로 응답
        if (chatReplyTimer) {
          clearTimeout(chatReplyTimer);
          chatReplyTimer = null;
        }
        const existingTyping = msgBox.querySelector('.hobak-detail-chat-typing');
        if (existingTyping && existingTyping.parentNode) {
          existingTyping.parentNode.removeChild(existingTyping);
        }

        const typingEl = document.createElement('div');
        typingEl.className = 'hobak-detail-chat-typing';
        typingEl.textContent = sellerName + '님이 입력 중...';
        msgBox.appendChild(typingEl);
        scrollChatToBottom();

        chatReplyTimer = setTimeout(function () {
          chatReplyTimer = null;
          if (!msgBox.isConnected) return;
          if (typingEl.parentNode) {
            typingEl.parentNode.removeChild(typingEl);
          }
          const replyMsg = {
            sender: 'seller',
            text: getSellerAutoReply(text, item),
            time: formatCurrentTime()
          };
          messages.push(replyMsg);
          appendMessageNode(replyMsg);
          scrollChatToBottom();
          if (store && typeof store.recordChatMessage === 'function') {
            store.recordChatMessage(item.id, 'seller', replyMsg.text);
          }
        }, 620);
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        sendChatMessage(input.value);
      });

      form.appendChild(input);
      form.appendChild(sendBtn);

      wrap.appendChild(header);
      wrap.appendChild(strip);
      wrap.appendChild(msgBox);
      wrap.appendChild(chipsBar);
      wrap.appendChild(form);

      openModal(wrap, 'hobak-detail-modal--chat');
      scrollChatToBottom();
      setTimeout(function () {
        if (input.isConnected) input.focus();
      }, 40);
    }

    if (chatBtn) {
      chatBtn.addEventListener('click', openChatModal);
    }

    // 추천 상품 및 더 보기 이동
    if (recMoreBtn) {
      recMoreBtn.addEventListener('click', function () {
        navigateTo('list');
      });
    }

    recCardEls.forEach(function (card) {
      card.addEventListener('click', function () {
        const recId = card.getAttribute('data-rec-id');
        if (recId) {
          if (typeof global.scrollTo === 'function') {
            global.scrollTo({ top: 0, behavior: 'smooth' });
          }
          navigateTo('detail', { id: recId });
        }
      });
    });

    // 키보드 단축키 (ESC 모달 닫기, 좌/우 슬라이드)
    function handleKeyDown(e) {
      if (!pageEl.isConnected) {
        document.removeEventListener('keydown', handleKeyDown);
        return;
      }
      if (e.key === 'Escape' && activeModalEl) {
        closeModal();
        return;
      }
      if (!activeModalEl && images.length > 1) {
        const tag = e.target && e.target.tagName ? e.target.tagName.toUpperCase() : '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (e.key === 'ArrowLeft') {
          goToSlide(currentSlide - 1);
        } else if (e.key === 'ArrowRight') {
          goToSlide(currentSlide + 1);
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    global.addEventListener('hobak:auth-changed', syncAuthorVisibility);

    container._hobakDetailCleanup = function () {
      document.removeEventListener('keydown', handleKeyDown);
      global.removeEventListener('hobak:auth-changed', syncAuthorVisibility);
      if (toastTimer) clearTimeout(toastTimer);
      if (chatReplyTimer) clearTimeout(chatReplyTimer);
      if (likePopTimer) clearTimeout(likePopTimer);
    };

    container.innerHTML = '';
    container.appendChild(pageEl);
  }

  global.HobakDetailPage = {
    render: render
  };
})(window);
