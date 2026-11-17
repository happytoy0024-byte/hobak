/**
 * 호박(Hobak) 인증 & 프로필 모듈 (Supabase Auth REST + public.profiles 연동)
 * - 이메일 / 비밀번호 로그인 및 닉네임 필수 회원가입 모달
 * - window.HobakAuth 제공
 */
(function (global) {
  'use strict';

  var SESSION_STORAGE_KEY = 'hobak_auth_session_v1';
  var LOCAL_ACCOUNTS_KEY = 'hobak_local_accounts_v1';

  var currentUser = null;
  var activeModalEl = null;
  var modalCallback = null;

  function getConfig() {
    var cfg = global.HOBAK_SUPABASE_CONFIG;
    if (!cfg || !cfg.enabled || !cfg.url || !cfg.anonKey) return null;
    return cfg;
  }

  function generateUuid() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return global.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function loadSession() {
    try {
      var raw = global.localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (parsed && parsed.id && parsed.nickname) {
        return parsed;
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  function saveSession(user) {
    currentUser = user || null;
    try {
      if (user) {
        global.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
      } else {
        global.localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch (e) {
      // ignore
    }
    dispatchAuthChanged();
  }

  function dispatchAuthChanged() {
    if (typeof global.dispatchEvent === 'function' && typeof global.CustomEvent === 'function') {
      global.dispatchEvent(
        new global.CustomEvent('hobak:auth-changed', {
          detail: { user: getUser(), loggedIn: isLoggedIn() }
        })
      );
    }
  }

  function loadLocalAccounts() {
    try {
      var raw = global.localStorage.getItem(LOCAL_ACCOUNTS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return [];
  }

  function saveLocalAccount(account) {
    try {
      var accounts = loadLocalAccounts().filter(function (a) {
        return a.email !== account.email;
      });
      accounts.push(account);
      global.localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch (e) {
      // ignore
    }
  }

  function upsertProfileRemote(user, accessToken) {
    var cfg = getConfig();
    if (!cfg || typeof global.fetch !== 'function' || !user || !user.id) {
      return Promise.resolve(false);
    }
    var token = accessToken || cfg.anonKey;
    return global
      .fetch(cfg.url.replace(/\/$/, '') + '/rest/v1/profiles?on_conflict=id', {
        method: 'POST',
        headers: {
          apikey: cfg.anonKey,
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify({
          id: user.id,
          nickname: user.nickname,
          avatar_url: user.avatar || '',
          location: user.location || '울산 동구 방어동',
          manner_temp: user.mannerTemp != null ? Number(user.mannerTemp) : 36.5
        })
      })
      .then(function (res) {
        return res.ok;
      })
      .catch(function () {
        return false;
      });
  }

  function fetchProfileRemote(userId, accessToken) {
    var cfg = getConfig();
    if (!cfg || typeof global.fetch !== 'function' || !userId) {
      return Promise.resolve(null);
    }
    var token = accessToken || cfg.anonKey;
    return global
      .fetch(
        cfg.url.replace(/\/$/, '') +
          '/rest/v1/profiles?select=id,nickname,avatar_url,location,manner_temp&id=eq.' +
          encodeURIComponent(userId) +
          '&limit=1',
        {
          method: 'GET',
          headers: {
            apikey: cfg.anonKey,
            Authorization: 'Bearer ' + token
          }
        }
      )
      .then(function (res) {
        if (!res.ok) return null;
        return res.json();
      })
      .then(function (rows) {
        return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      })
      .catch(function () {
        return null;
      });
  }

  function translateAuthError(rawMsg) {
    var msg = String(rawMsg || '').toLowerCase();
    if (msg.indexOf('invalid login credentials') !== -1) {
      return '이메일 또는 비밀번호가 올바르지 않아요.';
    }
    if (msg.indexOf('user already registered') !== -1 || msg.indexOf('already been registered') !== -1) {
      return '이미 가입된 이메일이에요. 로그인 탭에서 로그인해 주세요.';
    }
    if (msg.indexOf('password should be at least') !== -1) {
      return '비밀번호는 최소 6자 이상 입력해주세요.';
    }
    if (msg.indexOf('invalid email') !== -1 || msg.indexOf('unable to validate email') !== -1) {
      return '올바른 이메일 형식을 입력해주세요.';
    }
    if (msg.indexOf('email not confirmed') !== -1) {
      return '이메일 인증이 아직 완료되지 않았어요. 메일함을 확인해주세요.';
    }
    if (msg.indexOf('rate limit') !== -1 || msg.indexOf('too many requests') !== -1) {
      return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
    }
    return rawMsg || '인증 처리 중 문제가 발생했어요.';
  }

  function signUp(payload) {
    var email = String((payload && payload.email) || '').trim().toLowerCase();
    var password = String((payload && payload.password) || '');
    var nickname = String((payload && payload.nickname) || '').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Promise.reject(new Error('올바른 이메일 주소를 입력해주세요.'));
    }
    if (password.length < 6) {
      return Promise.reject(new Error('비밀번호는 6자 이상 입력해주세요.'));
    }
    if (!nickname) {
      return Promise.reject(new Error('닉네임을 반드시 입력해주세요.'));
    }
    if (nickname.length > 20) {
      return Promise.reject(new Error('닉네임은 20자 이내로 입력해주세요.'));
    }

    var defaultAvatar = (global.HobakStore && global.HobakStore.DEFAULT_AVATAR) || '';
    var cfg = getConfig();

    function completeLocalFallbackSignup() {
      var existing = loadLocalAccounts().find(function (a) {
        return a.email === email;
      });
      if (existing) {
        return Promise.reject(new Error('이미 가입된 이메일이에요. 로그인 탭에서 로그인해 주세요.'));
      }
      var userObj = {
        id: generateUuid(),
        email: email,
        nickname: nickname,
        avatar: defaultAvatar,
        location: '울산 동구 방어동',
        mannerTemp: 36.5,
        accessToken: 'local-' + generateUuid(),
        authSource: 'local'
      };
      saveLocalAccount(Object.assign({}, userObj, { password: password }));
      saveSession(userObj);
      return Promise.resolve(userObj);
    }

    if (!cfg || typeof global.fetch !== 'function') {
      return completeLocalFallbackSignup();
    }

    return global
      .fetch(cfg.url.replace(/\/$/, '') + '/auth/v1/signup', {
        method: 'POST',
        headers: {
          apikey: cfg.anonKey,
          Authorization: 'Bearer ' + cfg.anonKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          password: password,
          data: { nickname: nickname }
        })
      })
      .then(function (res) {
        return res
          .json()
          .catch(function () {
            return {};
          })
          .then(function (data) {
            if (!res.ok) {
              var errMsg = (data && (data.msg || data.error_description || data.message)) || '';
              throw new Error(translateAuthError(errMsg));
            }
            return data;
          });
      })
      .then(function (data) {
        var authUser = data.user || data;
        var userId = (authUser && authUser.id) || generateUuid();
        var accessToken = data.access_token || (data.session && data.session.access_token) || null;

        // signup 응답에 세션이 없는 경우 즉시 비밀번호 로그인 시도
        var ensureTokenPromise = accessToken
          ? Promise.resolve(accessToken)
          : global
              .fetch(cfg.url.replace(/\/$/, '') + '/auth/v1/token?grant_type=password', {
                method: 'POST',
                headers: {
                  apikey: cfg.anonKey,
                  Authorization: 'Bearer ' + cfg.anonKey,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: email, password: password })
              })
              .then(function (tokenRes) {
                if (!tokenRes.ok) return null;
                return tokenRes.json().then(function (td) {
                  return td.access_token || null;
                });
              })
              .catch(function () {
                return null;
              });

        return ensureTokenPromise.then(function (finalToken) {
          var userObj = {
            id: userId,
            email: email,
            nickname: nickname,
            avatar: defaultAvatar,
            location: '울산 동구 방어동',
            mannerTemp: 36.5,
            accessToken: finalToken || 'anon-session',
            authSource: 'supabase'
          };
          saveLocalAccount(Object.assign({}, userObj, { password: password }));
          return upsertProfileRemote(userObj, finalToken).then(function () {
            saveSession(userObj);
            return userObj;
          });
        });
      })
      .catch(function (err) {
        // 네트워크 차단(샌드박스/오프라인) 시에만 로컬 폴백 사용, 서버 검증 오류는 그대로 전달
        if (err && err.name === 'TypeError') {
          return completeLocalFallbackSignup();
        }
        throw err;
      });
  }

  function signIn(payload) {
    var email = String((payload && payload.email) || '').trim().toLowerCase();
    var password = String((payload && payload.password) || '');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Promise.reject(new Error('올바른 이메일 주소를 입력해주세요.'));
    }
    if (!password) {
      return Promise.reject(new Error('비밀번호를 입력해주세요.'));
    }

    var defaultAvatar = (global.HobakStore && global.HobakStore.DEFAULT_AVATAR) || '';
    var cfg = getConfig();

    function completeLocalFallbackSignin() {
      var found = loadLocalAccounts().find(function (a) {
        return a.email === email && a.password === password;
      });
      if (!found) {
        return Promise.reject(new Error('이메일 또는 비밀번호가 올바르지 않아요.'));
      }
      var userObj = {
        id: found.id,
        email: found.email,
        nickname: found.nickname,
        avatar: found.avatar || defaultAvatar,
        location: found.location || '울산 동구 방어동',
        mannerTemp: found.mannerTemp != null ? Number(found.mannerTemp) : 36.5,
        accessToken: found.accessToken || 'local-' + generateUuid(),
        authSource: 'local'
      };
      saveSession(userObj);
      return Promise.resolve(userObj);
    }

    if (!cfg || typeof global.fetch !== 'function') {
      return completeLocalFallbackSignin();
    }

    return global
      .fetch(cfg.url.replace(/\/$/, '') + '/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: {
          apikey: cfg.anonKey,
          Authorization: 'Bearer ' + cfg.anonKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email, password: password })
      })
      .then(function (res) {
        return res
          .json()
          .catch(function () {
            return {};
          })
          .then(function (data) {
            if (!res.ok) {
              var errMsg = (data && (data.error_description || data.msg || data.message)) || '';
              throw new Error(translateAuthError(errMsg));
            }
            return data;
          });
      })
      .then(function (data) {
        var authUser = data.user || {};
        var accessToken = data.access_token || '';
        var userId = authUser.id || generateUuid();
        var metaNick =
          (authUser.user_metadata && authUser.user_metadata.nickname) || email.split('@')[0];

        return fetchProfileRemote(userId, accessToken).then(function (profile) {
          var nickname = (profile && profile.nickname) || metaNick || '호박이웃';
          var userObj = {
            id: userId,
            email: email,
            nickname: nickname,
            avatar: (profile && profile.avatar_url) || defaultAvatar,
            location: (profile && profile.location) || '울산 동구 방어동',
            mannerTemp:
              profile && profile.manner_temp != null ? Number(profile.manner_temp) : 36.5,
            accessToken: accessToken,
            authSource: 'supabase'
          };
          if (!profile) {
            upsertProfileRemote(userObj, accessToken);
          }
          saveSession(userObj);
          return userObj;
        });
      })
      .catch(function (err) {
        if (err && err.name === 'TypeError') {
          return completeLocalFallbackSignin();
        }
        throw err;
      });
  }

  function signOut() {
    var cfg = getConfig();
    var token = currentUser && currentUser.accessToken;
    if (
      cfg &&
      token &&
      String(token).indexOf('local-') !== 0 &&
      typeof global.fetch === 'function'
    ) {
      global
        .fetch(cfg.url.replace(/\/$/, '') + '/auth/v1/logout', {
          method: 'POST',
          headers: {
            apikey: cfg.anonKey,
            Authorization: 'Bearer ' + token
          }
        })
        .catch(function () {
          // ignore
        });
    }
    saveSession(null);
  }

  function closeModal() {
    if (activeModalEl && activeModalEl.parentNode) {
      activeModalEl.parentNode.removeChild(activeModalEl);
    }
    activeModalEl = null;
    modalCallback = null;
  }

  function openModal(options) {
    closeModal();
    var opts = options && typeof options === 'object' ? options : {};
    var mode = opts.mode === 'signup' ? 'signup' : 'login';
    var noticeMsg = opts.message ? String(opts.message) : '';
    modalCallback = typeof opts.onSuccess === 'function' ? opts.onSuccess : null;

    var backdrop = document.createElement('div');
    backdrop.className = 'hobak-auth-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'hobak-auth-modal-title');

    backdrop.innerHTML =
      '<div class="hobak-auth-modal">' +
      '  <button type="button" class="hobak-auth-close" aria-label="로그인 창 닫기">✕</button>' +
      '  <div class="hobak-auth-brand">' +
      '    <span class="hobak-auth-brand-badge" aria-hidden="true">🎃</span>' +
      '    <h2 id="hobak-auth-modal-title" class="hobak-auth-title">호박 시작하기</h2>' +
      '  </div>' +
      '  <p class="hobak-auth-subtitle">이웃과 따뜻한 중고거래를 시작해보세요.</p>' +
      '  <div class="hobak-auth-notice"' + (noticeMsg ? '' : ' hidden') + '>' +
      (noticeMsg ? noticeMsg.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '') +
      '</div>' +
      '  <div class="hobak-auth-tabs" role="tablist">' +
      '    <button type="button" class="hobak-auth-tab" data-auth-tab="login" role="tab">로그인</button>' +
      '    <button type="button" class="hobak-auth-tab" data-auth-tab="signup" role="tab">회원가입</button>' +
      '  </div>' +
      '  <form class="hobak-auth-form" novalidate>' +
      '    <div class="hobak-auth-field">' +
      '      <label class="hobak-auth-label" for="hobak-auth-email">이메일 <span class="hobak-auth-required">*</span></label>' +
      '      <input id="hobak-auth-email" type="email" class="hobak-auth-input" placeholder="example@hobak.kr" autocomplete="email" required />' +
      '    </div>' +
      '    <div class="hobak-auth-field">' +
      '      <label class="hobak-auth-label" for="hobak-auth-password">비밀번호 <span class="hobak-auth-required">*</span></label>' +
      '      <input id="hobak-auth-password" type="password" class="hobak-auth-input" placeholder="6자 이상 입력" autocomplete="current-password" required />' +
      '    </div>' +
      '    <div class="hobak-auth-field" data-auth-nickname-field>' +
      '      <label class="hobak-auth-label" for="hobak-auth-nickname">닉네임 <span class="hobak-auth-required">*</span></label>' +
      '      <input id="hobak-auth-nickname" type="text" class="hobak-auth-input" maxlength="20" placeholder="서비스에서 사용할 닉네임 (필수)" autocomplete="nickname" />' +
      '      <span class="hobak-auth-hint">실명 대신 사용할 닉네임을 입력해주세요 (20자 이내).</span>' +
      '    </div>' +
      '    <div class="hobak-auth-error" role="alert" hidden></div>' +
      '    <button type="submit" class="hobak-auth-submit">로그인하기</button>' +
      '  </form>' +
      '  <div class="hobak-auth-footer">' +
      '    <span class="hobak-auth-switch-text">아직 호박 회원이 아니신가요?</span>' +
      '    <button type="button" class="hobak-auth-switch-link">회원가입</button>' +
      '  </div>' +
      '</div>';

    var closeBtn = backdrop.querySelector('.hobak-auth-close');
    var tabBtns = backdrop.querySelectorAll('[data-auth-tab]');
    var formEl = backdrop.querySelector('.hobak-auth-form');
    var emailInput = backdrop.querySelector('#hobak-auth-email');
    var passwordInput = backdrop.querySelector('#hobak-auth-password');
    var nicknameGroup = backdrop.querySelector('[data-auth-nickname-field]');
    var nicknameInput = backdrop.querySelector('#hobak-auth-nickname');
    var errorEl = backdrop.querySelector('.hobak-auth-error');
    var submitBtn = backdrop.querySelector('.hobak-auth-submit');
    var switchText = backdrop.querySelector('.hobak-auth-switch-text');
    var switchBtn = backdrop.querySelector('.hobak-auth-switch-link');

    function setError(msg) {
      if (!errorEl) return;
      if (msg) {
        errorEl.textContent = msg;
        errorEl.hidden = false;
      } else {
        errorEl.textContent = '';
        errorEl.hidden = true;
      }
    }

    function applyMode(nextMode) {
      mode = nextMode === 'signup' ? 'signup' : 'login';
      setError('');
      [emailInput, passwordInput, nicknameInput].forEach(function (inp) {
        if (inp) inp.classList.remove('is-invalid');
      });

      tabBtns.forEach(function (btn) {
        var isMatch = btn.getAttribute('data-auth-tab') === mode;
        btn.classList.toggle('is-active', isMatch);
        btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
      });

      if (mode === 'signup') {
        nicknameGroup.hidden = false;
        nicknameInput.required = true;
        passwordInput.setAttribute('autocomplete', 'new-password');
        submitBtn.textContent = '회원가입 완료';
        switchText.textContent = '이미 호박 계정이 있으신가요?';
        switchBtn.textContent = '로그인';
      } else {
        nicknameGroup.hidden = true;
        nicknameInput.required = false;
        passwordInput.setAttribute('autocomplete', 'current-password');
        submitBtn.textContent = '로그인하기';
        switchText.textContent = '아직 호박 회원이 아니신가요?';
        switchBtn.textContent = '회원가입';
      }
    }

    tabBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyMode(btn.getAttribute('data-auth-tab'));
      });
    });

    switchBtn.addEventListener('click', function () {
      applyMode(mode === 'login' ? 'signup' : 'login');
    });

    closeBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) {
        closeModal();
      }
    });

    formEl.addEventListener('submit', function (e) {
      e.preventDefault();
      setError('');
      [emailInput, passwordInput, nicknameInput].forEach(function (inp) {
        inp.classList.remove('is-invalid');
      });

      var email = emailInput.value.trim();
      var password = passwordInput.value;
      var nickname = nicknameInput.value.trim();

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailInput.classList.add('is-invalid');
        setError('올바른 이메일 주소를 입력해주세요.');
        emailInput.focus();
        return;
      }
      if (password.length < 6) {
        passwordInput.classList.add('is-invalid');
        setError('비밀번호는 6자 이상 입력해주세요.');
        passwordInput.focus();
        return;
      }
      if (mode === 'signup' && !nickname) {
        nicknameInput.classList.add('is-invalid');
        setError('닉네임을 반드시 입력해주세요.');
        nicknameInput.focus();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = mode === 'signup' ? '가입 처리 중...' : '로그인 중...';

      var actionPromise =
        mode === 'signup'
          ? signUp({ email: email, password: password, nickname: nickname })
          : signIn({ email: email, password: password });

      actionPromise
        .then(function (user) {
          var cb = modalCallback;
          closeModal();
          if (global.HobakApp && typeof global.HobakApp.showToast === 'function') {
            global.HobakApp.showToast(
              user.nickname + '님, 환영해요! 🎃'
            );
          }
          if (typeof cb === 'function') {
            cb(user);
          }
        })
        .catch(function (err) {
          submitBtn.disabled = false;
          submitBtn.textContent = mode === 'signup' ? '회원가입 완료' : '로그인하기';
          setError((err && err.message) || '인증 처리 중 오류가 발생했어요.');
        });
    });

    document.body.appendChild(backdrop);
    activeModalEl = backdrop;
    applyMode(mode);

    setTimeout(function () {
      if (emailInput && emailInput.isConnected) {
        emailInput.focus();
      }
    }, 30);
  }

  function getUser() {
    return currentUser ? Object.assign({}, currentUser) : null;
  }

  function isLoggedIn() {
    return Boolean(currentUser && currentUser.id);
  }

  function getAccessToken() {
    return currentUser && currentUser.accessToken ? currentUser.accessToken : null;
  }

  function init() {
    currentUser = loadSession();
    dispatchAuthChanged();
  }

  global.HobakAuth = {
    init: init,
    getUser: getUser,
    isLoggedIn: isLoggedIn,
    getAccessToken: getAccessToken,
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    openModal: openModal,
    closeModal: closeModal
  };

  init();
})(window);
