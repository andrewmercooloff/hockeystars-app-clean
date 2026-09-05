/**
 * Web login — same flow as mobile app (via /api/send-otp.php + /api/verify-otp.php).
 */
(function () {
  const STORAGE_USER = 'hockeystars_current_user';
  const STORAGE_CACHE = 'hockeystars_user_cache';
  const $ = (id) => document.getElementById(id);

  function toAppPlayer(row) {
    if (!row || typeof row !== 'object') return row;
    return {
      id: row.id,
      name: row.name,
      position: row.position || '',
      team: row.team || '',
      age: row.age,
      height: row.height != null ? String(row.height) : '',
      weight: row.weight != null ? String(row.weight) : '',
      avatar: row.avatar || '',
      email: row.email || '',
      status: row.status || 'player',
      phone: row.phone || '',
      city: row.city || '',
      country: row.country || '',
      goals: row.goals != null ? String(row.goals) : '0',
      assists: row.assists != null ? String(row.assists) : '0',
      games: row.games != null ? String(row.games) : '0',
      number: row.number || '',
      grip: row.grip || '',
      birthDate: row.birth_date || row.birthDate || '',
      parentEmail: row.parent_email || row.parentEmail || '',
      unreadMessagesCount: 0,
      friendRequestsCount: 0,
      giftRequestsCount: 0,
      photos: [],
      notifications: '[]',
    };
  }

  function showError(msg) {
    const el = $('auth-error');
    if (!el) return;
    el.textContent = msg || 'Ошибка';
    el.hidden = false;
    el.classList.remove('is-info');
  }

  function showInfo(msg) {
    const el = $('auth-error');
    if (!el) return;
    el.textContent = msg || '';
    el.hidden = !msg;
    el.classList.add('is-info');
  }

  function hideError() {
    const el = $('auth-error');
    if (el) {
      el.hidden = true;
      el.classList.remove('is-info');
    }
  }

  function showStep(next) {
    const contactStep = $('auth-step-contact');
    const codeStep = $('auth-step-code');
    if (contactStep) {
      contactStep.classList.toggle('is-hidden', next !== 'contact');
    }
    if (codeStep) {
      codeStep.classList.toggle('is-hidden', next !== 'code');
    }
  }

  let step = 'contact';
  let contact = '';
  let playerId = '';

  const form = $('auth-form');
  if (!form) return;

  const codeInput = $('auth-code');
  if (codeInput) {
    codeInput.addEventListener('input', function () {
      codeInput.value = codeInput.value.replace(/\D/g, '').slice(0, 6);
    });
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    hideError();

    const submitBtn = $('auth-submit');
    if (submitBtn) submitBtn.disabled = true;
    const prevLabel = submitBtn ? submitBtn.textContent : '';

    try {
      if (step === 'contact') {
        contact = ($('auth-contact') && $('auth-contact').value || '').trim();
        if (!contact) throw new Error('Введите телефон или email');

        if (submitBtn) submitBtn.textContent = 'Отправка…';

        const res = await fetch('/api/send-otp.php?v=2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contact: contact }),
        });
        const data = await res.json().catch(function () { return {}; });

        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Не удалось отправить код');
        }

        if (data.contact) contact = data.contact;
        if (data.playerId) playerId = data.playerId;
        step = 'code';
        showStep('code');
        if (submitBtn) submitBtn.textContent = 'Войти';
        showInfo(data.message || 'Код отправлен. Проверьте SMS.');
        setTimeout(function () {
          if (codeInput) {
            codeInput.focus();
            codeInput.click();
          }
        }, 100);
      } else {
        const code = (codeInput && codeInput.value || '').trim();
        if (!code) throw new Error('Введите код');

        if (submitBtn) submitBtn.textContent = 'Проверка…';

        const res = await fetch('/api/verify-otp.php?v=2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contact: contact, code: code, playerId: playerId }),
        });
        const data = await res.json().catch(function () { return {}; });

        if (!res.ok || !data.success || !data.player) {
          throw new Error(data.message || 'Неверный код');
        }

        var player = toAppPlayer(data.player);
        localStorage.setItem(STORAGE_USER, JSON.stringify(player));
        localStorage.setItem(
          STORAGE_CACHE,
          JSON.stringify({ user: player, ts: Date.now() })
        );

        var params = new URLSearchParams(location.search);
        var returnTo = params.get('returnTo');
        if (returnTo && (returnTo.indexOf('/') === 0) && returnTo.indexOf('//') !== 0) {
          // / is marketing landing; bare /app → web feed
          var target = returnTo.replace(/^\/app(?=\/|$)/, '') || '/feed';
          if (target === '/') target = '/feed';
          location.href = target;
          return;
        }
        location.href = '/feed';
      }
    } catch (err) {
      showError(err && err.message ? err.message : 'Ошибка');
      if (submitBtn && step === 'contact') submitBtn.textContent = prevLabel || 'Получить код';
      if (submitBtn && step === 'code') submitBtn.textContent = 'Войти';
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
})();
