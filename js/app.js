/**
 * 호박(Hobak) 중고거래 웹서비스 - 메인 애플리케이션 통합 라우터 & 컨트롤러
 * - HobakListPage, HobakDetailPage, HobakWritePage를 하나의 SPA로 통합
 * - 글로벌 헤더 검색, 네비게이션 탭, 해시 라우팅(#list, #detail/:id, #write, #edit/:id), 토스트 관리
 */
(function (global) {
  'use strict';

  var mainEl = null;
  var viewContainerEl = null;
  var searchInputEl = null;
  var searchClearEl = null;
  var toastEl = null;
  var toastTimer = null;

  var appState = {
    route: 'list',
    params: {},
    activeNavTab: 'used',
    listState: {
      query: '',
      category: '전체',
      location: '',
      onlyAvailable: false,
      sort: 'latest',
      page: 1,
      pageSize: 12
    }
  };

  function showToast(message) {
    if (!toastEl) {
      toastEl = document.getElementById('hobak-global-toast');
    }
    if (!toastEl || !message) return;

    toastEl.textContent = message;
    toastEl.classList.add('show');

    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('show');
    }, 2600);
  }

  function syncSearchBar() {
    if (!searchInputEl) return;
    var q = appState.listState.query || '';
    if (searchInputEl.value !== q) {
      searchInputEl.value = q;
    }
    if (searchClearEl) {
      if (q.length > 0) {
        searchClearEl.classList.add('visible');
      } else {
        searchClearEl.classList.remove('visible');
      }
    }
  }

  function syncNavPills() {
    var pills = document.querySelectorAll('.hobak-nav-pill[data-nav]');
    pills.forEach(function (pill) {
      var key = pill.getAttribute('data-nav');
      if (key === appState.activeNavTab) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  }

  function buildHash(route, params) {
    if (route === 'detail' && params && params.id) {
      return '#detail/' + encodeURIComponent(params.id);
    }
    if (route === 'write') {
      if (params && params.editId) {
        return '#edit/' + encodeURIComponent(params.editId);
      }
      return '#write';
    }
    return '#list';
  }

  function parseHash(hashStr) {
    var raw = (hashStr || '').replace(/^#/, '').trim();
    if (!raw || raw === 'list') {
      return { route: 'list', params: {} };
    }
    if (raw === 'write') {
      return { route: 'write', params: {} };
    }
    if (raw.indexOf('detail/') === 0) {
      var id = decodeURIComponent(raw.slice('detail/'.length));
      return { route: 'detail', params: { id: id } };
    }
    if (raw.indexOf('edit/') === 0) {
      var editId = decodeURIComponent(raw.slice('edit/'.length));
      return { route: 'write', params: { editId: editId } };
    }
    return { route: 'list', params: {} };
  }

  function cleanupCurrentView() {
    if (!viewContainerEl) return;
    if (typeof viewContainerEl._hobakDetailCleanup === 'function') {
      try {
        viewContainerEl._hobakDetailCleanup();
      } catch (e) {
        // ignore cleanup errors
      }
      viewContainerEl._hobakDetailCleanup = null;
    }
    if (typeof viewContainerEl._hobakWriteCleanup === 'function') {
      try {
        viewContainerEl._hobakWriteCleanup();
      } catch (e) {
        // ignore cleanup errors
      }
      viewContainerEl._hobakWriteCleanup = null;
    }
  }

  function renderCurrentRoute() {
    if (!viewContainerEl) return;

    cleanupCurrentView();

    if (mainEl) {
      if (appState.route === 'detail' || appState.route === 'write') {
        mainEl.classList.add('is-card-view');
      } else {
        mainEl.classList.remove('is-card-view');
      }
    }

    syncSearchBar();
    syncNavPills();

    if (appState.route === 'detail' && global.HobakDetailPage) {
      global.HobakDetailPage.render(viewContainerEl, appState.params);
    } else if (appState.route === 'write' && global.HobakWritePage) {
      global.HobakWritePage.render(viewContainerEl, appState.params);
    } else if (global.HobakListPage) {
      var listRenderState = Object.assign({}, appState.listState, {
        onStateChange: function (nextListState) {
          if (!nextListState || typeof nextListState !== 'object') return;
          appState.listState = Object.assign({}, appState.listState, nextListState);
          syncSearchBar();
        }
      });
      global.HobakListPage.render(viewContainerEl, listRenderState);
    }

    if (global.HobakAntigravity && typeof global.HobakAntigravity.refresh === 'function') {
      global.HobakAntigravity.refresh(viewContainerEl);
    }
  }

  function syncAuthHeaderUI() {
    var loginBtn = document.getElementById('hobak-login-btn');
    var nickEl = document.getElementById('hobak-user-nickname-btn');
    var logoutBtn = document.getElementById('hobak-logout-btn');
    var user =
      global.HobakAuth && typeof global.HobakAuth.getUser === 'function'
        ? global.HobakAuth.getUser()
        : null;
    var loggedIn = Boolean(user && user.nickname);

    if (loginBtn) {
      loginBtn.hidden = loggedIn;
    }
    if (nickEl) {
      nickEl.hidden = !loggedIn;
      nickEl.textContent = loggedIn ? user.nickname : '';
    }
    if (logoutBtn) {
      logoutBtn.hidden = !loggedIn;
    }
  }

  function navigate(route, params, options) {
    var nextRoute = route === 'detail' || route === 'write' ? route : 'list';
    var nextParams = params && typeof params === 'object' ? Object.assign({}, params) : {};
    var opts = options && typeof options === 'object' ? options : {};

    // 비로그인 상태에서 글쓰기 접근 시 로그인 모달을 먼저 표시, 성공 시 글쓰기 창으로 자동 이동
    if (
      nextRoute === 'write' &&
      global.HobakAuth &&
      typeof global.HobakAuth.isLoggedIn === 'function' &&
      !global.HobakAuth.isLoggedIn()
    ) {
      if (typeof global.HobakAuth.openModal === 'function') {
        global.HobakAuth.openModal({
          mode: 'login',
          message: '글쓰기는 로그인 후 이용할 수 있어요 🎃',
          onSuccess: function () {
            navigate('write', nextParams, opts);
          }
        });
      }
      return;
    }

    if (nextRoute === 'list') {
      appState.activeNavTab = nextParams.navTab === 'all' ? 'all' : 'used';
      if (typeof nextParams.query === 'string') {
        appState.listState.query = nextParams.query;
      }
      if (typeof nextParams.category === 'string') {
        appState.listState.category = nextParams.category;
      }
      if (typeof nextParams.location === 'string') {
        appState.listState.location = nextParams.location;
      }
      if (typeof nextParams.onlyAvailable === 'boolean') {
        appState.listState.onlyAvailable = nextParams.onlyAvailable;
      }
      if (typeof nextParams.page === 'number') {
        appState.listState.page = nextParams.page;
      }
      if (nextParams.resetFilters) {
        appState.listState = {
          query: '',
          category: '전체',
          location: '',
          onlyAvailable: false,
          sort: 'latest',
          page: 1,
          pageSize: 12
        };
      }
    }

    appState.route = nextRoute;
    appState.params = nextParams;

    var targetHash = buildHash(nextRoute, nextParams);
    if (!opts.skipHashUpdate && global.location && global.location.hash !== targetHash) {
      try {
        global.history.pushState(null, '', targetHash);
      } catch (e) {
        global.location.hash = targetHash;
      }
    }

    renderCurrentRoute();

    if (!opts.skipScroll && typeof global.scrollTo === 'function') {
      global.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function bindGlobalEvents() {
    var logoBtn = document.getElementById('hobak-logo-btn');
    if (logoBtn) {
      logoBtn.addEventListener('click', function () {
        navigate('list', { resetFilters: true });
      });
    }

    var writeTopBtn = document.getElementById('hobak-write-top-btn');
    if (writeTopBtn) {
      writeTopBtn.addEventListener('click', function () {
        navigate('write', { resetForm: true });
      });
    }

    var isometricBtn = document.getElementById('hobak-isometric-btn');
    if (isometricBtn) {
      isometricBtn.addEventListener('click', function () {
        if (appState.route !== 'list') {
          navigate('list');
        }
        if (global.HobakAntigravity && typeof global.HobakAntigravity.toggleIsometric === 'function') {
          global.HobakAntigravity.toggleIsometric();
        }
      });
    }

    var resetDataBtn = document.getElementById('hobak-reset-data-btn');
    if (resetDataBtn) {
      resetDataBtn.addEventListener('click', function () {
        if (global.HobakStore && typeof global.HobakStore.resetData === 'function') {
          global.HobakStore.resetData();
          showToast('초기 가상 데이터 10개로 복원했어요 🎃');
          navigate('list', { resetFilters: true });
        }
      });
    }

    var searchForm = document.getElementById('hobak-global-search-form');
    if (searchForm && searchInputEl) {
      searchForm.addEventListener('submit', function (e) {
        e.preventDefault();
        navigate('list', {
          query: searchInputEl.value.trim(),
          page: 1
        });
      });

      searchInputEl.addEventListener('input', function () {
        if (searchClearEl) {
          if (searchInputEl.value.length > 0) {
            searchClearEl.classList.add('visible');
          } else {
            searchClearEl.classList.remove('visible');
          }
        }
      });
    }

    if (searchClearEl && searchInputEl) {
      searchClearEl.addEventListener('click', function () {
        searchInputEl.value = '';
        searchClearEl.classList.remove('visible');
        navigate('list', { query: '', page: 1 });
        searchInputEl.focus();
      });
    }

    var navPills = document.querySelectorAll('.hobak-nav-pill[data-nav]');
    navPills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        var navKey = pill.getAttribute('data-nav');
        if (navKey === 'all') {
          navigate('list', { resetFilters: true, navTab: 'all' });
          return;
        }
        if (navKey === 'used') {
          appState.activeNavTab = 'used';
          navigate('list');
          return;
        }
        var label = pill.textContent.trim();
        showToast('"' + label + '" 서비스는 곧 오픈 예정이에요! 지금은 중고거래를 이용해보세요 🎃');
      });
    });

    var loginBtn = document.getElementById('hobak-login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', function () {
        if (global.HobakAuth && typeof global.HobakAuth.openModal === 'function') {
          global.HobakAuth.openModal({ mode: 'login' });
        }
      });
    }

    var logoutBtn = document.getElementById('hobak-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        if (global.HobakAuth && typeof global.HobakAuth.signOut === 'function') {
          global.HobakAuth.signOut();
          showToast('로그아웃되었어요.');
          if (appState.route === 'write') {
            navigate('list');
          }
        }
      });
    }

    global.addEventListener('hobak:auth-changed', function () {
      syncAuthHeaderUI();
    });

    var navWriteLink = document.getElementById('hobak-nav-write-link');
    if (navWriteLink) {
      navWriteLink.addEventListener('click', function () {
        navigate('write', { resetForm: true });
      });
    }

    var dbBadge = document.getElementById('hobak-db-status-badge');
    if (dbBadge) {
      dbBadge.addEventListener('click', function () {
        if (global.HobakStore && typeof global.HobakStore.syncFromSupabase === 'function') {
          updateDbStatusBadge('syncing');
          global.HobakStore.syncFromSupabase().then(function (items) {
            if (items) {
              showToast('Supabase DB에서 최신 상품 ' + items.length + '개를 불러왔어요 🟢');
              renderCurrentRoute();
            } else {
              showToast('오프라인/로컬 캐시 모드로 동작 중이에요');
            }
          });
        }
      });
    }

    var footerButtons = document.querySelectorAll('[data-footer-action]');
    footerButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-footer-action');
        if (action === 'go-list') {
          navigate('list', { resetFilters: true });
        } else if (action === 'go-write') {
          navigate('write', { resetForm: true });
        } else {
          showToast('호박(Hobak) 웹서비스 안내: ' + btn.textContent.trim());
        }
      });
    });

    global.addEventListener('hashchange', function () {
      var parsed = parseHash(global.location.hash);
      navigate(parsed.route, parsed.params, { skipHashUpdate: true });
    });
  }

  function updateDbStatusBadge(status) {
    var badge = document.getElementById('hobak-db-status-badge');
    if (!badge) return;
    var textEl = badge.querySelector('.hobak-db-text');
    badge.classList.remove('is-connected', 'is-local');
    if (status === 'connected') {
      badge.classList.add('is-connected');
      if (textEl) textEl.textContent = 'Supabase DB 연결됨';
    } else if (status === 'local') {
      badge.classList.add('is-local');
      if (textEl) textEl.textContent = '로컬 캐시 모드';
    } else {
      if (textEl) textEl.textContent = 'Supabase 연결 중...';
    }
  }

  function init() {
    mainEl = document.getElementById('hobak-main');
    viewContainerEl = document.getElementById('hobak-view-container');
    searchInputEl = document.getElementById('hobak-global-search-input');
    searchClearEl = document.getElementById('hobak-global-search-clear');
    toastEl = document.getElementById('hobak-global-toast');

    bindGlobalEvents();
    syncAuthHeaderUI();

    var initial = parseHash(global.location.hash);
    if (!global.location.hash) {
      try {
        global.history.replaceState(null, '', '#list');
      } catch (e) {
        // ignore
      }
    }
    navigate(initial.route, initial.params, { skipHashUpdate: true, skipScroll: true });

    if (global.HobakStore && typeof global.HobakStore.syncFromSupabase === 'function') {
      updateDbStatusBadge(
        typeof global.HobakStore.getSyncStatus === 'function'
          ? global.HobakStore.getSyncStatus()
          : 'syncing'
      );
      global.addEventListener('hobak:store-synced', function (ev) {
        var detail = ev && ev.detail ? ev.detail : {};
        updateDbStatusBadge(detail.connected ? 'connected' : 'local');
        if (detail.connected && appState.route === 'list') {
          renderCurrentRoute();
        }
      });
      global.HobakStore.syncFromSupabase();
    }
  }

  global.HobakApp = {
    navigate: navigate,
    showToast: showToast,
    getState: function () {
      return JSON.parse(JSON.stringify(appState));
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
