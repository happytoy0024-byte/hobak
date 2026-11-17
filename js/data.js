/**
 * 호박(Hobak) 중고거래 웹서비스 공용 데이터 및 스토어 모듈
 * - 초기 가상 상품 데이터 10개 제공
 * - 오프라인/로컬 환경에서도 깨지지 않는 고해상도 커스텀 SVG 이미지 제공
 * - localStorage 기반 CRUD 및 상태 관리 (window.HobakStore)
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'hobak_market_items_v1';

  function svgToDataUrl(svgString) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString.trim());
  }

  // 판매자 프로필 아바타 (목걸이/진주 패턴 아바타 및 다양한 아바타)
  const AVATAR_NECKLACE = svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
      <defs>
        <radialGradient id="bgAv1" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stop-color="#f5efe6"/>
          <stop offset="100%" stop-color="#dcd2c3"/>
        </radialGradient>
      </defs>
      <rect width="120" height="120" fill="url(#bgAv1)"/>
      <path d="M26 24 C20 68, 40 96, 60 96 C80 96, 100 68, 94 24" fill="none" stroke="#9b8b7a" stroke-width="2.5" stroke-dasharray="6 4"/>
      <g fill="#f7f2eb" stroke="#a69887" stroke-width="1.2">
        <circle cx="28" cy="30" r="4.5"/><circle cx="27" cy="41" r="4.5"/><circle cx="28" cy="52" r="4.5"/>
        <circle cx="32" cy="63" r="4.5"/><circle cx="38" cy="73" r="4.5"/><circle cx="46" cy="82" r="4.5"/>
        <circle cx="55" cy="89" r="5"/><circle cx="65" cy="89" r="5"/><circle cx="74" cy="82" r="4.5"/>
        <circle cx="82" cy="73" r="4.5"/><circle cx="88" cy="63" r="4.5"/><circle cx="92" cy="52" r="4.5"/>
        <circle cx="93" cy="41" r="4.5"/><circle cx="92" cy="30" r="4.5"/>
      </g>
      <circle cx="60" cy="92" r="5.5" fill="#fffaf2" stroke="#8f7e6d" stroke-width="1.5"/>
    </svg>
  `);

  function createAvatar(bg, emojiOrChar, fg) {
    return svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
        <rect width="120" height="120" fill="${bg}"/>
        <circle cx="60" cy="45" r="22" fill="${fg}" opacity="0.25"/>
        <path d="M24 112 C24 80, 96 80, 96 112" fill="${fg}" opacity="0.22"/>
        <text x="60" y="72" text-anchor="middle" font-size="42" font-family="sans-serif" font-weight="700" fill="${fg}">${emojiOrChar}</text>
      </svg>
    `);
  }

  // 1번 이미지: 8세컨즈 후드 숏패딩 민트 XL (정면 + 디테일 2장)
  const PADDING_MINT_1 = svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
      <defs>
        <linearGradient id="wallBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#e5d9cc"/>
          <stop offset="100%" stop-color="#cbbba9"/>
        </linearGradient>
        <pattern id="roseWall" width="90" height="90" patternUnits="userSpaceOnUse">
          <circle cx="45" cy="45" r="24" fill="none" stroke="#d5c4b1" stroke-width="2" opacity="0.55"/>
          <circle cx="45" cy="45" r="14" fill="none" stroke="#d5c4b1" stroke-width="1.5" opacity="0.5"/>
          <circle cx="45" cy="45" r="5" fill="#d5c4b1" opacity="0.45"/>
        </pattern>
        <linearGradient id="mintCloth" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stop-color="#a8b9b5"/>
          <stop offset="50%" stop-color="#93a6a2"/>
          <stop offset="100%" stop-color="#7c8f8b"/>
        </linearGradient>
        <linearGradient id="mintDark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#7b8d89"/>
          <stop offset="100%" stop-color="#60716d"/>
        </linearGradient>
        <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#2b3331" flood-opacity="0.28"/>
        </filter>
      </defs>
      <rect width="600" height="600" fill="url(#wallBg)"/>
      <rect width="600" height="600" fill="url(#roseWall)"/>
      <!-- 옷걸이 -->
      <path d="M235 45 L365 45 L335 72 L265 72 Z" fill="none" stroke="#183891" stroke-width="11" stroke-linejoin="round"/>
      <path d="M300 45 L300 18 C300 6, 316 6, 316 18" fill="none" stroke="#183891" stroke-width="9" stroke-linecap="round"/>
      <!-- 패딩 본체 -->
      <g filter="url(#softShadow)">
        <!-- 후드 -->
        <path d="M210 55 C240 15, 360 15, 390 55 L425 95 L175 95 Z" fill="url(#mintDark)"/>
        <!-- 왼쪽 소매 -->
        <path d="M165 95 L72 340 L20 495 L112 528 L175 310 Z" fill="url(#mintCloth)"/>
        <!-- 오른쪽 소매 -->
        <path d="M435 95 L528 340 L580 495 L488 528 L425 310 Z" fill="url(#mintCloth)"/>
        <!-- 몸통 좌/우 -->
        <path d="M165 95 L300 105 L292 505 C235 510, 175 495, 155 470 L165 250 Z" fill="url(#mintCloth)"/>
        <path d="M435 95 L300 105 L312 505 C375 510, 428 495, 445 470 L435 250 Z" fill="url(#mintCloth)"/>
        <!-- 목 안감 및 라벨 -->
        <path d="M250 65 L350 65 L340 165 L260 165 Z" fill="#82928e"/>
        <rect x="285" y="75" width="34" height="46" rx="3" fill="#9ea8a6"/>
        <rect x="292" y="88" width="20" height="4" fill="#6f7a78"/>
        <rect x="292" y="98" width="14" height="3" fill="#6f7a78"/>
        <!-- 퀼팅 가로 봉제선 -->
        <g stroke="#6b7b77" stroke-width="2.5" opacity="0.7" fill="none">
          <path d="M165 200 L295 215"/>
          <path d="M160 320 L293 335"/>
          <path d="M158 430 L292 442"/>
          <path d="M310 215 L435 200"/>
          <path d="M312 335 L440 320"/>
          <path d="M312 442 L442 430"/>
          <path d="M100 265 L170 285"/>
          <path d="M62 375 L140 398"/>
          <path d="M430 285 L500 265"/>
          <path d="M460 398 L538 375"/>
        </g>
        <!-- 지퍼 라인 -->
        <path d="M300 105 L292 490" stroke="#5b6865" stroke-width="5"/>
        <path d="M300 105 L292 490" stroke="#b9c7c4" stroke-width="1.5" stroke-dasharray="4 3"/>
        <rect x="285" y="458" width="12" height="22" rx="3" fill="#cfd8d6" stroke="#72807d" stroke-width="1.5"/>
        <!-- 포켓 -->
        <rect x="195" y="255" width="26" height="145" rx="4" fill="#8d9f9b" stroke="#6c7c78" stroke-width="2"/>
        <rect x="385" y="255" width="26" height="145" rx="4" fill="#8d9f9b" stroke="#6c7c78" stroke-width="2"/>
        <!-- 후드 스트랩(끈) -->
        <path d="M270 55 L268 255" stroke="#9eb0ac" stroke-width="16" stroke-linecap="round"/>
        <path d="M270 55 L268 255" stroke="#738480" stroke-width="1.5" stroke-dasharray="3 3"/>
        <path d="M368 55 L382 245" stroke="#9eb0ac" stroke-width="13" stroke-linecap="round"/>
        <!-- 밑단 스트링 -->
        <path d="M210 495 Q235 550 225 585" fill="none" stroke="#e4ebe9" stroke-width="2.5"/>
        <path d="M365 495 Q380 540 395 575" fill="none" stroke="#e4ebe9" stroke-width="2.5"/>
      </g>
    </svg>
  `);

  const PADDING_MINT_2 = svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
      <rect width="600" height="600" fill="#d9cebf"/>
      <rect x="75" y="75" width="450" height="450" rx="24" fill="#93a6a2"/>
      <rect x="165" y="130" width="270" height="310" rx="14" fill="#829490" stroke="#62736f" stroke-width="3"/>
      <rect x="210" y="165" width="180" height="220" rx="8" fill="#c7d0ce"/>
      <text x="300" y="250" text-anchor="middle" font-size="38" font-weight="800" fill="#3a4543" font-family="sans-serif">8 SECONDS</text>
      <text x="300" y="302" text-anchor="middle" font-size="24" font-weight="700" fill="#52605d" font-family="sans-serif">SIZE XL (105)</text>
      <rect x="245" y="328" width="110" height="34" rx="17" fill="#52605d"/>
      <text x="300" y="351" text-anchor="middle" font-size="16" font-weight="600" fill="#eef3f2" font-family="sans-serif">MINT HOODIE</text>
      <text x="300" y="495" text-anchor="middle" font-size="20" fill="#f4f8f7" font-family="sans-serif">택 및 안감 상태 깨끗함</text>
    </svg>
  `);

  const PINK_BAG = svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
      <rect width="600" height="600" fill="#c78a7c"/>
      <rect x="110" y="420" width="380" height="180" fill="#8e3b34" opacity="0.5"/>
      <!-- 가방 손잡이 -->
      <path d="M235 215 C235 125, 365 125, 365 215" fill="none" stroke="#f7b7d7" stroke-width="24" stroke-linecap="round"/>
      <path d="M235 215 C235 125, 365 125, 365 215" fill="none" stroke="#d88db4" stroke-width="4"/>
      <!-- 가방 본체 -->
      <path d="M185 215 L415 215 L440 455 C442 475, 425 485, 405 485 L195 485 C175 485, 158 475, 160 455 Z" fill="#f3a8ce" stroke="#d27ca8" stroke-width="4"/>
      <path d="M210 215 L220 485" stroke="#d987b2" stroke-width="2" opacity="0.6"/>
      <path d="M390 215 L380 485" stroke="#d987b2" stroke-width="2" opacity="0.6"/>
      <!-- 삼각 로고 플레이트 -->
      <polygon points="272,275 328,275 300,322" fill="#e8e8e8" stroke="#9e9e9e" stroke-width="2"/>
      <text x="300" y="297" text-anchor="middle" font-size="11" font-weight="700" fill="#333" font-family="serif">PRADA</text>
      <!-- 키링 -->
      <circle cx="205" cy="240" r="10" fill="none" stroke="#d9b45a" stroke-width="4"/>
      <rect x="195" y="250" width="20" height="36" rx="4" fill="#e790bd" stroke="#c36d99" stroke-width="2"/>
    </svg>
  `);

  const STRIPE_CARDIGAN = svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
      <rect width="600" height="600" fill="#d8d1c7"/>
      <g>
        <!-- 소매 -->
        <path d="M165 120 L75 370 L130 395 L195 210 Z" fill="#f5efe6"/>
        <path d="M435 120 L525 370 L470 395 L405 210 Z" fill="#f5efe6"/>
        <!-- 몸통 -->
        <path d="M165 110 L435 110 L445 485 L155 485 Z" fill="#f5efe6"/>
        <!-- 블랙 스트라이프 -->
        <g fill="#232528">
          <rect x="165" y="155" width="270" height="22"/>
          <rect x="162" y="215" width="276" height="22"/>
          <rect x="160" y="275" width="280" height="22"/>
          <rect x="158" y="335" width="284" height="22"/>
          <rect x="156" y="395" width="288" height="22"/>
          <!-- 소매 스트라이프 -->
          <polygon points="145,175 186,188 180,210 137,196"/>
          <polygon points="124,235 168,248 160,270 116,256"/>
          <polygon points="103,295 148,308 140,330 95,316"/>
          <polygon points="455,175 414,188 420,210 463,196"/>
          <polygon points="476,235 432,248 440,270 484,256"/>
          <polygon points="497,295 452,308 460,330 505,316"/>
        </g>
        <!-- 카라 및 지퍼 -->
        <path d="M235 110 L275 155 L325 155 L365 110 Z" fill="#ebe3d5" stroke="#c8beb0" stroke-width="2"/>
        <line x1="300" y1="150" x2="300" y2="485" stroke="#7d7a74" stroke-width="4"/>
        <rect x="155" y="455" width="290" height="32" fill="#e8dfd2"/>
      </g>
    </svg>
  `);

  const TWEED_SETUP = svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
      <rect width="600" height="600" fill="#c9c1b8"/>
      <pattern id="tweed" width="12" height="12" patternUnits="userSpaceOnUse">
        <rect width="12" height="12" fill="#efeae3"/>
        <path d="M0 6 H12 M6 0 V12" stroke="#cfc6ba" stroke-width="1.2"/>
        <circle cx="3" cy="3" r="1" fill="#a89e92"/>
        <circle cx="9" cy="9" r="1" fill="#d9cfc3"/>
      </pattern>
      <!-- 트위드 자켓 -->
      <path d="M180 95 L420 95 L495 310 L435 330 L395 200 L395 320 L205 320 L205 200 L165 330 L105 310 Z" fill="url(#tweed)" stroke="#b3a99c" stroke-width="3"/>
      <!-- 스커트 -->
      <path d="M205 340 L395 340 L430 520 L170 520 Z" fill="url(#tweed)" stroke="#b3a99c" stroke-width="3"/>
      <!-- 진주 단추 & 포켓 -->
      <circle cx="300" cy="155" r="7" fill="#fffaf0" stroke="#a89365" stroke-width="2"/>
      <circle cx="300" cy="205" r="7" fill="#fffaf0" stroke="#a89365" stroke-width="2"/>
      <circle cx="300" cy="255" r="7" fill="#fffaf0" stroke="#a89365" stroke-width="2"/>
      <rect x="225" y="235" width="48" height="44" rx="4" fill="#eae4dc" stroke="#b3a99c" stroke-width="2"/>
      <rect x="327" y="235" width="48" height="44" rx="4" fill="#eae4dc" stroke="#b3a99c" stroke-width="2"/>
    </svg>
  `);

  const CHARCOAL_KNIT = svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
      <rect width="600" height="600" fill="#dcd6ce"/>
      <path d="M185 110 C220 95, 250 118, 300 118 C350 118, 380 95, 415 110 L515 395 L448 422 L395 235 L395 495 L205 495 L205 235 L152 422 L85 395 Z" fill="#545b63"/>
      <path d="M245 104 C270 135, 330 135, 355 104" fill="none" stroke="#3b4148" stroke-width="14" stroke-linecap="round"/>
      <rect x="205" y="468" width="190" height="28" fill="#434950"/>
      <rect x="285" y="136" width="30" height="16" rx="2" fill="#e8e5df"/>
    </svg>
  `);

  const HEATER = svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
      <defs>
        <radialGradient id="heatGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fff4b8"/>
          <stop offset="35%" stop-color="#ff6d1f"/>
          <stop offset="75%" stop-color="#c92e08"/>
          <stop offset="100%" stop-color="#5e1608"/>
        </radialGradient>
      </defs>
      <rect width="600" height="600" fill="#5b6670"/>
      <!-- 받침대 및 스탠드 -->
      <ellipse cx="300" cy="515" rx="135" ry="32" fill="#e8e5df" stroke="#b5b0a8" stroke-width="3"/>
      <rect x="284" y="340" width="32" height="170" fill="#dcd8d0"/>
      <!-- 원형 헤드 -->
      <circle cx="300" cy="240" r="155" fill="#e9e6e0" stroke="#b2ada5" stroke-width="5"/>
      <circle cx="300" cy="240" r="134" fill="url(#heatGlow)"/>
      <!-- 중앙 발열 코일 -->
      <circle cx="300" cy="240" r="36" fill="#ff9e3d" stroke="#ffe799" stroke-width="6"/>
      <path d="M275 240 Q300 212 325 240 Q300 268 275 240" fill="none" stroke="#fff7d1" stroke-width="5"/>
      <!-- 안전망 라인 -->
      <g stroke="#2a2d30" stroke-width="2" opacity="0.45" fill="none">
        <circle cx="300" cy="240" r="65"/><circle cx="300" cy="240" r="98"/><circle cx="300" cy="240" r="128"/>
        <line x1="166" y1="240" x2="434" y2="240"/><line x1="300" y1="106" x2="300" y2="374"/>
      </g>
    </svg>
  `);

  const BRASS_DEER = svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
      <rect width="600" height="600" fill="#cfc3b4"/>
      <rect x="40" y="390" width="520" height="210" fill="#9a7b5c"/>
      <!-- 큰 사슴 1 -->
      <g fill="#b99346" stroke="#7d5e21" stroke-width="2.5">
        <ellipse cx="265" cy="250" rx="68" ry="30"/>
        <path d="M210 245 L185 155 L208 150 L235 235 Z"/>
        <ellipse cx="182" cy="150" rx="22" ry="13"/>
        <path d="M180 138 L165 95 M173 115 L155 108 M190 138 L205 95 M198 115 L215 108" stroke="#7d5e21" stroke-width="4" stroke-linecap="round"/>
        <line x1="220" y1="270" x2="210" y2="395" stroke="#9e7a31" stroke-width="11" stroke-linecap="round"/>
        <line x1="245" y1="274" x2="245" y2="395" stroke="#9e7a31" stroke-width="11" stroke-linecap="round"/>
        <line x1="295" y1="274" x2="295" y2="395" stroke="#9e7a31" stroke-width="11" stroke-linecap="round"/>
        <line x1="320" y1="270" x2="335" y2="395" stroke="#9e7a31" stroke-width="11" stroke-linecap="round"/>
      </g>
      <!-- 작은 사슴 2 -->
      <g fill="#c9a558" stroke="#7d5e21" stroke-width="2.5" transform="translate(150, 95) scale(0.75)">
        <ellipse cx="265" cy="250" rx="68" ry="30"/>
        <path d="M210 245 L185 155 L208 150 L235 235 Z"/>
        <ellipse cx="182" cy="150" rx="22" ry="13"/>
        <line x1="220" y1="270" x2="210" y2="395" stroke="#9e7a31" stroke-width="11" stroke-linecap="round"/>
        <line x1="320" y1="270" x2="335" y2="395" stroke="#9e7a31" stroke-width="11" stroke-linecap="round"/>
      </g>
    </svg>
  `);

  const AIRPODS_PRO = svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
      <rect width="600" height="600" fill="#eef1f5"/>
      <!-- 충전 케이스 -->
      <rect x="175" y="180" width="250" height="215" rx="62" fill="#ffffff" stroke="#d5dae2" stroke-width="4"/>
      <line x1="176" y1="255" x2="424" y2="255" stroke="#cfd5de" stroke-width="3"/>
      <rect x="275" y="248" width="50" height="12" rx="6" fill="#e1e5ec"/>
      <circle cx="300" cy="308" r="7" fill="#34c759"/>
      <!-- 박스 라벨 -->
      <rect x="195" y="425" width="210" height="64" rx="12" fill="#ffffff" stroke="#dde2ea" stroke-width="2"/>
      <text x="300" y="454" text-anchor="middle" font-size="20" font-weight="700" fill="#1d1d1f" font-family="sans-serif">AirPods Pro (2nd)</text>
      <text x="300" y="478" text-anchor="middle" font-size="14" fill="#6e6e73" font-family="sans-serif">USB-C MagSafe 풀박스</text>
    </svg>
  `);

  const CAMPING_TABLE = svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
      <rect width="600" height="600" fill="#dbe6d8"/>
      <rect y="405" width="600" height="195" fill="#9fb59a"/>
      <!-- 다리 프레임 -->
      <line x1="145" y1="275" x2="115" y2="455" stroke="#4a4036" stroke-width="14" stroke-linecap="round"/>
      <line x1="455" y1="275" x2="485" y2="455" stroke="#4a4036" stroke-width="14" stroke-linecap="round"/>
      <line x1="175" y1="275" x2="215" y2="430" stroke="#635547" stroke-width="10" stroke-linecap="round"/>
      <line x1="425" y1="275" x2="385" y2="430" stroke="#635547" stroke-width="10" stroke-linecap="round"/>
      <!-- 원목 상판 -->
      <polygon points="105,270 495,270 465,205 135,205" fill="#c7955b" stroke="#8f6333" stroke-width="3"/>
      <line x1="185" y1="205" x2="170" y2="270" stroke="#996b38" stroke-width="2"/>
      <line x1="260" y1="205" x2="253" y2="270" stroke="#996b38" stroke-width="2"/>
      <line x1="340" y1="205" x2="347" y2="270" stroke="#996b38" stroke-width="2"/>
      <line x1="415" y1="205" x2="430" y2="270" stroke="#996b38" stroke-width="2"/>
      <rect x="98" y="268" width="404" height="18" rx="4" fill="#a87640"/>
    </svg>
  `);

  const KIDS_SHELF = svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
      <rect width="600" height="600" fill="#f7f1e7"/>
      <!-- 원목 선반 프레임 -->
      <rect x="115" y="125" width="370" height="350" rx="14" fill="#deb887" stroke="#b58954" stroke-width="5"/>
      <rect x="135" y="150" width="330" height="305" fill="#f3e6d3"/>
      <!-- 3단 수납 바스켓 -->
      <rect x="152" y="168" width="140" height="75" rx="10" fill="#ffffff" stroke="#d9cbb8" stroke-width="3"/>
      <rect x="308" y="168" width="140" height="75" rx="10" fill="#ffd9b3" stroke="#e5b382" stroke-width="3"/>
      <rect x="152" y="264" width="140" height="75" rx="10" fill="#d5e8d4" stroke="#a6c7a4" stroke-width="3"/>
      <rect x="308" y="264" width="140" height="75" rx="10" fill="#ffffff" stroke="#d9cbb8" stroke-width="3"/>
      <rect x="152" y="360" width="296" height="78" rx="10" fill="#ffe6cc" stroke="#e2bc94" stroke-width="3"/>
      <text x="300" y="520" text-anchor="middle" font-size="22" font-weight="700" fill="#8b6b46" font-family="sans-serif">나눔 🧡 원목 정리함</text>
    </svg>
  `);

  const INITIAL_ITEMS = [
    {
      id: 'item-1',
      title: '8세컨즈 후드 숏패딩 민트 XL',
      category: '여성의류',
      price: 12000,
      isFreeShare: false,
      status: '판매중',
      location: '울산 동구 방어동',
      shortLocation: '방어동',
      timeAgo: '7일 전',
      createdAt: Date.now() - 10 * 60 * 1000,
      seller: {
        name: '임성훈',
        avatar: AVATAR_NECKLACE,
        mannerTemp: 37.3
      },
      images: [PADDING_MINT_1, PADDING_MINT_2],
      description:
        '8세컨즈 브랜드의 후드 숏패딩이에요. 민트 색상에 XL 사이즈로 넉넉하게 입기 좋아요.\n\n가볍고 따뜻한 소재라 간절기부터 한겨울까지 편하게 걸치기 좋습니다. 밑단 스트링으로 핏 조절도 가능해요.\n오염이나 하자 없이 보관 상태 양호합니다. 방어동 직거래 환영합니다!',
      likes: 14,
      chats: 3,
      views: 186,
      liked: false
    },
    {
      id: 'item-2',
      title: '프라다 사피아노 핑크 미니 토트백',
      category: '패션잡화',
      price: 320000,
      isFreeShare: false,
      status: '판매중',
      location: '울산 동구 방어동',
      shortLocation: '방어동',
      timeAgo: '2시간 전',
      createdAt: Date.now() - 2 * 60 * 60 * 1000,
      seller: {
        name: '민지맘',
        avatar: createAvatar('#ffe8dc', '민', '#ff6f0f'),
        mannerTemp: 38.6
      },
      images: [PINK_BAG],
      description:
        '화사한 파스텔 핑크 컬러의 미니 토트백입니다. 더스트백 포함 보관중이며 모서리 까짐 거의 없이 깨끗합니다.\n포인트 백으로 들기 좋아요. 직거래 시 실물 확인 가능합니다.',
      likes: 22,
      chats: 5,
      views: 312,
      liked: false
    },
    {
      id: 'item-3',
      title: '단가라 스트라이프 집업 니트 가디건',
      category: '여성의류',
      price: 18000,
      isFreeShare: false,
      status: '판매중',
      location: '울산 동구 방어동',
      shortLocation: '방어동',
      timeAgo: '4시간 전',
      createdAt: Date.now() - 4 * 60 * 60 * 1000,
      seller: {
        name: '호박토끼',
        avatar: createAvatar('#fff3d6', '호', '#d97706'),
        mannerTemp: 36.9
      },
      images: [STRIPE_CARDIGAN],
      description:
        '아이보리 바탕에 블랙 스트라이프 패턴이 깔끔한 카라 집업 니트 가디건이에요.\n두 번 정도 착용 후 드라이해두어 보풀 거의 없습니다. 사이즈 프리(55~66 추천)입니다.',
      likes: 9,
      chats: 2,
      views: 94,
      liked: false
    },
    {
      id: 'item-4',
      title: '아이보리 트위드 크롭 자켓 스커트 셋업',
      category: '여성의류',
      price: 35000,
      isFreeShare: false,
      status: '예약중',
      location: '울산 동구 일산동',
      shortLocation: '일산동',
      timeAgo: '1일 전',
      createdAt: Date.now() - 24 * 60 * 60 * 1000,
      seller: {
        name: '별빛가득',
        avatar: createAvatar('#e6f4ea', '별', '#15803d'),
        mannerTemp: 41.2
      },
      images: [TWEED_SETUP],
      description:
        '하객룩이나 데이트룩으로 딱 좋은 아이보리 트위드 셋업입니다. 진주 단추가 고급스럽고 자켓+스커트 일괄 가격이에요.\n안감 처리 깔끔하게 되어 있어 까슬거림 없습니다.',
      likes: 31,
      chats: 8,
      views: 420,
      liked: true
    },
    {
      id: 'item-5',
      title: '남성 차콜 그레이 캐시미어 라운드 니트 L',
      category: '남성의류',
      price: 20000,
      isFreeShare: false,
      status: '판매중',
      location: '울산 동구 방어동',
      shortLocation: '방어동',
      timeAgo: '2일 전',
      createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
      seller: {
        name: '동구직거래왕',
        avatar: createAvatar('#e0e7ff', '동', '#3730a3'),
        mannerTemp: 37.8
      },
      images: [CHARCOAL_KNIT],
      description:
        '선물받았는데 사이즈가 조금 작아 내놓습니다. 시착만 해본 새상품급 컨디션이에요.\n부드러운 캐시미어 혼방 소재에 차콜 컬러라 슬랙스나 청바지에 다 잘 어울립니다.',
      likes: 7,
      chats: 1,
      views: 118,
      liked: false
    },
    {
      id: 'item-6',
      title: '한일 초절전 할로겐 전기난로 히터',
      category: '생활가전',
      price: 25000,
      isFreeShare: false,
      status: '판매중',
      location: '울산 동구 화정동',
      shortLocation: '화정동',
      timeAgo: '3일 전',
      createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
      seller: {
        name: '따뜻한겨울',
        avatar: createAvatar('#fee2e2', '겨', '#b91c1c'),
        mannerTemp: 39.1
      },
      images: [HEATER],
      description:
        '작동 아주 잘 되고 회전 기능, 강약 조절 모두 이상 없습니다.\n전도 안전 스위치 탑재 모델이라 안전하게 쓰실 수 있어요. 화정동 근처 직거래합니다.',
      likes: 19,
      chats: 6,
      views: 274,
      liked: false
    },
    {
      id: 'item-7',
      title: '빈티지 황동 사슴 가족 오브제 장식품 3종',
      category: '가구/인테리어',
      price: 45000,
      isFreeShare: false,
      status: '판매중',
      location: '울산 동구 방어동',
      shortLocation: '방어동',
      timeAgo: '5일 전',
      createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
      seller: {
        name: '앤틱하우스',
        avatar: createAvatar('#fef3c7', '앤', '#92400e'),
        mannerTemp: 42.5
      },
      images: [BRASS_DEER],
      description:
        '묵직한 황동 재질의 빈티지 사슴 장식품 세트입니다. 거실 장식장이나 카페 인테리어 소품으로 분위기가 확 살아납니다.\n세월감 외 흠집이나 파손 전혀 없습니다.',
      likes: 12,
      chats: 2,
      views: 165,
      liked: false
    },
    {
      id: 'item-8',
      title: '애플 에어팟 프로 2세대 USB-C 풀박스',
      category: '디지털기기',
      price: 190000,
      isFreeShare: false,
      status: '예약중',
      location: '울산 동구 방어동',
      shortLocation: '방어동',
      timeAgo: '1일 전',
      createdAt: Date.now() - 28 * 60 * 60 * 1000,
      seller: {
        name: '애플매니아',
        avatar: createAvatar('#f1f5f9', '애', '#334155'),
        mannerTemp: 40.4
      },
      images: [AIRPODS_PRO],
      description:
        '정품 애플 에어팟 프로 2세대 C타입 모델입니다. 실사용 3개월 미만이고 케이스 씌워 사용해서 생활기스 거의 없습니다.\n여분 이어팁, 케이블, 박스 모두 그대로 있습니다.',
      likes: 45,
      chats: 11,
      views: 680,
      liked: true
    },
    {
      id: 'item-9',
      title: '감성 캠핑 원목 롤테이블 + 수납가방',
      category: '스포츠/레저',
      price: 30000,
      isFreeShare: false,
      status: '거래완료',
      location: '울산 동구 전하동',
      shortLocation: '전하동',
      timeAgo: '6일 전',
      createdAt: Date.now() - 6 * 24 * 60 * 60 * 1000,
      seller: {
        name: '캠핑가자',
        avatar: createAvatar('#dcfce7', '캠', '#166534'),
        mannerTemp: 38.2
      },
      images: [CAMPING_TABLE],
      description:
        '너도밤나무 원목 롤테이블 90사이즈입니다. 2회 캠핑 사용 후 깨끗이 닦아서 전용 가방에 보관중입니다.\n흔들림 적고 설치가 1분이면 끝나서 초보 캠퍼분께도 추천드려요.',
      likes: 16,
      chats: 4,
      views: 210,
      liked: false
    },
    {
      id: 'item-10',
      title: '친환경 유아 원목 장난감 정리함',
      category: '유아동',
      price: 0,
      isFreeShare: true,
      status: '판매중',
      location: '울산 동구 방어동',
      shortLocation: '방어동',
      timeAgo: '3시간 전',
      createdAt: Date.now() - 3 * 60 * 60 * 1000,
      seller: {
        name: '다온맘',
        avatar: createAvatar('#ffedd5', '다', '#ea580c'),
        mannerTemp: 44.1
      },
      images: [KIDS_SHELF],
      description:
        '아이가 커서 장난감 정리함 무료 나눔합니다! 바스켓 5개 다 포함되어 있고 모서리 라운딩 처리되어 안전해요.\n직접 가지러 오실 분께 나눔드립니다. 매너 채팅 부탁드려요🧡',
      likes: 28,
      chats: 9,
      views: 345,
      liked: false
    }
  ];

  const POPULAR_KEYWORDS = [
    '숏패딩',
    '니트',
    '에어팟',
    '전기난로',
    '가방',
    '트위드',
    '캠핑',
    '사슴',
    '원목',
    '나눔',
    '자전거',
    '아이폰'
  ];

  const CATEGORIES = [
    '전체',
    '여성의류',
    '남성의류',
    '패션잡화',
    '디지털기기',
    '생활가전',
    '가구/인테리어',
    '유아동',
    '스포츠/레저',
    '도서/티켓/음반',
    '반려동물용품',
    '기타 중고물품'
  ];

  const LOCATIONS = [
    { full: '울산 동구 방어동', short: '방어동' },
    { full: '울산 동구 일산동', short: '일산동' },
    { full: '울산 동구 화정동', short: '화정동' },
    { full: '울산 동구 전하동', short: '전하동' },
    { full: '울산 동구 대송동', short: '대송동' }
  ];

  const SAMPLE_IMAGES = [
    { label: '민트 숏패딩', url: PADDING_MINT_1 },
    { label: '핑크 토트백', url: PINK_BAG },
    { label: '스트라이프 니트', url: STRIPE_CARDIGAN },
    { label: '에어팟 프로', url: AIRPODS_PRO },
    { label: '전기난로', url: HEATER },
    { label: '캠핑 테이블', url: CAMPING_TABLE }
  ];

  function loadItems() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      // localStorage 사용 불가 시 메모리 fallback
    }
    const seeded = INITIAL_ITEMS.map((item) => JSON.parse(JSON.stringify(item)));
    saveItems(seeded);
    return seeded;
  }

  function saveItems(items) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      // ignore quota/sandbox errors
    }
  }

  let memoryCache = null;

  function ensureCache() {
    if (!memoryCache) {
      memoryCache = loadItems();
    }
    return memoryCache;
  }

  function getItems() {
    return ensureCache().slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  function getItemById(id) {
    return ensureCache().find((item) => item.id === id) || null;
  }

  const ANON_CLIENT_TOKEN_KEY = 'hobak_anon_client_token_v1';
  const ANON_CHAT_SESSION_KEY = 'hobak_anon_chat_session_v1';

  function generateAnonUuid() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return global.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getOrCreateAnonToken(storageKey) {
    try {
      const existing = global.localStorage.getItem(storageKey);
      if (existing && /^[0-9a-f-]{36}$/i.test(existing)) {
        return existing;
      }
      const created = generateAnonUuid();
      global.localStorage.setItem(storageKey, created);
      return created;
    } catch (e) {
      return generateAnonUuid();
    }
  }

  function getAnonClientToken() {
    if (global.HobakAuth && typeof global.HobakAuth.getUser === 'function') {
      const authUser = global.HobakAuth.getUser();
      if (authUser && authUser.id && /^[0-9a-f-]{36}$/i.test(authUser.id)) {
        return authUser.id;
      }
    }
    return getOrCreateAnonToken(ANON_CLIENT_TOKEN_KEY);
  }

  function getAnonChatSessionId() {
    if (global.HobakAuth && typeof global.HobakAuth.getUser === 'function') {
      const authUser = global.HobakAuth.getUser();
      if (authUser && authUser.id && /^[0-9a-f-]{36}$/i.test(authUser.id)) {
        return authUser.id;
      }
    }
    return getOrCreateAnonToken(ANON_CHAT_SESSION_KEY);
  }

  function getSupabaseConfig() {
    const cfg = global.HOBAK_SUPABASE_CONFIG;
    if (!cfg || !cfg.enabled || !cfg.url || !cfg.anonKey) return null;
    return cfg;
  }

  function getTableName(key, fallback) {
    const cfg = getSupabaseConfig();
    if (cfg && cfg.tables && cfg.tables[key]) return cfg.tables[key];
    if (key === 'items' && cfg && cfg.table) return cfg.table;
    return fallback;
  }

  function findSeedById(id) {
    return INITIAL_ITEMS.find((item) => item.id === id) || null;
  }

  function toDbRow(item) {
    const sellerObj = item.seller || { name: '호박이웃', avatar: AVATAR_NECKLACE, mannerTemp: 37.3 };
    const likesVal = Number(item.likes) || 0;
    const chatsVal = Number(item.chats) || 0;
    const viewsVal = Math.max(1, Number(item.views) || 1);
    const validUuid =
      item.anonSellerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.anonSellerId)
        ? item.anonSellerId
        : getAnonClientToken();
    return {
      id: item.id,
      title: item.title,
      category: item.category,
      price: Number(item.price) || 0,
      is_free_share: Boolean(item.isFreeShare),
      status: item.status || '판매중',
      location: item.location || '울산 동구 방어동',
      short_location: item.shortLocation || '방어동',
      time_ago: item.timeAgo || '방금 전',
      created_at: Number(item.createdAt) || Date.now(),
      anon_seller_id: validUuid,
      seller_nickname: String(sellerObj.name || '호박이웃').slice(0, 20),
      seller_avatar: sellerObj.avatar || '',
      manner_temp: typeof sellerObj.mannerTemp === 'number' ? sellerObj.mannerTemp : 37.3,
      seller: sellerObj,
      images: Array.isArray(item.images) ? item.images : [],
      description: item.description || '',
      likes_count: likesVal,
      chats_count: chatsVal,
      views_count: viewsVal,
      likes: likesVal,
      chats: chatsVal,
      views: viewsVal,
      liked: Boolean(item.liked)
    };
  }

  function fromDbRow(row) {
    if (!row || !row.id) return null;
    const seed = findSeedById(row.id);
    const rawSeller = row.seller && typeof row.seller === 'object' ? row.seller : {};
    const rawImages = Array.isArray(row.images) ? row.images : [];
    const fallbackImages = seed ? seed.images.slice() : [PADDING_MINT_1];
    const fallbackAvatar = seed && seed.seller ? seed.seller.avatar : AVATAR_NECKLACE;

    const likesVal = row.likes_count != null ? Number(row.likes_count) : Number(row.likes) || 0;
    const chatsVal = row.chats_count != null ? Number(row.chats_count) : Number(row.chats) || 0;
    const viewsVal = row.views_count != null ? Number(row.views_count) : Number(row.views) || 1;
    const tempVal =
      row.manner_temp != null
        ? Number(row.manner_temp)
        : typeof rawSeller.mannerTemp === 'number'
        ? rawSeller.mannerTemp
        : 37.3;

    return {
      id: row.id,
      anonSellerId: row.anon_seller_id || null,
      title: row.title || (seed ? seed.title : ''),
      category: row.category || '기타 중고물품',
      price: Number(row.price) || 0,
      isFreeShare: Boolean(row.is_free_share) || Number(row.price) === 0,
      status: row.status || '판매중',
      location: row.location || '울산 동구 방어동',
      shortLocation: row.short_location || '방어동',
      timeAgo: row.time_ago || '방금 전',
      createdAt: Number(row.created_at) || Date.now(),
      seller: {
        name: row.seller_nickname || rawSeller.name || '호박이웃',
        avatar: row.seller_avatar || rawSeller.avatar || fallbackAvatar,
        mannerTemp: Number.isFinite(tempVal) ? tempVal : 37.3
      },
      images: rawImages.length > 0 ? rawImages : fallbackImages,
      description: row.description || '',
      likes: likesVal,
      chats: chatsVal,
      views: viewsVal,
      liked: Boolean(row.liked)
    };
  }

  function supabaseTableRequest(tableName, path, options) {
    const cfg = getSupabaseConfig();
    if (!cfg || typeof global.fetch !== 'function') {
      return Promise.resolve(null);
    }
    const opts = options || {};
    const authToken =
      global.HobakAuth && typeof global.HobakAuth.getAccessToken === 'function'
        ? global.HobakAuth.getAccessToken()
        : null;
    const bearer =
      authToken &&
      String(authToken).indexOf('local-') !== 0 &&
      String(authToken).indexOf('anon-') !== 0
        ? authToken
        : cfg.anonKey;
    const headers = Object.assign(
      {
        apikey: cfg.anonKey,
        Authorization: 'Bearer ' + bearer,
        'Content-Type': 'application/json'
      },
      opts.headers || {}
    );
    return global
      .fetch(cfg.url.replace(/\/$/, '') + '/rest/v1/' + tableName + (path || ''), {
        method: opts.method || 'GET',
        headers: headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined
      })
      .then(function (res) {
        if (!res.ok) return null;
        if (res.status === 204) return true;
        return res.json().catch(function () {
          return true;
        });
      })
      .catch(function () {
        return null;
      });
  }

  function supabaseRequest(path, options) {
    return supabaseTableRequest(getTableName('items', 'hobak_items'), path, options);
  }

  let syncStatus = getSupabaseConfig() ? 'syncing' : 'local';

  function formatTimeFromIso(isoStr) {
    try {
      const dt = isoStr ? new Date(isoStr) : new Date();
      if (Number.isNaN(dt.getTime())) return '';
      const h = dt.getHours();
      const m = String(dt.getMinutes()).padStart(2, '0');
      const period = h < 12 ? '오전' : '오후';
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      return period + ' ' + hour12 + ':' + m;
    } catch (e) {
      return '';
    }
  }

  function dispatchSyncEvent(connected, count) {
    if (typeof global.dispatchEvent === 'function' && typeof global.CustomEvent === 'function') {
      global.dispatchEvent(
        new global.CustomEvent('hobak:store-synced', {
          detail: { connected: Boolean(connected), status: syncStatus, count: count || 0 }
        })
      );
    }
  }

  function syncFromSupabase() {
    if (!getSupabaseConfig()) {
      syncStatus = 'local';
      dispatchSyncEvent(false, getItems().length);
      return Promise.resolve(null);
    }
    syncStatus = 'syncing';
    const itemsTable = getTableName('items', 'hobak_items');
    const likesTable = getTableName('likes', 'item_likes');
    const clientToken = getAnonClientToken();

    return Promise.all([
      supabaseTableRequest(itemsTable, '?select=*&order=created_at.desc', { method: 'GET' }),
      supabaseTableRequest(
        likesTable,
        '?select=item_id&client_token=eq.' + encodeURIComponent(clientToken),
        { method: 'GET' }
      )
    ]).then(function (results) {
      const rows = results[0];
      const likeRows = results[1];
      if (!Array.isArray(rows) || rows.length === 0) {
        syncStatus = 'local';
        dispatchSyncEvent(false, getItems().length);
        return null;
      }

      const likedMap = {};
      const hasLikeRows = Array.isArray(likeRows);
      if (hasLikeRows) {
        likeRows.forEach(function (lr) {
          if (lr && lr.item_id) {
            likedMap[lr.item_id] = true;
          }
        });
      }

      const mapped = rows
        .map(fromDbRow)
        .filter(Boolean)
        .map(function (item) {
          if (hasLikeRows && likeRows.length > 0) {
            item.liked = Boolean(likedMap[item.id]);
          }
          return item;
        });

      if (mapped.length === 0) {
        syncStatus = 'local';
        dispatchSyncEvent(false, getItems().length);
        return null;
      }

      memoryCache = mapped;
      saveItems(mapped);
      syncStatus = 'connected';
      dispatchSyncEvent(true, mapped.length);
      return getItems();
    });
  }

  function fetchChatMessages(itemId) {
    if (!itemId || !getSupabaseConfig()) return Promise.resolve([]);
    const chatsTable = getTableName('chats', 'item_chat_messages');
    const sessionId = getAnonChatSessionId();
    return supabaseTableRequest(
      chatsTable,
      '?select=sender_role,message_text,created_at&item_id=eq.' +
        encodeURIComponent(itemId) +
        '&chat_session_id=eq.' +
        encodeURIComponent(sessionId) +
        '&order=created_at.asc',
      { method: 'GET' }
    ).then(function (rows) {
      if (!Array.isArray(rows)) return [];
      return rows.map(function (r) {
        return {
          sender: r.sender_role === 'seller' ? 'seller' : 'me',
          text: r.message_text || '',
          time: formatTimeFromIso(r.created_at)
        };
      });
    });
  }

  function addItem(newItemData) {
    const items = ensureCache();
    const locObj =
      LOCATIONS.find((l) => l.full === newItemData.location || l.short === newItemData.location) ||
      { full: newItemData.location || '울산 동구 방어동', short: newItemData.shortLocation || '방어동' };

    const isFree = Boolean(newItemData.isFreeShare) || Number(newItemData.price) === 0;
    const numericPrice = isFree ? 0 : Math.max(0, Number(newItemData.price) || 0);

    const authUser =
      global.HobakAuth && typeof global.HobakAuth.getUser === 'function'
        ? global.HobakAuth.getUser()
        : null;

    const created = {
      id: 'item-' + Date.now(),
      anonSellerId: (authUser && authUser.id) || getAnonClientToken(),
      title: (newItemData.title || '제목 없는 상품').trim(),
      category: newItemData.category || '기타 중고물품',
      price: numericPrice,
      isFreeShare: isFree,
      status: newItemData.status || '판매중',
      location: locObj.full,
      shortLocation: newItemData.shortLocation || locObj.short,
      timeAgo: '방금 전',
      createdAt: Date.now(),
      seller: {
        name:
          (newItemData.seller && newItemData.seller.name) ||
          (authUser && authUser.nickname) ||
          '호박이웃',
        avatar:
          (newItemData.seller && newItemData.seller.avatar) ||
          (authUser && authUser.avatar) ||
          AVATAR_NECKLACE,
        mannerTemp:
          (newItemData.seller && Number(newItemData.seller.mannerTemp)) ||
          (authUser && Number(authUser.mannerTemp)) ||
          36.5
      },
      images:
        Array.isArray(newItemData.images) && newItemData.images.length > 0
          ? newItemData.images.slice()
          : [PADDING_MINT_1],
      description: (newItemData.description || '').trim(),
      likes: 0,
      chats: 0,
      views: 1,
      liked: false
    };

    items.unshift(created);
    saveItems(items);
    supabaseRequest('', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: toDbRow(created)
    });
    return created;
  }

  function updateItem(id, patch) {
    const items = ensureCache();
    const idx = items.findIndex((item) => item.id === id);
    if (idx === -1) return null;

    const prev = items[idx];
    const next = Object.assign({}, prev, patch);
    if (patch.seller) {
      next.seller = Object.assign({}, prev.seller, patch.seller);
    }
    if (patch.location && !patch.shortLocation) {
      const found = LOCATIONS.find((l) => l.full === patch.location);
      next.shortLocation = found ? found.short : patch.location.split(' ').pop();
    }
    items[idx] = next;
    saveItems(items);
    supabaseRequest('?id=eq.' + encodeURIComponent(id), {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: toDbRow(next)
    });
    return next;
  }

  function deleteItem(id) {
    const items = ensureCache();
    const filtered = items.filter((item) => item.id !== id);
    if (filtered.length === items.length) return false;
    memoryCache = filtered;
    saveItems(filtered);
    supabaseRequest('?id=eq.' + encodeURIComponent(id), {
      method: 'DELETE'
    });
    return true;
  }

  function toggleLike(id) {
    const item = getItemById(id);
    if (!item) return null;
    const nextLiked = !item.liked;
    const nextLikes = Math.max(0, (item.likes || 0) + (nextLiked ? 1 : -1));
    const likesTable = getTableName('likes', 'item_likes');
    const clientToken = getAnonClientToken();

    if (nextLiked) {
      supabaseTableRequest(likesTable, '?on_conflict=item_id,client_token', {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: { item_id: id, client_token: clientToken }
      });
    } else {
      supabaseTableRequest(
        likesTable,
        '?item_id=eq.' + encodeURIComponent(id) + '&client_token=eq.' + encodeURIComponent(clientToken),
        { method: 'DELETE' }
      );
    }

    return updateItem(id, { liked: nextLiked, likes: nextLikes });
  }

  function recordChatMessage(itemId, senderRole, messageText) {
    const role = senderRole === 'seller' ? 'seller' : 'buyer';
    const text = String(messageText || '').trim().slice(0, 200);
    if (!itemId || !text) return Promise.resolve(null);
    return supabaseTableRequest(getTableName('chats', 'item_chat_messages'), '', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: {
        item_id: itemId,
        chat_session_id: getAnonChatSessionId(),
        sender_role: role,
        message_text: text
      }
    });
  }

  function incrementView(id) {
    const item = getItemById(id);
    if (!item) return null;
    return updateItem(id, { views: (item.views || 0) + 1 });
  }

  function resetData() {
    memoryCache = INITIAL_ITEMS.map((item) => JSON.parse(JSON.stringify(item)));
    saveItems(memoryCache);
    if (getSupabaseConfig()) {
      const seedPayload = memoryCache.map(function (item) {
        const row = toDbRow(item);
        // 초기 상품은 DB 용량 절감을 위해 아바타/이미지 배열 경량화 유지 (fromDbRow가 로컬 SVG로 자동 복원)
        if (String(row.id).indexOf('item-') === 0) {
          row.seller_avatar = '';
          row.seller = Object.assign({}, row.seller, { avatar: '' });
          row.images = [];
        }
        return row;
      });
      supabaseRequest('?on_conflict=id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: seedPayload
      });
    }
    return getItems();
  }

  function formatPrice(price, isFreeShare) {
    if (isFreeShare || Number(price) === 0) {
      return '나눔 🧡';
    }
    return Number(price).toLocaleString('ko-KR') + '원';
  }

  global.HobakStore = {
    getItems,
    getItemById,
    addItem,
    updateItem,
    deleteItem,
    toggleLike,
    recordChatMessage,
    fetchChatMessages,
    incrementView,
    resetData,
    syncFromSupabase,
    getSyncStatus: function () {
      return syncStatus;
    },
    getAnonClientToken,
    getAnonChatSessionId,
    isSupabaseEnabled: function () {
      return Boolean(getSupabaseConfig());
    },
    formatPrice,
    POPULAR_KEYWORDS,
    CATEGORIES,
    LOCATIONS,
    SAMPLE_IMAGES,
    DEFAULT_AVATAR: AVATAR_NECKLACE
  };
})(window);
