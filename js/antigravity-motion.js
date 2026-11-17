/**
 * 호박(Hobak) - Antigravity Design Expert 모션 & 공간 인터랙션 엔진
 * 참고: sickn33/agentic-awesome-skills -> skills/antigravity-design-expert/SKILL.md
 * - Weightlessness: 무중력 부양 & 스태거 진입
 * - Spatial Depth: CSS Perspective 3D 틸트 (rotateX, rotateY, translateZ) & 스페큘러 광택
 * - Isometric Snapping: 3D 아이소메트릭 그리드 스냅 모드 토글
 * - Never snap instantly & Reduced Motion 존중
 */
(function (global) {
  'use strict';

  var STORAGE_ISO_KEY = 'hobak_ag_isometric_v1';
  var isIsometricMode = false;
  var observer = null;
  var mutationObserver = null;
  var reduceMotionQuery =
    typeof global.matchMedia === 'function'
      ? global.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

  function prefersReducedMotion() {
    return Boolean(reduceMotionQuery && reduceMotionQuery.matches);
  }

  function loadIsometricPreference() {
    try {
      return global.localStorage.getItem(STORAGE_ISO_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function saveIsometricPreference(val) {
    try {
      global.localStorage.setItem(STORAGE_ISO_KEY, val ? '1' : '0');
    } catch (e) {
      // ignore
    }
  }

  function syncIsometricUI() {
    var body = document.body;
    if (body) {
      body.classList.toggle('hobak-ag-isometric', isIsometricMode);
    }

    var grids = document.querySelectorAll('.hobak-list-grid');
    grids.forEach(function (grid) {
      grid.classList.toggle('is-isometric-grid', isIsometricMode);
    });

    var toggleBtns = document.querySelectorAll('[data-ag-isometric-toggle]');
    toggleBtns.forEach(function (btn) {
      btn.classList.toggle('is-active', isIsometricMode);
      btn.setAttribute('aria-pressed', isIsometricMode ? 'true' : 'false');
    });
  }

  function toggleIsometric(forceState) {
    isIsometricMode = typeof forceState === 'boolean' ? forceState : !isIsometricMode;
    saveIsometricPreference(isIsometricMode);
    syncIsometricUI();

    if (global.HobakApp && typeof global.HobakApp.showToast === 'function') {
      global.HobakApp.showToast(
        isIsometricMode
          ? '3D 아이소메트릭 공간 뷰가 활성화되었어요 🌌'
          : '기본 플로팅 뷰로 전환되었어요 🎃'
      );
    }
    return isIsometricMode;
  }

  function bind3DTilt(el, options) {
    if (!el || el.dataset.agTiltBound === '1') return;
    el.dataset.agTiltBound = '1';
    el.classList.add('hobak-ag-tilt-surface');

    var maxTilt = (options && options.maxTilt) || 7;
    var liftZ = (options && options.liftZ) || 14;
    var rafId = null;

    function applyTransform(rx, ry, tz, gx, gy, active) {
      el.style.setProperty('--ag-rx', rx.toFixed(2) + 'deg');
      el.style.setProperty('--ag-ry', ry.toFixed(2) + 'deg');
      el.style.setProperty('--ag-tz', tz.toFixed(1) + 'px');
      el.style.setProperty('--ag-glare-x', gx.toFixed(1) + '%');
      el.style.setProperty('--ag-glare-y', gy.toFixed(1) + '%');
      el.classList.toggle('is-ag-tilting', active);
    }

    el.addEventListener('pointermove', function (e) {
      if (prefersReducedMotion()) return;
      if (e.pointerType === 'touch') return;
      // 모달이 열린 상태이거나 입력 컨트롤 위에서는 틸트 과잉 방지
      if (el.closest('.hobak-detail-page') && document.querySelector('.hobak-detail-modal-backdrop')) {
        return;
      }

      var rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      var relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      var relY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      var ry = (relX - 0.5) * 2 * maxTilt;
      var rx = (0.5 - relY) * 2 * maxTilt;
      var gx = relX * 100;
      var gy = relY * 100;

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(function () {
        applyTransform(rx, ry, liftZ, gx, gy, true);
      });
    });

    el.addEventListener('pointerleave', function () {
      if (rafId) cancelAnimationFrame(rafId);
      applyTransform(0, 0, 0, 50, 50, false);
    });
  }

  function ensureRevealObserver() {
    if (observer || typeof global.IntersectionObserver !== 'function') return;
    observer = new global.IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-ag-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.06, rootMargin: '0px 0px -12px 0px' }
    );
  }

  function bindScrollReveal(elements) {
    var reduced = prefersReducedMotion();
    ensureRevealObserver();

    elements.forEach(function (el, idx) {
      if (!el || el.dataset.agRevealBound === '1') return;
      el.dataset.agRevealBound = '1';
      el.classList.add('hobak-ag-reveal');
      el.style.setProperty('--ag-stagger-delay', Math.min(idx * 45, 360) + 'ms');

      if (reduced || !observer) {
        el.classList.add('is-ag-visible');
      } else {
        // 초기 뷰포트 상단 요소는 지연 없이 자연스럽게 즉시 부양
        var rect = el.getBoundingClientRect();
        if (rect.top < (global.innerHeight || 900) * 0.95) {
          requestAnimationFrame(function () {
            el.classList.add('is-ag-visible');
          });
        } else {
          observer.observe(el);
        }
      }
    });
  }

  function refresh(root) {
    var scope = root && typeof root.querySelectorAll === 'function' ? root : document;

    // 1. 목록 페이지 카드 & 사이드바 3D 틸트 + 스태거 부양
    var listCards = Array.from(scope.querySelectorAll('.hobak-list-card'));
    listCards.forEach(function (card) {
      bind3DTilt(card, { maxTilt: 6.5, liftZ: 16 });
    });
    bindScrollReveal(listCards);

    var sidebarCards = Array.from(
      scope.querySelectorAll('.hobak-list-sidebar-card, .hobak-list-sell-card')
    );
    sidebarCards.forEach(function (card) {
      bind3DTilt(card, { maxTilt: 4, liftZ: 10 });
    });
    bindScrollReveal(sidebarCards);

    // 2. 상세 페이지 카드 & 추천 카드
    var detailRecCards = Array.from(scope.querySelectorAll('.hobak-detail-rec-card'));
    detailRecCards.forEach(function (card) {
      bind3DTilt(card, { maxTilt: 6, liftZ: 12 });
    });

    var detailMainSurfaces = Array.from(
      scope.querySelectorAll('.hobak-detail-card, .hobak-detail-rec-section, .hobak-detail-not-found')
    );
    bindScrollReveal(detailMainSurfaces);

    // 3. 글쓰기 페이지 카드
    var writeSurfaces = Array.from(scope.querySelectorAll('.hobak-write-card'));
    bindScrollReveal(writeSurfaces);

    syncIsometricUI();
  }

  function setupMutationWatcher() {
    var target = document.getElementById('hobak-view-container');
    if (!target || mutationObserver || typeof global.MutationObserver !== 'function') return;

    var pending = false;
    mutationObserver = new global.MutationObserver(function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        refresh(target);
      });
    });
    mutationObserver.observe(target, { childList: true, subtree: true });
  }

  function init() {
    isIsometricMode = loadIsometricPreference();
    setupMutationWatcher();
    refresh(document);

    if (reduceMotionQuery && typeof reduceMotionQuery.addEventListener === 'function') {
      reduceMotionQuery.addEventListener('change', function () {
        if (prefersReducedMotion()) {
          document.querySelectorAll('.hobak-ag-reveal').forEach(function (el) {
            el.classList.add('is-ag-visible');
          });
        }
      });
    }
  }

  global.HobakAntigravity = {
    init: init,
    refresh: refresh,
    toggleIsometric: toggleIsometric,
    isIsometric: function () {
      return isIsometricMode;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
